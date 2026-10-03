/**
 * §9.7 recovery-queue DRAIN side — the production consumer of
 * `ai_telemetry_recovery` (enqueue side: observability.ts).
 *
 * The queue exists for exactly one reason: a post-dispatch authoritative
 * write (finalizeSuccess / finalizeFailure) could not land at dispatch time —
 * store blip or lease fence — and the §9.8 contract forbids retrying the paid
 * provider call. The drainer replays those finalizations later, using the
 * SAME hardened outbox semantics as the settlement work (§6.4/§6.5):
 *
 *   - lease-fenced claim (`claimRecoveryBatch`, FOR UPDATE SKIP LOCKED —
 *     concurrent drainers partition the queue, never double-claim);
 *   - attempt caps (`attempts` increments on every claim; entries that hit
 *     `maxAttempts` become an EXPLICIT `abandonedAt` terminal via
 *     `abandonExhaustedRecovery` — never a silent drop);
 *   - `deliveredAt` terminal fenced on the drainer token.
 *
 * Per-entry outcome semantics:
 *
 *   FINALIZE_SUCCESS  → replay `store.finalizeSuccess` (atomic invocation +
 *     attempt CTE) with the ORIGINAL owner token from the payload.
 *       applied            → delivered.
 *       fenced + invocation now AMBIGUOUS → the claim-steal fence conservatively
 *         forced AMBIGUOUS because the winning attempt was still open; we now
 *         hold PROOF the provider served the request, so upgrade
 *         AMBIGUOUS → SUCCEEDED with the recorded result (still one atomic
 *         CTE statement) → delivered.
 *       fenced + any other terminal → someone else finalized; delivered
 *         (nothing left to recover, and the recorded facts stay in the row's
 *         payload for audit).
 *       fenced + still RUNNING under a NEW owner → defer (leave leased; the
 *         new owner finishes or the lease cap abandons explicitly).
 *   FINALIZE_AMBIGUOUS / FINALIZE_FAILURE → replay `store.finalizeFailure`
 *     with the original owner token; same delivered/defer logic (an
 *     invocation that reached ANY terminal by other means is delivered).
 *   Unknown/undecodable payloads → defer; the attempt cap turns them into an
 *     explicit abandonment for the owner queue. Never a silent drop.
 *
 * Wiring: the Vercel cron route `/api/cron/drain-ai-telemetry-recovery`
 * (schedule in vercel.json) calls `drainAiTelemetryRecoveryProduction()`,
 * which builds the SQL seam from the real Prisma client exactly like the
 * sealed executor does. This module performs NO provider dispatch and grants
 * NO authority — it only completes already-authorized bookkeeping — so
 * exposing it on the public surface does not widen the sealed boundary.
 */

import { randomUUID } from "node:crypto";

import {
  createPgControlStore,
  type AuthoritativeControlStore,
  type ControlSqlClient,
} from "./control-store";
import {
  abandonExhaustedRecovery,
  claimRecoveryBatch,
  markRecoveryDelivered,
  type RecoveryQueueRow,
} from "./observability";

// ─── Payload decoding (strict — a corrupt payload defers, never crashes) ──────

interface FinalizeSuccessPayload {
  readonly invocationId: string;
  readonly ownerToken: string;
  readonly attemptId: string;
  readonly providerUsed: string;
  readonly modelResolved: string;
  readonly providerRequestId: string | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly resultJson: string;
  readonly resultHash: string;
  readonly now: string;
}

interface FinalizeFailurePayload {
  readonly invocationId: string;
  readonly ownerToken: string;
  readonly status: "FAILED" | "AMBIGUOUS";
  readonly now: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableInt(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value));
}

