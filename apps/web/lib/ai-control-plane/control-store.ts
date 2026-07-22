/**
 * AuthoritativeControlStore (directive §9.1/§9.2) — the FAIL-CLOSED half of
 * the old "ledger".
 *
 * §9.1 split: claim/idempotency, attempt authorization, and blocked-decision
 * persistence are AUTHORITATIVE control state. Every method here either
 * succeeds against the durable store or throws `StoreUnavailable` — and the
 * invocation pipeline treats that as "do not dispatch". This is the exact
 * opposite of `ObservabilitySink` (observability.ts), which may degrade
 * without ever changing a successful provider result. A failed invocation
 * claim is NEVER swallowed and followed by a dispatch.
 *
 * §9.2 atomic create-or-claim (PG implementation, `createPgControlStore`):
 *
 *   INSERT .. ON CONFLICT ("requestId","taskClass") DO NOTHING RETURNING id
 *     row returned        → ACQUIRED (this caller owns the lease)
 *     no row              → read the existing row and decide:
 *       different requestFingerprint → FINGERPRINT_CONFLICT (same request id,
 *                                      changed payload — hard conflict)
 *       terminal status              → REPLAY_TERMINAL (original persisted
 *                                      result/attempts returned; NO dispatch)
 *       RUNNING + live lease         → IN_PROGRESS (NEVER dispatch again)
 *       RUNNING + expired lease      → explicit fenced steal: one conditional
 *                                      UPDATE guarded on the OBSERVED owner
 *                                      token AND the expired lease; losing the
 *                                      race yields IN_PROGRESS, winning yields
 *                                      ACQUIRED with a fresh owner token that
 *                                      fences out every write of the stale
 *                                      owner (all subsequent writes are
 *                                      conditioned on the owner token).
 *
 * The concurrency claim is proven against REAL Postgres (unique index + ON
 * CONFLICT), not a mock — see
 * apps/web/__tests__/ai-control-plane-claim-pg.integration.test.ts.
 */

import { StoreUnavailable } from "./errors";
import type { AiAttemptSummary } from "./contracts";

// ─── SQL seam ─────────────────────────────────────────────────────────────────

/**
 * Minimal parameterized-SQL seam. Implemented by `pg` (Pool.query → rows) in
 * the integration tests and by Prisma's `$queryRawUnsafe` in production
 * (`prismaSqlClient`). Positional params are `$1..$n`.
 */
export interface ControlSqlClient {
  query<T = Record<string, unknown>>(
    text: string,
    params: readonly unknown[],
  ): Promise<T[]>;
}

/**
 * Adapt a PrismaClient-like object to `ControlSqlClient`. FAIL-CLOSED: if the
 * client lacks a callable `$queryRawUnsafe` (e.g. the repository's stub
 * client, which silently no-ops writes while pretending success) or a query
 * returns a non-array, every call throws `StoreUnavailable` — a pretending
 * store must block dispatch, never fake a claim.
 */
export function prismaSqlClient(client: unknown): ControlSqlClient {
  return {
    async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
      const raw = (
        client as {
          $queryRawUnsafe?: (q: string, ...values: unknown[]) => Promise<unknown>;
        }
      )?.$queryRawUnsafe;
      if (typeof raw !== "function") {
        throw new StoreUnavailable(
          "Authoritative control store has no raw SQL capability (stub or " +
            "misconfigured Prisma client) — refusing to treat a pretend store " +
            "as a claim authority. Dispatch is blocked.",
        );
      }
      let result: unknown;
      try {
        result = await raw.call(client, text, ...params);
      } catch (error) {
        throw new StoreUnavailable(
          `Authoritative control store query failed: ${String(
            error instanceof Error ? error.message : error,
          )}`,
          { cause: error },
        );
      }
      if (!Array.isArray(result)) {
        throw new StoreUnavailable(
          "Authoritative control store returned a non-array for a row query — " +
            "treating the store as unavailable (fail closed).",
        );
      }
      return result as T[];
    },
  };
}

// ─── Inputs / outcomes ────────────────────────────────────────────────────────

