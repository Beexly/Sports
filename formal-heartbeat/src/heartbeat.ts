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
  | "BaseAmbiguousAttemptStopsFallback";

export const INVARIANT_NAMES: readonly InvariantName[] = [
  "AmbiguousExposureHeldUntilTrustedResolution",
  "ReservedNeverExceedsBudgetWindowCap",
  "AvailableBudgetNeverNegative",
  "NoDispatchWithoutExposureHold",
  "BaseLedgerNeverExceedsBalance",
  "BaseNeverOverAdmit",
  "BaseAmbiguousAttemptStopsFallback",
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