function decodeSuccessPayload(payload: unknown): FinalizeSuccessPayload | null {
  if (!isRecord(payload)) return null;
  const p = payload;
  if (
    isNonEmptyString(p["invocationId"]) &&
    isNonEmptyString(p["ownerToken"]) &&
    isNonEmptyString(p["attemptId"]) &&
    isNonEmptyString(p["providerUsed"]) &&
    isNonEmptyString(p["modelResolved"]) &&
    isNullableString(p["providerRequestId"]) &&
    isNullableInt(p["inputTokens"]) &&
    isNullableInt(p["outputTokens"]) &&
    typeof p["resultJson"] === "string" &&
    isNonEmptyString(p["resultHash"]) &&
    isNonEmptyString(p["now"]) &&
    !Number.isNaN(Date.parse(p["now"]))
  ) {
    return {
      invocationId: p["invocationId"],
      ownerToken: p["ownerToken"],
      attemptId: p["attemptId"],
      providerUsed: p["providerUsed"],
      modelResolved: p["modelResolved"],
      providerRequestId: p["providerRequestId"],
      inputTokens: p["inputTokens"],
      outputTokens: p["outputTokens"],
      resultJson: p["resultJson"],
      resultHash: p["resultHash"],
      now: p["now"],
    };
  }
  return null;
}

function decodeFailurePayload(payload: unknown): FinalizeFailurePayload | null {
  if (!isRecord(payload)) return null;
  const p = payload;
  if (
    isNonEmptyString(p["invocationId"]) &&
    isNonEmptyString(p["ownerToken"]) &&
    (p["status"] === "FAILED" || p["status"] === "AMBIGUOUS") &&
    isNonEmptyString(p["now"]) &&
    !Number.isNaN(Date.parse(p["now"]))
  ) {
    return {
      invocationId: p["invocationId"],
      ownerToken: p["ownerToken"],
      status: p["status"],
      now: p["now"],
    };
  }
  return null;
}

