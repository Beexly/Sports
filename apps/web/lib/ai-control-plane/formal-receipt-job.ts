/**
 * Track B — formal-receipt detection job (exactly-once runtime handoff,
 * 2026-07-22, extending PR #181's Track A on the SAME branch by owner
 * authorization).
 *
 * PURPOSE: a scheduled, PULL-based consumer of `control_event_ledger` that
 * projects a recent window through `srqc-projection.ts`'s pure `projectWindow`
 * and, if the projection ever WITNESSES a state the Formal Foundry's proofs
 * say is unreachable — `pendingCountClass === "GE2"` (two attempts
 * concurrently pending on one invocation, inductive CTI #1 for
 * InvocationClaim) or `hasRejectedFp === true && fingerprintBound === false`
 * (the `RejectedImpliesBound` invariant) — emits a structured log line an
 * operator can investigate.
 *
 * POSTURE (explicit, do not let this drift):
 *   - DETECTION ONLY. This module writes nothing to `ai_invocations` /
 *     `ai_attempts`, calls no provider, and cannot alter control-plane
 *     behavior. `admitUnderSRQC` (srqc-projection.ts) is not called here and
 *     remains always-ADMIT on every live path regardless.
 *   - Durable `FormalIncident` row-store (versioned-envelope pass, on top of
 *     Track A + Track B): when a violation is NEWLY logged, this job ALSO
 *     appends one `formal_incident` row via `recordFormalIncident`. That write
 *     is co-located with — and gated by — the SAME exactly-once
 *     `processed_event` mark (sink `"formal_receipt_violation"`) that gates the
 *     log line, so an incident is written AT MOST ONCE per witnessEventId; no
 *     second, independent dedup mechanism is introduced. It remains
 *     detection-only: the row records a witnessed abstract CTI, it does not
 *     gate any control-plane decision. The other bookkeeping rows this job
 *     writes go to the EXISTING `processed_event` table (sinks
 *     `"formal_receipt"` and `"formal_receipt_violation"`).
 *   - Formal Heartbeat (`formal-heartbeat/`) is NOT imported here and is not
 *     made stateful by this module — this file does its own tiny, local
 *     projection-shape check against `srqc-projection.ts`'s ALREADY-PURE
 *     `AbstractControlState`, never touching the dormant lab package.
 *
 * EXACTLY-ONCE DESIGN, stated precisely because the ledger's own idempotency
 * primitives (`event-ledger.ts`) are keyed on a single real `eventId`, and a
 * `processed_event` row has a FOREIGN KEY to `control_event_ledger("eventId")`
 * — there is no way to invent a synthetic "window key" to gate on:
 *
 *   1. "Examined" bookkeeping (sink `"formal_receipt"`): every distinct
 *      `eventId` read in the window is marked processed via `markProcessed`
 *      directly (its own `ON CONFLICT DO NOTHING` IS the atomic gate — an
 *      extra `alreadyProcessed` pre-check before it would only add a race-prone
 *      read with no additional correctness benefit, so it is skipped here by
 *      design). This is a pure audit trail ("this event has been swept by the
 *      Track B pass at least once") and carries no side effect of its own.
 *   2. Violation-log de-duplication (sink `"formal_receipt_violation"`) is
 *      the one place Pattern D's check-then-act shape is actually load
 *      bearing, because the thing being de-duplicated (a `console.error`
 *      call) is NOT naturally idempotent the way an `INSERT .. ON CONFLICT`
 *      is. `pendingCountClass`/`hasRejectedFp` are properties of an
 *      INVOCATION projected over potentially many ledger rows, not of any
 *      single event — so this job picks one real, permanent ledger row to
 *      stand as the violation's "witness" and gates the log on THAT row's
 *      `eventId`: the chronologically LAST row seen for the offending
 *      invocation in the window. Because `ATTEMPT_STARTED`/`ATTEMPT_FAILED`/
 *      `FINALIZED_*` event ids are permanent and deterministic
 *      (`deriveControlEventId`), re-running this job over the SAME or an
 *      OVERLAPPING window that still includes that witness row is guaranteed
 *      to compute the identical witness eventId and skip the log — this is
 *      the property the test suite proves directly.
 *
 * FAIL-CLOSED: every read/write here goes through `event-ledger.ts`, which
 * itself throws `StoreUnavailable` on a store problem (non-array result, etc)
 * per its own doc comments. This module does not catch and downgrade that —
 * a DB problem must surface as a thrown error, never a silently "clean" 200
 * from the cron route.
 */

