/**
 * W5 — second α consumer (Wave 1 Foundation item, owner-authorized).
 *
 * `budget_alpha_witness` is a second, independent consumer of the SAME
 * `projectWindow` abstraction `formal-receipt-job.ts` (Track B) and
 * `cti-miner.ts` (M6) already read the ledger through — proving the α
 * projection is portable across more than one sink, not tied to a single
 * consumer's bookkeeping.
 *
 * It is a narrower, money-focused lens than either existing consumer: it
 * fires only on the intersection of (a) a proof-forbidden abstract state
 * (`isViolation` — the identical predicate both existing consumers already
 * use) AND (b) `exposurePhase !== "NONE"` — i.e. the invariant violation was
 * witnessed WHILE the abstract model still believes money/credit is
 * outstanding on that invocation. That is the worst case the whole SRQC
 * apparatus exists to catch: a runtime state the proofs say can't happen,
 * co-occurring with live financial exposure.
 *
 * WITNESS-ONLY: this module never calls `budget.ts`'s release/settle/sweep
 * functions, never touches `CreditAuthorizationPort`, and never calls
 * `admitUnderSRQC` with `mode: "ENFORCE"`. It records an observation for a
 * human/incident-review process, exactly like `formal-receipt-job.ts`'s
 * `formal_incident` row and `cti-miner.ts`'s `cti_candidate` row are
 * observations, not actions.
 *
 * As an optional Tier-2 enrichment (still read-only, still non-gating), it
 * does one best-effort join against `ai_budget_reservations` for the
 * witnessed `invocationId`, to record whether a REAL cash hold row exists,
 * not just the abstract `exposurePhase`. A failed/empty lookup never
 * suppresses the witness — it is additive evidence only.
 */

import { readRecentEvents, alreadyProcessed, markProcessed } from "./event-ledger";
import type { ControlEventRow } from "./event-ledger";
import { projectWindow, isViolation } from "./srqc-projection";
import type { ProjectableEvent, PendingCountClass, ExposurePhase } from "./srqc-projection";
import type { ControlSqlClient } from "./control-store";

/** Sink for the exactly-once witness-log gate. MUST NOT collide with
 *  formal-receipt-job.ts's "formal_receipt" / "formal_receipt_violation" —
 *  cti-miner.ts uses no processed_event sink at all (dedups on
 *  cti_candidate.id), so this is the third distinct participant in the
 *  table, not the second. */
export const BUDGET_ALPHA_WITNESS_SINK = "budget_alpha_witness";

export interface BudgetAlphaWitnessObservation {
  readonly invocationId: string;
  readonly pendingCountClass: PendingCountClass;
  readonly exposurePhase: ExposurePhase;
  readonly hasRejectedFp: boolean;
  readonly fingerprintBound: boolean;
  /** Chronologically-last row for this invocation in the window — same
   *  "permanent, deterministic witness eventId" idiom formal-receipt-job.ts
   *  uses. */
  readonly witnessEventId: string;
  /** Tier-2, best-effort. Never gates the observation. */
  readonly liveBudgetReservationFound: boolean;
}