function parsePayload(raw: unknown): unknown {
  if (typeof raw !== "string") return raw; // jsonb comes back pre-parsed
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Drain pass ───────────────────────────────────────────────────────────────

export interface DrainSummary {
  readonly claimed: number;
  readonly delivered: number;
  /** Left leased for a later pass (fenced by a live owner, or undecodable). */
  readonly deferred: number;
  readonly abandoned: number;
}

async function invocationStatus(
  sql: ControlSqlClient,
  invocationId: string,
): Promise<string | null> {
  const rows = await sql.query<{ status: string }>(
    `SELECT "status" FROM "ai_invocations" WHERE "id" = $1`,
    [invocationId],
  );
  return rows[0]?.status ?? null;
}

/**
 * AMBIGUOUS → SUCCEEDED upgrade: the steal fence conservatively finalized
 * AMBIGUOUS while the true success record was stranded in this queue. The
 * recovered payload IS the proof of service, so the upgrade is factual, and
 * (like finalizeSuccess) invocation + attempt commit in ONE statement.
 */
async function upgradeAmbiguousToSuccess(
  sql: ControlSqlClient,
  p: FinalizeSuccessPayload,
): Promise<boolean> {
  const rows = await sql.query<{ invApplied: boolean }>(
    `WITH inv AS (
       UPDATE "ai_invocations"
          SET "status" = 'SUCCEEDED', "completedAt" = $1,
              "resultJson" = $2::jsonb, "resultHash" = $3,
              "leaseExpiresAt" = NULL
        WHERE "id" = $4 AND "status" = 'AMBIGUOUS'
        RETURNING "id"
     ), att AS (
       UPDATE "ai_attempts"
          SET "status" = 'SUCCEEDED', "providerUsed" = $5,
              "modelResolved" = $6, "providerRequestId" = $7,
              "inputTokens" = $8, "outputTokens" = $9, "endedAt" = $1,
              "resultHash" = $3
        WHERE "id" = $10 AND EXISTS (SELECT 1 FROM inv)
        RETURNING "id"
     )
     SELECT EXISTS (SELECT 1 FROM inv) AS "invApplied"`,
    [
      new Date(p.now),
      p.resultJson,
      p.resultHash,
      p.invocationId,
      p.providerUsed,
      p.modelResolved,
      p.providerRequestId,
      p.inputTokens,
      p.outputTokens,
      p.attemptId,
    ],
  );
  return rows[0]?.invApplied === true;
}

type EntryOutcome = "DELIVERED" | "DEFERRED";

async function processEntry(
  sql: ControlSqlClient,
  store: AuthoritativeControlStore,
  row: RecoveryQueueRow,
): Promise<EntryOutcome> {
  const payload = parsePayload(row.payload);

  if (row.kind === "FINALIZE_SUCCESS") {
    const p = decodeSuccessPayload(payload);
    if (p === null) return "DEFERRED"; // cap → explicit abandonment
    const applied = await store.finalizeSuccess({
      invocationId: p.invocationId,
      ownerToken: p.ownerToken,
      attemptId: p.attemptId,
      providerUsed: p.providerUsed,
      modelResolved: p.modelResolved,
      providerRequestId: p.providerRequestId,
      inputTokens: p.inputTokens,
      outputTokens: p.outputTokens,
      resultJson: p.resultJson,
      resultHash: p.resultHash,
      now: new Date(p.now),
    });
    if (applied) return "DELIVERED";
    const status = await invocationStatus(sql, p.invocationId);
    if (status === "AMBIGUOUS") {
      await upgradeAmbiguousToSuccess(sql, p);
      return "DELIVERED";
    }
    if (status !== null && status !== "RUNNING") return "DELIVERED";
    return "DEFERRED"; // fenced by a live owner (or row missing) — retry later
  }

  if (row.kind === "FINALIZE_AMBIGUOUS" || row.kind === "FINALIZE_FAILURE") {
    const p = decodeFailurePayload(payload);
    if (p === null) return "DEFERRED";
    const applied = await store.finalizeFailure({
      invocationId: p.invocationId,
      ownerToken: p.ownerToken,
      status: row.kind === "FINALIZE_AMBIGUOUS" ? "AMBIGUOUS" : p.status,
      now: new Date(p.now),
    });
    if (applied) return "DELIVERED";
    const status = await invocationStatus(sql, p.invocationId);
    if (status !== null && status !== "RUNNING") return "DELIVERED";
    return "DEFERRED";
  }

  // Unknown kind (e.g. a future producer this drainer predates): defer so the
  // attempt cap surfaces it as an explicit abandonment, never a silent drop.
  return "DEFERRED";
}

export interface DrainOptions {
  readonly now?: () => Date;
  readonly drainerToken?: string;
  readonly leaseMs?: number;
  readonly limit?: number;
}

const DEFAULT_DRAIN_LEASE_MS = 60_000;
const DEFAULT_DRAIN_LIMIT = 50;

/**
 * One lease-fenced, attempt-capped drain pass over `ai_telemetry_recovery`.
 * Safe to run concurrently (SKIP LOCKED partitions claimers) and safe to
 * re-run at any cadence (every operation is fenced and idempotent).
 */
export async function drainAiTelemetryRecovery(
  sql: ControlSqlClient,
  options: DrainOptions = {},
): Promise<DrainSummary> {
  const now = options.now ?? ((): Date => new Date());
  const drainerToken = options.drainerToken ?? randomUUID();
  const store = createPgControlStore(sql);

  const batch = await claimRecoveryBatch(sql, {
    drainerToken,
    now: now(),
    leaseMs: options.leaseMs ?? DEFAULT_DRAIN_LEASE_MS,
    limit: options.limit ?? DEFAULT_DRAIN_LIMIT,
  });

  let delivered = 0;
  let deferred = 0;
  for (const row of batch) {
    const outcome = await processEntry(sql, store, row);
    if (outcome === "DELIVERED") {
      const marked = await markRecoveryDelivered(sql, {
        id: row.id,
        drainerToken,
        now: now(),
      });
      if (marked) delivered += 1;
      else deferred += 1; // our drain lease itself was fenced — retry later
    } else {
      deferred += 1;
    }
  }

  const abandoned = await abandonExhaustedRecovery(sql, { now: now() });
  return { claimed: batch.length, delivered, deferred, abandoned };
}

/**
 * Production entry point used by the cron route: builds the SQL seam from the
 * real Prisma client (fail-closed `prismaSqlClient`, same as the sealed
 * executor) and runs one drain pass.
 */
export async function drainAiTelemetryRecoveryProduction(
  options: DrainOptions = {},
): Promise<DrainSummary> {
  const [{ prismaSqlClient }, dbModule] = await Promise.all([
    import("./control-store"),
    import("@sports/db"),
  ]);
  return drainAiTelemetryRecovery(prismaSqlClient(dbModule.db), options);
}