export interface ClaimInvocationInput {
  /** Candidate id used only if this caller wins the INSERT. */
  readonly invocationId: string;
  readonly requestId: string;
  readonly taskClass: string;
  readonly surface: string;
  readonly entity: string;
  /** Serialized data-policy tag set (comma-joined, stable order). */
  readonly dataClass: string;
  readonly costMode: string;
  readonly envClass: string;
  readonly envClassSource: string;
  readonly policyVersion: string;
  readonly actorType: string;
  readonly actorSubjectId: string;
  /** sha256 hex of the canonicalized request payload (§9.2). */
  readonly requestFingerprint: string;
  /** Fresh owner token for this claim attempt. */
  readonly ownerToken: string;
  readonly leaseMs: number;
  readonly now: Date;
}

export type ClaimOutcome =
  | {
      readonly kind: "ACQUIRED";
      readonly invocationId: string;
      /** True when the claim was a fenced steal of an expired lease. */
      readonly stolen: boolean;
      /** First free attempt ordinal (0 fresh; max+1 after a steal). */
      readonly nextOrdinal: number;
    }
  | { readonly kind: "IN_PROGRESS"; readonly invocationId: string }
  | {
      readonly kind: "REPLAY_TERMINAL";
      readonly invocationId: string;
      readonly status: string;
      /** The original persisted output (null if none was recorded). */
      readonly output: unknown;
      readonly resultHash: string | null;
      readonly attempts: readonly AiAttemptSummary[];
    }
  | {
      readonly kind: "FINGERPRINT_CONFLICT";
      readonly invocationId: string;
      readonly existingFingerprint: string;
    };

export interface StartAttemptInput {
  readonly attemptId: string;
  readonly invocationId: string;
  readonly ownerToken: string;
  readonly ordinal: number;
  readonly providerRequested: string;
  readonly modelRequested: string;
  readonly requestFingerprint: string;
  readonly policyVersion: string;
  readonly attemptNonce: string;
  readonly now: Date;
}

export interface AttemptFailureInput {
  readonly attemptId: string;
  readonly invocationId: string;
  readonly ownerToken: string;
  readonly status: "FAILED" | "TIMEOUT" | "AMBIGUOUS";
  /** Set ONLY when transport for this attempt actually began. */
  readonly providerUsed: string | null;
  readonly errorCode: string | null;
  readonly now: Date;
}

export interface AttributionCreateInput {
  readonly attributionId: string;
  readonly invocationId: string;
  readonly estimatedGrossUsd: number;
  readonly fundingLabel: string;
}

export interface FinalizeSuccessInput {
  readonly invocationId: string;
  readonly ownerToken: string;
  readonly attemptId: string;
  readonly providerUsed: string;
  readonly modelResolved: string;
  readonly providerRequestId: string | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  /** JSON-serialized original output, persisted for terminal replay (§9.2). */
  readonly resultJson: string;
  readonly resultHash: string;
  readonly now: Date;
}

export interface FinalizeFailureInput {
  readonly invocationId: string;
  readonly ownerToken: string;
  readonly status: "FAILED" | "AMBIGUOUS" | "BUDGET_BLOCKED";
  readonly now: Date;
}

export interface BlockedInvocationInput {
  readonly invocationId: string;
  readonly requestId: string;
  readonly taskClass: string;
  readonly surface: string;
  readonly entity: string;
  readonly dataClass: string;
  readonly costMode: string;
  readonly envClass: string;
  readonly envClassSource: string;
  readonly policyVersion: string;
  readonly actorType: string;
  readonly actorSubjectId: string;
  readonly requestFingerprint: string;
  readonly blockedReasonCode:
    | "POLICY_BLOCKED"
    | "BUDGET_BLOCKED"
    | "CONFIGURATION_BLOCKED";
  readonly blockedDetail: string;
}

/**
 * The authoritative control-state boundary (§9.1). EVERY method fails closed:
 * a store problem is a thrown `StoreUnavailable`, never a silent no-op —
 * except where a boolean fencing verdict is the documented return value.
 */