import { readRecentEvents, alreadyProcessed, markProcessed } from "./event-ledger";
import type { ControlEventRow } from "./event-ledger";
import { projectWindow } from "./srqc-projection";
import type { ProjectableEvent, PendingCountClass } from "./srqc-projection";
import { recordFormalIncident, getActiveSrqcVersion } from "./formal-incident";
import type { ControlSqlClient } from "./control-store";

/** Sink for the per-event "examined by Track B" audit-trail bookkeeping. */
export const FORMAL_RECEIPT_SINK = "formal_receipt";

/** Sink used to de-duplicate the violation LOG LINE across repeated/overlapping windows. */
export const FORMAL_RECEIPT_VIOLATION_SINK = "formal_receipt_violation";

export interface FormalReceiptViolation {
  readonly invocationId: string;
  readonly pendingCountClass: PendingCountClass;
  readonly hasRejectedFp: boolean;
  readonly fingerprintBound: boolean;
  /** The real, permanent ledger eventId this violation's log line is gated on. */
  readonly witnessEventId: string;
}

export interface FormalReceiptSummary {
  readonly windowSinceInclusive: string;
  readonly windowUntilExclusive: string;
  readonly eventsExamined: number;
  readonly eventsNewlyMarkedProcessed: number;
  readonly violationsDetected: readonly FormalReceiptViolation[];
  /** How many of `violationsDetected` actually emitted a NEW log line this run. */
  readonly violationsNewlyLogged: number;
  /** How many `formal_incident` rows were newly written this run. Equal to
   *  `violationsNewlyLogged` by construction — the incident write is gated on
   *  the same exactly-once `processed_event` mark as the log line. */
  readonly incidentsWritten: number;
}

function toProjectable(row: ControlEventRow): ProjectableEvent {
  const rawPayload =
    row.payload !== null && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  const invocationId = rawPayload["invocationId"];
  const attemptId = rawPayload["attemptId"];
  const rejectedFingerprint = rawPayload["rejectedFingerprint"];
  return {
    eventType: row.eventType,
    source: row.source,
    sourceId: row.sourceId,
    payload: {
      ...rawPayload,
      ...(typeof invocationId === "string" ? { invocationId } : {}),
      ...(typeof attemptId === "string" ? { attemptId } : {}),
      ...(rejectedFingerprint === true ? { rejectedFingerprint: true } : {}),
    },
  };
}

/** Same rule `srqc-projection.ts`'s internal `invocationIdOf` uses — kept in
 *  sync deliberately (not imported, since that helper is private to the pure
 *  projection module) so this job can attribute each raw ledger row to the
 *  invocation whose abstract state it contributed to. */
function invocationIdOfRow(row: ControlEventRow, mapped: ProjectableEvent): string | null {
  const fromPayload = mapped.payload.invocationId;
  if (typeof fromPayload === "string") return fromPayload;
  if (row.source === "ai_invocation") return row.sourceId;
  return null;
}

/**
 * Run one detection pass over `[sinceInclusive, untilExclusive)`. Pure with
 * respect to everything except: the `sql` reads/writes, and one `console.error`
 * per NEWLY-detected violation. Never throws away a `StoreUnavailable` — lets
 * it propagate.
 */
