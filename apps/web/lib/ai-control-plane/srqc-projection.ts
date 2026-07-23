/**
 * SRQC projection stub (Track A, exactly-once runtime handoff 2026-07-22).
 *
 * This is the SEED of the abstraction function α that a future Self-Refining
 * Quotient Certificate would refine. It is deliberately minimal and PURE: it
 * takes a window of `control_event_ledger` rows (as read by
 * `readRecentEvents`) and folds them into a small abstract state vector of
 * the same shape the Formal Foundry's abstract domain reasons over. It does
 * NOT yet implement a real certificate, and `admitUnderSRQC` always admits —
 * the point of this pass is to force the EVENT SHAPE to be rich enough that a
 * real α can be written later WITHOUT changing the emission surface.
 *
 * Correctness posture: the projection is detection-only and side-effect-free.
 * It cannot, and must not, alter control-plane behavior. Its one job worth
 * testing today is that it can WITNESS the CTI classes the Formal Foundry
 * already closed — most importantly, two attempts left concurrently pending
 * on the same invocation (`pendingCountClass === "GE2"`), the exact shape of
 * inductive CTI #1 for InvocationClaim. If a projection over a real ledger
 * window ever reports GE2, that is a signal the runtime produced a state the
 * proofs forbid — which is the entire reason this surface exists.
 *
 * It consumes the events emitted by control-store.ts:
 *   ATTEMPT_STARTED     (source ai_attempt)   — a DISPATCHED attempt begins
 *   ATTEMPT_FAILED      (source ai_attempt)   — that attempt reached a terminal failure
 *   FINALIZED_SUCCESS   (source ai_invocation)
 *   FINALIZED_FAILED / _AMBIGUOUS / _BUDGET_BLOCKED / _POLICY_BLOCKED
 *                       (source ai_invocation) — the invocation reached terminal
 */

// ─── Abstract domain (the seed of α's codomain) ─────────────────────────────

/** Where the invocation's claim sits. */
export type ClaimPhase = "OPEN" | "TERMINAL";

/** Where any credit/budget exposure sits at the abstract level. */
export type ExposurePhase = "NONE" | "HELD" | "AMBIGUOUS_HELD";

/**
 * How many attempts are concurrently PENDING (started, not yet terminal) on
 * ONE invocation. `GE2` is the forbidden class — `AtMostOnePendingPerInvocation`
 * (InvocationClaim inductive glue) says this can never happen in a reachable
 * state.
 */
export type PendingCountClass = "ZERO" | "ONE" | "GE2";

export interface AbstractControlState {
  readonly invocationId: string;
  readonly claimPhase: ClaimPhase;
  readonly exposurePhase: ExposurePhase;
  readonly pendingCountClass: PendingCountClass;
  /** A request fingerprint has been bound to this id (always true once any
   *  event is seen — every emitted event carries the bound id). */
  readonly fingerprintBound: boolean;
  /** Whether a rejected/conflicting fingerprint was observed for this id.
   *  `RejectedImpliesBound` says this can only be true when the id is bound. */
  readonly hasRejectedFp: boolean;
}

// ─── Projection input ───────────────────────────────────────────────────────

/**
 * The minimal event shape the projection needs — a structural subset of a
 * `control_event_ledger` row (`ControlEventRow` in event-ledger.ts). Kept as
 * its own interface so the projection is unit-testable with synthetic,
 * CTI-shaped windows without a database.
 */
export interface ProjectableEvent {
  readonly eventType: string;
  readonly source: string;
  readonly sourceId: string;
  readonly payload: {
    readonly invocationId?: string;
    readonly attemptId?: string;
    readonly rejectedFingerprint?: boolean;
    readonly [k: string]: unknown;
  };
}

// These are the EXACT event-type strings control-store.ts emits for a
// terminal invocation transition. `finalizeSuccess` emits the literal
// "FINALIZED_SUCCESS"; `finalizeFailure` emits `'FINALIZED_' || status` with
// status ∈ {FAILED, AMBIGUOUS, BUDGET_BLOCKED, POLICY_BLOCKED}, so the real
// failure event name is FINALIZED_FAILED (NOT FINALIZED_FAILURE). The
// claimInvocation steal/unproven-funds fence also emits FINALIZED_AMBIGUOUS.
// This set must match those emitted names exactly or a settled invocation is
// mis-projected as still OPEN.
const TERMINAL_INVOCATION_EVENTS = new Set([
  "FINALIZED_SUCCESS",
  "FINALIZED_FAILED",
  "FINALIZED_AMBIGUOUS",
  "FINALIZED_BUDGET_BLOCKED",
  "FINALIZED_POLICY_BLOCKED",
]);

function invocationIdOf(e: ProjectableEvent): string | null {
  const fromPayload = e.payload.invocationId;
  if (typeof fromPayload === "string") return fromPayload;
  // ai_invocation-sourced events carry the invocation id as sourceId.
  if (e.source === "ai_invocation") return e.sourceId;
  return null;
}