export interface AuthoritativeControlStore {
  /** Atomic create-or-claim (§9.2). */
  claimInvocation(input: ClaimInvocationInput): Promise<ClaimOutcome>;
  /**
   * Authoritative pre-dispatch attempt row (§9.4). Inserted ONLY while this
   * owner token still holds a live lease; a lost lease throws
   * `StoreUnavailable` (dispatch must not proceed on a fenced claim).
   */
  startAttempt(input: StartAttemptInput): Promise<void>;
  /**
   * Authoritative attempt-failure record. Must land before any further
   * provider route is tried (the NEXT dispatch requires recorded state).
   */
  recordAttemptFailure(input: AttemptFailureInput): Promise<void>;
  /**
   * One pre-dispatch attribution per invocation (estimated gross + funding
   * intent only — the create path has no reconciliation fields, §9.5).
   * Idempotent: a replayed claim does not duplicate the current attribution.
   */
  createAttribution(input: AttributionCreateInput): Promise<void>;
  /**
   * Post-dispatch success finalization. Returns TRUE when applied, FALSE when
   * fenced out (lease was stolen). It may also throw `StoreUnavailable` —
   * callers must treat BOTH non-applied outcomes as "queue recovery, still
   * return the provider result" (§9.8: a successful paid call is never
   * retried because of a store problem).
   */
  finalizeSuccess(input: FinalizeSuccessInput): Promise<boolean>;
  /** Post-dispatch terminal-failure finalization (fenced like success). */
  finalizeFailure(input: FinalizeFailureInput): Promise<boolean>;
  /**
   * §9.6: persist a policy/config/budget block as a durable, NON-DISPATCHABLE
   * `BLOCKED` invocation — no model call is ever required to create the
   * incident. Idempotent on (requestId, taskClass).
   */
  recordBlockedInvocation(input: BlockedInvocationInput): Promise<void>;
}

// ─── Postgres implementation ──────────────────────────────────────────────────

interface ExistingRow {
  readonly id: string;
  readonly status: string;
  readonly requestFingerprint: string;
  readonly executionOwnerToken: string | null;
  readonly leaseExpiresAt: Date | null;
  readonly resultJson: unknown;
  readonly resultHash: string | null;
}

interface AttemptRow {
  readonly ordinal: number;
  readonly providerRequested: string;
  readonly providerUsed: string | null;
  readonly modelRequested: string;
  readonly modelResolved: string | null;
  readonly status: string;
  readonly errorCode: string | null;
}

function toSummaries(rows: readonly AttemptRow[]): AiAttemptSummary[] {
  return rows.map((r) => ({
    ordinal: r.ordinal,
    providerRequested: r.providerRequested as AiAttemptSummary["providerRequested"],
    providerUsed: r.providerUsed as AiAttemptSummary["providerUsed"],
    modelRequested: r.modelRequested,
    modelResolved: r.modelResolved,
    status: r.status as AiAttemptSummary["status"],
    ...(r.errorCode ? { errorCode: r.errorCode } : {}),
  }));
}

function parseResultJson(resultJson: unknown): unknown {
  if (resultJson === null || resultJson === undefined) return null;
  if (typeof resultJson === "string") {
    try {
      return JSON.parse(resultJson);
    } catch {
      return null;
    }
  }
  return resultJson; // jsonb comes back pre-parsed from some drivers
}

/**
 * Create the Postgres-backed authoritative control store over any
 * `ControlSqlClient`. All statements are single-round-trip and rely on the
 * `("requestId","taskClass")` unique index plus conditional UPDATEs for
 * atomicity — no advisory locks, no read-then-write races.
 */