export async function runFormalReceiptPass(
  sql: ControlSqlClient,
  input: { readonly sinceInclusive: Date; readonly untilExclusive: Date },
): Promise<FormalReceiptSummary> {
  const rows = await readRecentEvents(sql, {
    sinceInclusive: input.sinceInclusive,
    untilExclusive: input.untilExclusive,
  });

  const projectable = rows.map(toProjectable);
  const projectedStates = projectWindow(projectable);
  const stateByInvocation = new Map(projectedStates.map((s) => [s.invocationId, s]));

  const violatingIds = new Set(
    projectedStates
      .filter(
        (s) =>
          s.pendingCountClass === "GE2" || (s.hasRejectedFp && !s.fingerprintBound),
      )
      .map((s) => s.invocationId),
  );

  // Chronologically-last row per invocation, ASC-ordered input from
  // readRecentEvents means the final assignment in this loop IS the last one.
  const lastRowByInvocation = new Map<string, ControlEventRow>();
  rows.forEach((row, i) => {
    const invId = invocationIdOfRow(row, projectable[i] as ProjectableEvent);
    if (invId !== null) lastRowByInvocation.set(invId, row);
  });

  // Read the active certificate version ONCE per pass and reuse it for every
  // incident written below — never one round-trip per violation. Null when no
  // SrqcVersion row is active (the common case today: activation is a
  // human/script-only decision, see formal-incident.ts).
  const activeSrqc = await getActiveSrqcVersion(sql);
  const activeSrqcVersion = activeSrqc?.version ?? null;

  const violationsDetected: FormalReceiptViolation[] = [];
  let violationsNewlyLogged = 0;
  let incidentsWritten = 0;
  for (const invocationId of violatingIds) {
    const state = stateByInvocation.get(invocationId);
    const witness = lastRowByInvocation.get(invocationId);
    if (state === undefined || witness === undefined) continue; // structurally unreachable
    const violation: FormalReceiptViolation = {
      invocationId,
      pendingCountClass: state.pendingCountClass,
      hasRejectedFp: state.hasRejectedFp,
      fingerprintBound: state.fingerprintBound,
      witnessEventId: witness.eventId,
    };
    violationsDetected.push(violation);

    // Pattern D (event-ledger.ts): check, act, mark — the log line is the
    // one non-naturally-idempotent side effect in this job.
    const seen = await alreadyProcessed(sql, witness.eventId, FORMAL_RECEIPT_VIOLATION_SINK);
    if (!seen) {
      console.error("[formal-receipt] SRQC invariant violation detected", {
        invocationId: violation.invocationId,
        pendingCountClass: violation.pendingCountClass,
        hasRejectedFp: violation.hasRejectedFp,
        fingerprintBound: violation.fingerprintBound,
        witnessEventId: violation.witnessEventId,
        windowSinceInclusive: input.sinceInclusive.toISOString(),
        windowUntilExclusive: input.untilExclusive.toISOString(),
      });
      await markProcessed(sql, witness.eventId, FORMAL_RECEIPT_VIOLATION_SINK);
      violationsNewlyLogged += 1;

      // Co-located with the exactly-once mark above: the durable incident row
      // is written in the SAME newly-logged branch, so double-running the job
      // over the same window writes it at most once (the row id is also
      // idempotent on the witness — belt and suspenders; see
      // recordFormalIncident).
      await recordFormalIncident(sql, {
        violationKind:
          violation.pendingCountClass === "GE2"
            ? "GE2_PENDING"
            : "REJECTED_FP_UNBOUND",
        abstractState: {
          invocationId: violation.invocationId,
          pendingCountClass: violation.pendingCountClass,
          hasRejectedFp: violation.hasRejectedFp,
          fingerprintBound: violation.fingerprintBound,
        },
        eventIds: [violation.witnessEventId],
        srqcVersion: activeSrqcVersion,
      });
      incidentsWritten += 1;
    }
  }

  let eventsNewlyMarkedProcessed = 0;
  for (const row of rows) {
    const result = await markProcessed(sql, row.eventId, FORMAL_RECEIPT_SINK);
    if (result === "marked") eventsNewlyMarkedProcessed += 1;
  }

  return {
    windowSinceInclusive: input.sinceInclusive.toISOString(),
    windowUntilExclusive: input.untilExclusive.toISOString(),
    eventsExamined: rows.length,
    eventsNewlyMarkedProcessed,
    violationsDetected,
    violationsNewlyLogged,
    incidentsWritten,
  };
}

/**
 * Default detection window: 26 hours. The cron cadence (see vercel.json) is
 * ONCE DAILY (Hobby-plan cap — see .github/workflows/external-cron.yml's own
 * header comment; this job is detection-only and non-urgent, so it does not
 * warrant the sub-daily external-cron.yml workaround the odds/settlement jobs
 * use). 26h (24h cadence + 2h buffer) guarantees no gap between successive
 * windows even if a run is skipped or delayed — overlap is intentionally
 * cheap here: the "examined" bookkeeping is idempotent via `ON CONFLICT`, and
 * the violation log is de-duplicated by witness eventId (see module doc), so
 * re-examining already-seen events costs a few no-op queries, never a
 * duplicate log line.
 */
const DEFAULT_WINDOW_MS = 26 * 60 * 60 * 1000;

/**
 * Production entry point used by the cron route: builds the SQL seam from the
 * real Prisma client (fail-closed `prismaSqlClient`, same pattern
 * `recovery-drainer.ts` uses), then runs one pass over the trailing window.
 */
export async function runFormalReceiptPassProduction(
  options: { readonly windowMs?: number; readonly now?: () => Date } = {},
): Promise<FormalReceiptSummary> {
  const [{ prismaSqlClient }, dbModule] = await Promise.all([
    import("./control-store"),
    import("@sports/db"),
  ]);
  const now = (options.now ?? ((): Date => new Date()))();
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  return runFormalReceiptPass(prismaSqlClient(dbModule.db), {
    sinceInclusive: new Date(now.getTime() - windowMs),
    untilExclusive: now,
  });
}
