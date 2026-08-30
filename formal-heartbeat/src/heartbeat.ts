/**
 * ============================================================================
 * DORMANT / LAB-ONLY — Wave 3 batch (Decision-A-independent pieces).
 * MONITORING / DETECTION ONLY. No writes, no alerts, no enforcement, no I/O.
 * (Decisions B-F forbid wiring alerts or enforcement — respected here.)
 * ============================================================================
 *
 * Formal Heartbeat.
 *
 * Re-checks a window of projected abstract states (projection.ts) against the
 * invariants of `formal/live-sports/LiveModelDispatchUnderAmbiguity.tla`:
 *
 *   NEW composed invariants:
 *     - AmbiguousExposureHeldUntilTrustedResolution
 *     - ReservedNeverExceedsBudgetWindowCap
 *     - AvailableBudgetNeverNegative
 *     - NoDispatchWithoutExposureHold
 *   BASE invariants (re-exported by the composed module):
 *     - LedgerNeverExceedsBalance          (BaseLedgerNeverExceedsBalance)
 *     - NeverOverAdmit                      (BaseNeverOverAdmit)
 *     - AmbiguousAttemptStopsFallback       (BaseAmbiguousAttemptStopsFallback)
 *
 *   EXTENSION invariants (batch1-ext) — RUNTIME-DETECTION-ONLY, grounded in
 *   real repo code but NOT part of the TLA+ spec and NOT TLC-checked:
 *     - NoSelfApproval (founder-command.ts FounderQueueDecision owner-vs-agent
 *       split + PR #175 autonomy-ladder owner-only boundary)
 *     - OutboxDeliveryFailureCannotBecomeDelivered (settlement-outbox
 *       worker.ts delivery state machine, PR #161)
 *
 * It BURNS a "cognitive SLO error budget" by feeding each per-state invariant
 * check as a Bernoulli observation (0 = pass, 1 = violation) into the
 * e-process kernel (e-process.ts). The null hypothesis is that the invariant-
 * violation rate is at most `nullRate` (the tolerated SLO error rate); the
 * e-process is anytime-valid, so wealth crossing 1/alpha is a Ville-valid
 * detection that the observed violation rate exceeds tolerance. This is honest
 * evidence accumulation, NOT a hand-rolled counter: a clean window's mostly-0
 * stream keeps wealth low, and violations drive it monotonically upward.
 *
 * The function is pure: it returns a structured result and a NEW e-process
 * state. It never emits an alert, writes a store, or enforces anything.
 */

import { AbstractState } from "./abstract-state.js";
import {
  EProcessConfig,
  EProcessState,
  hasRejected,
  initEProcess,
  Observation,
  updateEProcess,
  wealth,
} from "./e-process.js";

export type InvariantName =
  | "AmbiguousExposureHeldUntilTrustedResolution"
  | "ReservedNeverExceedsBudgetWindowCap"
  | "AvailableBudgetNeverNegative"
  | "NoDispatchWithoutExposureHold"
  | "BaseLedgerNeverExceedsBalance"
  | "BaseNeverOverAdmit"
  | "BaseAmbiguousAttemptStopsFallback"
  // EXTENSION (batch1-ext): two runtime-only invariants (not TLC-checked).
  | "NoSelfApproval"
  | "OutboxDeliveryFailureCannotBecomeDelivered";

export const INVARIANT_NAMES: readonly InvariantName[] = [
  "AmbiguousExposureHeldUntilTrustedResolution",
  "ReservedNeverExceedsBudgetWindowCap",
  "AvailableBudgetNeverNegative",
  "NoDispatchWithoutExposureHold",
  "BaseLedgerNeverExceedsBalance",
  "BaseNeverOverAdmit",
  "BaseAmbiguousAttemptStopsFallback",
  "NoSelfApproval",
  "OutboxDeliveryFailureCannotBecomeDelivered",
];

/** A single invariant evaluation over one abstract state. */
export interface InvariantCheck {
  readonly invariant: InvariantName;
  readonly holds: boolean;
  /** Human-readable witness when `holds` is false; empty otherwise. */
  readonly detail: string;
}

/** All invariant checks for one abstract state. */
export interface StateReport {
  readonly stateIndex: number;
  readonly checks: readonly InvariantCheck[];
  readonly violations: readonly InvariantCheck[];
}

/** Structured result of a heartbeat over a window of states. */
export interface HeartbeatResult {
  readonly pass: boolean;
  readonly totalChecks: number;
  readonly totalViolations: number;
  readonly stateReports: readonly StateReport[];
  /** The e-process state after burning this window's checks. */
  readonly budget: EProcessState;
  /** True once the SLO error budget is exhausted (anytime-valid reject). */
  readonly budgetExhausted: boolean;
  /** Wealth E_t after this window (evidence multiple; 1/alpha is the boundary). */
  readonly budgetWealth: number;
  /** Ordered observation stream fed to the e-process (0 pass, 1 violation). */
  readonly observations: readonly Observation[];
}

const trusted = (s: AbstractState) => new Set(s.trustedActors);