export function createPgControlStore(
  sql: ControlSqlClient,
): AuthoritativeControlStore {
  const leaseUntil = (now: Date, leaseMs: number): Date =>
    new Date(now.getTime() + leaseMs);

  async function readExisting(
    requestId: string,
    taskClass: string,
  ): Promise<ExistingRow> {
    const rows = await sql.query<ExistingRow>(
      `SELECT "id", "status", "requestFingerprint", "executionOwnerToken",
              "leaseExpiresAt", "resultJson", "resultHash"
         FROM "ai_invocations"
        WHERE "requestId" = $1 AND "taskClass" = $2`,
      [requestId, taskClass],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new StoreUnavailable(
        "Invocation row vanished between claim conflict and read — treating " +
          "the store as unavailable (fail closed).",
      );
    }
    return row;
  }

  return {
    async claimInvocation(input: ClaimInvocationInput): Promise<ClaimOutcome> {
      const expires = leaseUntil(input.now, input.leaseMs);
      const inserted = await sql.query<{ id: string }>(
        `INSERT INTO "ai_invocations"
           ("id", "requestId", "taskClass", "surface", "entity", "dataClass",
            "costMode", "envClass", "envClassSource", "policyVersion",
            "actorType", "actorSubjectId", "status", "telemetryStatus",
            "requestFingerprint", "executionOwnerToken", "leaseExpiresAt",
            "heartbeatAt", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'RUNNING','OK',
                 $13,$14,$15,$16,$16)
         ON CONFLICT ("requestId", "taskClass") DO NOTHING
         RETURNING "id"`,
        [
          input.invocationId,
          input.requestId,
          input.taskClass,
          input.surface,
          input.entity,
          input.dataClass,
          input.costMode,
          input.envClass,
          input.envClassSource,
          input.policyVersion,
          input.actorType,
          input.actorSubjectId,
          input.requestFingerprint,
          input.ownerToken,
          expires,
          input.now,
        ],
      );
      if (inserted.length > 0 && inserted[0] !== undefined) {
        return {
          kind: "ACQUIRED",
          invocationId: inserted[0].id,
          stolen: false,
          nextOrdinal: 0,
        };
      }

      // Conflict: decide against the EXISTING row.
      const existing = await readExisting(input.requestId, input.taskClass);
      if (existing.requestFingerprint !== input.requestFingerprint) {
        return {
          kind: "FINGERPRINT_CONFLICT",
          invocationId: existing.id,
          existingFingerprint: existing.requestFingerprint,
        };
      }
      if (existing.status !== "RUNNING") {
        const attemptRows = await sql.query<AttemptRow>(
          `SELECT "ordinal", "providerRequested", "providerUsed",
                  "modelRequested", "modelResolved", "status", "errorCode"
             FROM "ai_attempts"
            WHERE "invocationId" = $1
            ORDER BY "ordinal" ASC`,
          [existing.id],
        );
        return {
          kind: "REPLAY_TERMINAL",
          invocationId: existing.id,
          status: existing.status,
          output: parseResultJson(existing.resultJson),
          resultHash: existing.resultHash,
          attempts: toSummaries(attemptRows),
        };
      }
      const leaseLive =
        existing.leaseExpiresAt !== null &&
        new Date(existing.leaseExpiresAt).getTime() > input.now.getTime();
      if (leaseLive) {
        return { kind: "IN_PROGRESS", invocationId: existing.id };
      }

      // Explicit fenced steal (§9.2): conditioned on BOTH the observed owner
      // token and the still-expired lease so exactly one stealer can win.
      const stolen = await sql.query<{ id: string }>(
        `UPDATE "ai_invocations"
            SET "executionOwnerToken" = $1,
                "leaseExpiresAt" = $2,
                "heartbeatAt" = $3,
                "stealCount" = "stealCount" + 1
          WHERE "id" = $4
            AND "status" = 'RUNNING'
            AND ("executionOwnerToken" IS NOT DISTINCT FROM $5)
            AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= $3)
          RETURNING "id"`,
        [
          input.ownerToken,
          expires,
          input.now,
          existing.id,
          existing.executionOwnerToken,
        ],
      );
      if (stolen.length === 0) {
        // Lost the steal race — someone else owns it now.
        return { kind: "IN_PROGRESS", invocationId: existing.id };
      }
      const maxRows = await sql.query<{ max: number | string | null }>(
        `SELECT MAX("ordinal") AS max FROM "ai_attempts" WHERE "invocationId" = $1`,
        [existing.id],
      );
      const rawMax = maxRows[0]?.max ?? null;
      const nextOrdinal = rawMax === null ? 0 : Number(rawMax) + 1;
      return {
        kind: "ACQUIRED",
        invocationId: existing.id,
        stolen: true,
        nextOrdinal,
      };
    },

    async startAttempt(input: StartAttemptInput): Promise<void> {
      const rows = await sql.query<{ id: string }>(
        `INSERT INTO "ai_attempts"
           ("id", "invocationId", "ordinal", "providerRequested",
            "providerUsed", "modelRequested", "status", "startedAt",
            "requestFingerprint", "policyVersion", "attemptNonce")
         SELECT $1, $2, $3, $4, NULL, $5, 'DISPATCHED', $6, $7, $8, $9
          WHERE EXISTS (
            SELECT 1 FROM "ai_invocations"
             WHERE "id" = $2
               AND "status" = 'RUNNING'
               AND "executionOwnerToken" = $10
               AND "leaseExpiresAt" > $6
          )
         RETURNING "id"`,
        [
          input.attemptId,
          input.invocationId,
          input.ordinal,
          input.providerRequested,
          input.modelRequested,
          input.now,
          input.requestFingerprint,
          input.policyVersion,
          input.attemptNonce,
          input.ownerToken,
        ],
      );
      if (rows.length === 0) {
        throw new StoreUnavailable(
          "Attempt authorization refused: this execution no longer holds a " +
            "live lease on the invocation (fenced or expired). Dispatch is blocked.",
        );
      }
    },

    async recordAttemptFailure(input: AttemptFailureInput): Promise<void> {
      const rows = await sql.query<{ id: string }>(
        `UPDATE "ai_attempts" a
            SET "status" = $1, "providerUsed" = $2, "errorCode" = $3, "endedAt" = $4
          FROM "ai_invocations" i
          WHERE a."id" = $5 AND i."id" = a."invocationId"
            AND i."executionOwnerToken" = $6
          RETURNING a."id"`,
        [
          input.status,
          input.providerUsed,
          input.errorCode,
          input.now,
          input.attemptId,
          input.ownerToken,
        ],
      );
      if (rows.length === 0) {
        throw new StoreUnavailable(
          "Attempt-failure record refused (fenced out) — no further provider " +
            "route may be tried on this claim.",
        );
      }
    },

    async createAttribution(input: AttributionCreateInput): Promise<void> {
      // NOTE (§9.5): this INSERT has NO reconciliation columns — the dispatch
      // writer structurally cannot set reconciledLabel/billedUsd/reconciledAt.
      await sql.query(
        `INSERT INTO "ai_financial_attributions"
           ("id", "invocationId", "attemptId", "estimatedGrossUsd",
            "fundingLabel", "version", "isCurrent")
         VALUES ($1, $2, NULL, $3, $4, 1, TRUE)
         ON CONFLICT ("invocationId", "version") DO NOTHING`,
        [
          input.attributionId,
          input.invocationId,
          input.estimatedGrossUsd,
          input.fundingLabel,
        ],
      );
    },

    async finalizeSuccess(input: FinalizeSuccessInput): Promise<boolean> {
      const updated = await sql.query<{ id: string }>(
        `UPDATE "ai_invocations"
            SET "status" = 'SUCCEEDED', "completedAt" = $1,
                "resultJson" = $2::jsonb, "resultHash" = $3,
                "leaseExpiresAt" = NULL
          WHERE "id" = $4 AND "status" = 'RUNNING'
            AND "executionOwnerToken" = $5
          RETURNING "id"`,
        [
          input.now,
          input.resultJson,
          input.resultHash,
          input.invocationId,
          input.ownerToken,
        ],
      );
      if (updated.length === 0) return false; // fenced out
      await sql.query(
        `UPDATE "ai_attempts"
            SET "status" = 'SUCCEEDED', "providerUsed" = $1,
                "modelResolved" = $2, "providerRequestId" = $3,
                "inputTokens" = $4, "outputTokens" = $5, "endedAt" = $6,
                "resultHash" = $7
          WHERE "id" = $8`,
        [
          input.providerUsed,
          input.modelResolved,
          input.providerRequestId,
          input.inputTokens,
          input.outputTokens,
          input.now,
          input.resultHash,
          input.attemptId,
        ],
      );
      return true;
    },

    async finalizeFailure(input: FinalizeFailureInput): Promise<boolean> {
      const updated = await sql.query<{ id: string }>(
        `UPDATE "ai_invocations"
            SET "status" = $1, "completedAt" = $2, "leaseExpiresAt" = NULL
          WHERE "id" = $3 AND "status" = 'RUNNING'
            AND "executionOwnerToken" = $4
          RETURNING "id"`,
        [input.status, input.now, input.invocationId, input.ownerToken],
      );
      return updated.length > 0;
    },

    async recordBlockedInvocation(input: BlockedInvocationInput): Promise<void> {
      // BLOCKED rows are structurally non-dispatchable: no owner token, no
      // lease (the migration CHECK enforces token-less BLOCKED rows).
      await sql.query(
        `INSERT INTO "ai_invocations"
           ("id", "requestId", "taskClass", "surface", "entity", "dataClass",
            "costMode", "envClass", "envClassSource", "policyVersion",
            "actorType", "actorSubjectId", "status", "telemetryStatus",
            "requestFingerprint", "blockedReasonCode", "blockedDetail")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'BLOCKED','OK',$13,$14,$15)
         ON CONFLICT ("requestId", "taskClass") DO NOTHING`,
        [
          input.invocationId,
          input.requestId,
          input.taskClass,
          input.surface,
          input.entity,
          input.dataClass,
          input.costMode,
          input.envClass,
          input.envClassSource,
          input.policyVersion,
          input.actorType,
          input.actorSubjectId,
          input.requestFingerprint,
          input.blockedReasonCode,
          input.blockedDetail.slice(0, 2000),
        ],
      );
    },
  };
}