/**
 * Fold a window of ledger events into per-invocation abstract states. Pure:
 * no clock, no I/O, no mutation of its input. Events for different
 * invocations are projected independently; ordering within an invocation is
 * taken as given by the caller (the ledger is read `ORDER BY createdAt ASC`).
 */
export function projectWindow(
  events: readonly ProjectableEvent[],
): readonly AbstractControlState[] {
  interface Acc {
    claimTerminal: boolean;
    startedAttempts: Set<string>;
    terminalAttempts: Set<string>;
    exposure: ExposurePhase;
    hasRejectedFp: boolean;
  }
  const byInvocation = new Map<string, Acc>();

  const acc = (id: string): Acc => {
    let a = byInvocation.get(id);
    if (a === undefined) {
      a = {
        claimTerminal: false,
        startedAttempts: new Set(),
        terminalAttempts: new Set(),
        exposure: "NONE",
        hasRejectedFp: false,
      };
      byInvocation.set(id, a);
    }
    return a;
  };

  for (const e of events) {
    const invId = invocationIdOf(e);
    if (invId === null) continue;
    const a = acc(invId);

    if (e.eventType === "ATTEMPT_STARTED") {
      const attemptId = e.payload.attemptId ?? e.sourceId;
      a.startedAttempts.add(attemptId);
      if (a.exposure === "NONE") a.exposure = "HELD";
    } else if (e.eventType === "ATTEMPT_FAILED") {
      const attemptId = e.payload.attemptId ?? e.sourceId;
      a.terminalAttempts.add(attemptId);
    } else if (TERMINAL_INVOCATION_EVENTS.has(e.eventType)) {
      a.claimTerminal = true;
      // The success path emits ATTEMPT_STARTED then FINALIZED_SUCCESS for the
      // WINNING attempt — there is no ATTEMPT_FAILED for it — so the winning
      // attempt would otherwise stay in `startedAttempts` and report a
      // spurious ONE-pending on a settled success. finalizeSuccess carries the
      // winning attemptId in its payload; close that attempt here. Degrade
      // gracefully if an older payload lacks it (nothing to close — do not
      // crash).
      if (e.eventType === "FINALIZED_SUCCESS") {
        const winningAttemptId = e.payload.attemptId;
        if (typeof winningAttemptId === "string") {
          a.terminalAttempts.add(winningAttemptId);
        }
      }
      // An AMBIGUOUS terminal is the "held until trusted resolution" state;
      // any other terminal releases the abstract exposure.
      a.exposure =
        e.eventType === "FINALIZED_AMBIGUOUS" ? "AMBIGUOUS_HELD" : "NONE";
    }

    if (e.payload.rejectedFingerprint === true) {
      a.hasRejectedFp = true;
    }
  }

  const out: AbstractControlState[] = [];
  for (const [invocationId, a] of byInvocation) {
    const pending = [...a.startedAttempts].filter(
      (id) => !a.terminalAttempts.has(id),
    ).length;
    const pendingCountClass: PendingCountClass =
      pending <= 0 ? "ZERO" : pending === 1 ? "ONE" : "GE2";
    out.push({
      invocationId,
      claimPhase: a.claimTerminal ? "TERMINAL" : "OPEN",
      exposurePhase: a.exposure,
      pendingCountClass,
      fingerprintBound: true,
      hasRejectedFp: a.hasRejectedFp,
    });
  }
  return out;
}

// ─── Admission stub (always admits; forces the projection shape) ────────────

export type SrqcAdmissionDecision = "ADMIT" | "REFUSE";

export interface SrqcAdmissionResult {
  readonly decision: SrqcAdmissionDecision;
  /** The projected abstract states the decision was (not yet) based on. */
  readonly projected: readonly AbstractControlState[];
  /** Abstract states that violate a Formal Foundry invariant, if any. Empty
   *  in every reachable state — a non-empty list is a real signal, surfaced
   *  for a future certificate / incident emitter to act on (it does NOT
   *  change the decision in this stub). */
  readonly violations: readonly AbstractControlState[];
}

/**
 * The seed of `admitUnderSRQC`. Today it ALWAYS admits — no runtime behavior
 * is gated on it — but it computes the projection every time so the event
 * shape is exercised and any GE2 (forbidden two-Pending) window is surfaced
 * in `violations`. A real certificate would later refuse on a violation; this
 * stub deliberately does not, so it can be introduced with zero behavior
 * change (detection-only, matching the dormant-until-owner-decision posture).
 */
export function admitUnderSRQC(
  events: readonly ProjectableEvent[],
): SrqcAdmissionResult {
  const projected = projectWindow(events);
  const violations = projected.filter(
    (s) =>
      s.pendingCountClass === "GE2" ||
      (s.hasRejectedFp && !s.fingerprintBound),
  );
  return { decision: "ADMIT", projected, violations };
}