// --------------------------------------------------------------------------
// Invariant predicates — each mirrors the TLA formula and yields a witness.
// Returns "" (empty detail) when the invariant holds.
// --------------------------------------------------------------------------

function checkAmbiguousExposureHeld(s: AbstractState): string {
  const t = trusted(s);
  for (const att of s.attempts) {
    if (s.attemptOutcome[att] !== "Ambiguous") continue;
    const st = s.state[att];
    const heldOk = st === "HELD";
    const trustedReleaseOk =
      st === "RELEASED" &&
      s.releaseReason[att] === "TrustedAmbiguousResolution" &&
      t.has(s.releaseBy[att] ?? "");
    if (!heldOk && !trustedReleaseOk) {
      return `attempt ${att}: Ambiguous outcome but state=${st}, releaseReason=${s.releaseReason[att]}, releaseBy=${s.releaseBy[att]} (not HELD and not a trusted-actor resolution)`;
    }
  }
  return "";
}

function checkReservedNeverExceedsCap(s: AbstractState): string {
  return s.reserved <= s.verifiedBalance
    ? ""
    : `reserved=${s.reserved} > VerifiedBalance=${s.verifiedBalance}`;
}

function checkAvailableBudgetNeverNegative(s: AbstractState): string {
  return s.verifiedBalance - s.reserved >= 0
    ? ""
    : `VerifiedBalance - reserved = ${s.verifiedBalance - s.reserved} < 0`;
}

function checkNoDispatchWithoutExposureHold(s: AbstractState): string {
  for (const att of s.attempts) {
    if (s.dispatched[att] === true) {
      const st = s.state[att];
      if (st === "Unstarted" || st === "REFUSED") {
        return `attempt ${att}: dispatched=TRUE but reservation state=${st} (dispatched without an authorized exposure hold)`;
      }
    }
  }
  return "";
}

function checkLedgerNeverExceedsBalance(s: AbstractState): string {
  // Base CR!LedgerNeverExceedsBalance — same arithmetic form, checked by name.
  return s.reserved <= s.verifiedBalance
    ? ""
    : `reserved=${s.reserved} > VerifiedBalance=${s.verifiedBalance}`;
}

function checkNeverOverAdmit(s: AbstractState): string {
  let committed = 0;
  for (const att of s.attempts) {
    const st = s.state[att];
    if (st === "HELD" || st === "SETTLED") committed += 1;
  }
  return committed * s.requestCost <= s.verifiedBalance
    ? ""
    : `committed=${committed} * RequestCost=${s.requestCost} = ${committed * s.requestCost} > VerifiedBalance=${s.verifiedBalance}`;
}

function checkAmbiguousAttemptStopsFallback(s: AbstractState): string {
  for (const inv of s.invocations) {
    if (s.invocationStatus[inv] !== "Ambiguous") continue;
    for (const att of s.attempts) {
      if (s.attemptOf[att] === inv && s.attemptOutcome[att] === "Pending") {
        return `invocation ${inv}: status=Ambiguous but attempt ${att} is still Pending (a fallback/retry is outstanding)`;
      }
    }
  }
  return "";
}

// --------------------------------------------------------------------------
// EXTENSION invariants (batch1-ext): runtime-only, grounded in real repo code.
// NOT part of LiveModelDispatchUnderAmbiguity.tla; NOT TLC-checked. Each does
// real logic over the projected observation stream and yields a witness.
// --------------------------------------------------------------------------

/** Decision kinds that CONFER authority/approval (a "grant"). Non-conferring
 *  kinds (ACKNOWLEDGED/REJECTED/DEFERRED/DISMISSED) are not self-approvable. */
const AUTHORITY_CONFERRING_DECISIONS: ReadonlySet<string> = new Set([
  "APPROVED",
  "ASSIGNED_TO_AGENT",
  "AUTONOMY_GRANT",
]);

/**
 * NoSelfApproval — an authority/grant decision whose approver identity equals
 * its grantee identity is a violation. Grounds: the FounderQueueDecision
 * OWNER-vs-agent actor split (founder-command.ts — an OWNER actor decides on
 * an agent's work item) and PR #175's autonomy-ladder owner-only boundary
 * (autonomy-ladder.ts — an OWNER_ONLY grant can never be auto-approved by the
 * acting agent). Self-approval collapses that separation of duties.
 */
function checkNoSelfApproval(s: AbstractState): string {
  for (const d of s.authorityDecisions) {
    if (!AUTHORITY_CONFERRING_DECISIONS.has(d.decisionKind)) continue;
    if (d.approver === "" || d.grantee === "") continue;
    if (d.approver === d.grantee) {
      const action = d.actionKind ? ` actionKind=${d.actionKind}` : "";
      return `decision ${d.decisionId} (${d.decisionKind}${action}) on workItem ${d.workItemId}: approver == grantee == "${d.approver}" (self-approval; approver identity must differ from grantee — the owner-vs-agent separation in founder-command.ts / the autonomy-ladder owner-only boundary is broken)`;
    }
  }
  return "";
}