export interface BudgetAlphaWitnessSummary {
  readonly windowSinceInclusive: string;
  readonly windowUntilExclusive: string;
  readonly eventsExamined: number;
  readonly observationsDetected: readonly BudgetAlphaWitnessObservation[];
  readonly observationsNewlyLogged: number;
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

/** Same rule formal-receipt-job.ts's invocationIdOfRow uses — kept in sync
 *  deliberately rather than imported, since that helper is not exported. */
function invocationIdOfRow(row: ControlEventRow, mapped: ProjectableEvent): string | null {
  const fromPayload = mapped.payload.invocationId;
  if (typeof fromPayload === "string") return fromPayload;
  if (row.source === "ai_invocation") return row.sourceId;
  return null;
}

/**
 * Run one witness pass over `[sinceInclusive, untilExclusive)`. Read-only
 * except for: the exactly-once `processed_event` mark, one `console.warn`
 * per newly-detected observation, and one best-effort SELECT per
 * observation for the Tier-2 enrichment. Never writes to
 * `ai_budget_reservations`, `control_event_ledger`, or any admission table.
 */
export async function runBudgetAlphaWitnessPass(
  sql: ControlSqlClient,
  input: { readonly sinceInclusive: Date; readonly untilExclusive: Date },
): Promise<BudgetAlphaWitnessSummary> {
  const rows = await readRecentEvents(sql, {
    sinceInclusive: input.sinceInclusive,
    untilExclusive: input.untilExclusive,
  });

  const projectable = rows.map(toProjectable);
  const projectedStates = projectWindow(projectable);
  const stateByInvocation = new Map(projectedStates.map((s) => [s.invocationId, s]));

  const witnessedIds = new Set(
    projectedStates
      .filter((s) => isViolation(s) && s.exposurePhase !== "NONE")
      .map((s) => s.invocationId),
  );

  const lastRowByInvocation = new Map<string, ControlEventRow>();
  rows.forEach((row, i) => {
    const invId = invocationIdOfRow(row, projectable[i] as ProjectableEvent);
    if (invId !== null) lastRowByInvocation.set(invId, row);
  });

  const observationsDetected: BudgetAlphaWitnessObservation[] = [];
  let observationsNewlyLogged = 0;
  for (const invocationId of witnessedIds) {
    const state = stateByInvocation.get(invocationId);
    const witness = lastRowByInvocation.get(invocationId);
    if (state === undefined || witness === undefined) continue; // structurally unreachable

    const seen = await alreadyProcessed(sql, witness.eventId, BUDGET_ALPHA_WITNESS_SINK);
    if (seen) continue;

    // Tier-2 enrichment: best-effort, never suppresses the witness.
    let liveBudgetReservationFound = false;
    try {
      const held = await sql.query<{ id: string }>(
        `SELECT "id" FROM "ai_budget_reservations" WHERE "invocationId" = $1 AND "state" = 'HELD' LIMIT 1`,
        [invocationId],
      );
      liveBudgetReservationFound = held.length > 0;
    } catch {
      liveBudgetReservationFound = false;
    }

    const observation: BudgetAlphaWitnessObservation = {
      invocationId,
      pendingCountClass: state.pendingCountClass,
      exposurePhase: state.exposurePhase,
      hasRejectedFp: state.hasRejectedFp,
      fingerprintBound: state.fingerprintBound,
      witnessEventId: witness.eventId,
      liveBudgetReservationFound,
    };
    observationsDetected.push(observation);

    console.warn("[budget-alpha-witness] SRQC invariant violation witnessed with live exposure", {
      invocationId: observation.invocationId,
      pendingCountClass: observation.pendingCountClass,
      exposurePhase: observation.exposurePhase,
      witnessEventId: observation.witnessEventId,
      liveBudgetReservationFound: observation.liveBudgetReservationFound,
      windowSinceInclusive: input.sinceInclusive.toISOString(),
      windowUntilExclusive: input.untilExclusive.toISOString(),
    });
    await markProcessed(sql, witness.eventId, BUDGET_ALPHA_WITNESS_SINK);
    observationsNewlyLogged += 1;
  }

  return {
    windowSinceInclusive: input.sinceInclusive.toISOString(),
    windowUntilExclusive: input.untilExclusive.toISOString(),
    eventsExamined: rows.length,
    observationsDetected,
    observationsNewlyLogged,
  };
}

/**
 * Production entry point, same pattern as
 * formal-receipt-job.ts's runFormalReceiptPassProduction.
 */
export async function runBudgetAlphaWitnessPassProduction(
  options: { readonly windowMs?: number; readonly now?: () => Date } = {},
): Promise<BudgetAlphaWitnessSummary> {
  const [{ prismaSqlClient }, dbModule] = await Promise.all([
    import("./control-store"),
    import("@sports/db"),
  ]);
  const now = (options.now ?? ((): Date => new Date()))();
  const windowMs = options.windowMs ?? 26 * 60 * 60 * 1000;
  return runBudgetAlphaWitnessPass(prismaSqlClient(dbModule.db), {
    sinceInclusive: new Date(now.getTime() - windowMs),
    untilExclusive: now,
  });
}