const TERMINAL_DELIVERY_FAILURES: ReadonlySet<string> = new Set([
  "PERMANENT_FAILED",
  "DEAD_LETTER",
]);

/**
 * OutboxDeliveryFailureCannotBecomeDelivered — for one per-recipient delivery,
 * once it has reached a terminal FAILURE (PERMANENT_FAILED / DEAD_LETTER) it
 * must never LATER be observed DELIVERED. Grounds: the settlement-outbox
 * delivery state machine (settlement-outbox/worker.ts, PR #161) — those two
 * are terminal states, DELIVERED rows are never re-claimable, and a stale
 * claim at the attempt cap dead-letters rather than returning to PENDING. The
 * check groups the window's delivery observations by deliveryId, reads them in
 * `sequence` order, and flags a terminal-failure followed by a later DELIVERED.
 */
function checkOutboxDeliveryFailureCannotBecomeDelivered(s: AbstractState): string {
  const bySubject = new Map<string, { status: string; sequence: number }[]>();
  for (const o of s.deliveryObservations) {
    const list = bySubject.get(o.deliveryId);
    if (list) list.push({ status: o.status, sequence: o.sequence });
    else bySubject.set(o.deliveryId, [{ status: o.status, sequence: o.sequence }]);
  }
  for (const [deliveryId, events] of bySubject) {
    const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
    let firstFailure: { status: string; sequence: number } | null = null;
    for (const ev of ordered) {
      if (firstFailure === null && TERMINAL_DELIVERY_FAILURES.has(ev.status)) {
        firstFailure = ev;
        continue;
      }
      if (firstFailure !== null && ev.status === "DELIVERED") {
        return `delivery ${deliveryId}: reached terminal-failure ${firstFailure.status} at sequence ${firstFailure.sequence} but was later observed DELIVERED at sequence ${ev.sequence} (a terminal failed/dead-letter delivery must never become DELIVERED — settlement-outbox worker.ts TERMINAL_DELIVERY_STATUSES)`;
      }
    }
  }
  return "";
}

const PREDICATES: ReadonlyArray<{
  name: InvariantName;
  fn: (s: AbstractState) => string;
}> = [
  { name: "AmbiguousExposureHeldUntilTrustedResolution", fn: checkAmbiguousExposureHeld },
  { name: "ReservedNeverExceedsBudgetWindowCap", fn: checkReservedNeverExceedsCap },
  { name: "AvailableBudgetNeverNegative", fn: checkAvailableBudgetNeverNegative },
  { name: "NoDispatchWithoutExposureHold", fn: checkNoDispatchWithoutExposureHold },
  { name: "BaseLedgerNeverExceedsBalance", fn: checkLedgerNeverExceedsBalance },
  { name: "BaseNeverOverAdmit", fn: checkNeverOverAdmit },
  { name: "BaseAmbiguousAttemptStopsFallback", fn: checkAmbiguousAttemptStopsFallback },
  { name: "NoSelfApproval", fn: checkNoSelfApproval },
  {
    name: "OutboxDeliveryFailureCannotBecomeDelivered",
    fn: checkOutboxDeliveryFailureCannotBecomeDelivered,
  },
];

/** Evaluate all invariants over a single abstract state. */
export function checkState(s: AbstractState, stateIndex: number): StateReport {
  const checks: InvariantCheck[] = PREDICATES.map(({ name, fn }) => {
    const detail = fn(s);
    return { invariant: name, holds: detail === "", detail };
  });
  return {
    stateIndex,
    checks,
    violations: checks.filter((c) => !c.holds),
  };
}

/**
 * Run the Formal Heartbeat over a window of projected abstract states, burning
 * the cognitive SLO error budget through the e-process.
 *
 * Observation order is deterministic: for each state (in the given window
 * order), the seven invariants are fed in `INVARIANT_NAMES` order, each as a
 * 0 (holds) / 1 (violated) Bernoulli observation. Because a violation is a 1
 * and multiplies wealth by (1 + lambda*(1 - nullRate)) > 1, budget burn is
 * monotonically non-decreasing in the number of violations; the reject
 * decision is the anytime-valid Ville crossing from the kernel.
 */
export function runHeartbeat(
  states: readonly AbstractState[],
  config: EProcessConfig,
  from: EProcessState = initEProcess(),
): HeartbeatResult {
  const stateReports: StateReport[] = [];
  const observations: Observation[] = [];
  let budget = from;
  let totalChecks = 0;
  let totalViolations = 0;

  states.forEach((s, i) => {
    const report = checkState(s, i);
    stateReports.push(report);
    for (const check of report.checks) {
      const x: Observation = check.holds ? 0 : 1;
      observations.push(x);
      budget = updateEProcess(config, budget, x);
      totalChecks += 1;
      if (x === 1) totalViolations += 1;
    }
  });

  return {
    pass: totalViolations === 0,
    totalChecks,
    totalViolations,
    stateReports,
    budget,
    budgetExhausted: hasRejected(config, budget),
    budgetWealth: wealth(budget),
    observations,
  };
}
