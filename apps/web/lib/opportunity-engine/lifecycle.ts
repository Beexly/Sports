import type { CreditGrantState, MoneyState, OpportunityLifecycleState } from "./types";

const LIFECYCLE_TRANSITIONS: Readonly<Record<OpportunityLifecycleState, readonly OpportunityLifecycleState[]>> = {
  observed: ["verified", "rejected", "expired"],
  verified: ["scored", "rejected", "expired"],
  scored: ["proposed", "rejected", "expired"],
  proposed: ["approved", "rejected", "expired"],
  approved: ["prototyping", "rejected", "expired"],
  prototyping: ["validated", "rejected", "expired"],
  validated: ["shipped", "rejected", "expired"],
  shipped: ["measuring", "rejected", "expired"],
  measuring: ["scaled", "rejected", "expired"],
  scaled: ["measuring", "rejected", "expired"],
  rejected: [],
  expired: [],
};

const MONEY_STATE_ORDER: readonly MoneyState[] = [
  "not_applicable",
  "hypothetical",
  "discovered",
  "eligibility_unverified",
  "eligible",
  "applied",
  "approved",
  "activated",
  "earned",
  "invoiced",
  "paid",
];

export function canTransitionLifecycle(
  from: OpportunityLifecycleState,
  to: OpportunityLifecycleState,
): boolean {
  return LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function assertLifecycleTransition(
  from: OpportunityLifecycleState,
  to: OpportunityLifecycleState,
): void {
  if (!canTransitionLifecycle(from, to)) {
    throw new Error(`Invalid opportunity lifecycle transition: ${from} -> ${to}.`);
  }
}

export function canTransitionMoneyState(from: MoneyState, to: MoneyState): boolean {
  // Terminal states absorb FIRST: paid/rejected/expired allow no further
  // transition at all — no self-restatement and no rewriting one terminal
  // cause into another (e.g. rejected -> expired). This check must precede
  // the to-terminal rule below, or terminal causes become cross-writable.
  if (from === "rejected" || from === "expired" || from === "paid") return false;
  if (to === "rejected" || to === "expired") return true;
  if (from === to) return true;
  const fromIndex = MONEY_STATE_ORDER.indexOf(from);
  const toIndex = MONEY_STATE_ORDER.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return false;
  // Do not skip proof-bearing states. E.g. discovered cannot become approved
  // without eligibility/application evidence being recorded.
  return toIndex === fromIndex + 1;
}

export function assertMoneyStateTransition(from: MoneyState, to: MoneyState): void {
  if (!canTransitionMoneyState(from, to)) {
    throw new Error(`Invalid money-state transition: ${from} -> ${to}.`);
  }
}

/**
 * Credit-grant sub-state machine (freeze §5.2). Mirrors the `MoneyState`
 * pattern: forward-only consumption, terminal states absorbing, and
 * `expired`/`revoked` reachable from any non-terminal state.
 *
 * The map is explicit (not positional stepping) because consumption is NOT
 * strictly one-step: `activated -> exhausted` is a legal direct transition —
 * a single confirmed allocation can consume the full grant in one settlement,
 * in which case no intermediate `partially_consumed` observation ever exists
 * and requiring one would force fabricating an unobserved state. What remains
 * forbidden is skipping ACTIVATION evidence: `approved -> partially_consumed`
 * and `approved -> exhausted` stay invalid because nothing can be consumed
 * from a grant that was never activated.
 *
 * The sibling credit machines (program/application/balance/allocation) and
 * the explicit `CreditGrantState -> MoneyState` ceiling adapter live in
 * `credit.ts` (directive §11.1); the receipted `CreditGrantSnapshot`
 * contract lives in `credit-snapshot.ts` (§11.2).
 */
const CREDIT_GRANT_TRANSITIONS: Readonly<Record<CreditGrantState, readonly CreditGrantState[]>> = {
  approved: ["activated", "expired", "revoked"],
  activated: ["partially_consumed", "exhausted", "expired", "revoked"],
  partially_consumed: ["exhausted", "expired", "revoked"],
  exhausted: [],
  expired: [],
  revoked: [],
};

const CREDIT_GRANT_TERMINAL_STATES: ReadonlySet<CreditGrantState> = new Set([
  "exhausted",
  "expired",
  "revoked",
]);

export function isCreditGrantStateTerminal(state: CreditGrantState): boolean {
  return CREDIT_GRANT_TERMINAL_STATES.has(state);
}

/**
 * The exact `MoneyState`s that constitute operational credit-grant evidence.
 * This is an ENUMERATION, not a positional check against `MONEY_STATE_ORDER`:
 * appearing after `"approved"` in the broad money lifecycle is ordering
 * coincidence, not grant evidence.
 *
 * - `"approved"`: the award decision is on record — a grant exists in its own
 *   `approved` sub-state, so the parent money state legitimately carries a
 *   grant sub-state machine.
 * - `"activated"`: the grant is live and consumable — the only other money
 *   state whose meaning IS a grant-domain fact.
 *
 * Excluded deliberately:
 * - `"earned"`, `"invoiced"`, `"paid"`: receivable-side REALIZATION states.
 *   They assert that value was realized or billed for the opportunity as a
 *   whole; they say nothing about a credit grant being operationally live.
 *   Credits are cost avoidance and can never be invoiced or paid (see
 *   `credit.ts` module doc), so these states are not grant evidence despite
 *   sitting after `"approved"` in `MONEY_STATE_ORDER`.
 * - `"expired"`, `"rejected"`: terminal money states cannot carry a live
 *   grant sub-state.
 * - Every pre-approval state: no award decision exists yet.
 */
const GRANT_EVIDENCE_MONEY_STATES: ReadonlySet<MoneyState> = new Set(["approved", "activated"]);

/**
 * Whether the parent opportunity's `moneyState` is itself operational
 * evidence that a credit grant exists (see
 * `GRANT_EVIDENCE_MONEY_STATES` for the per-state justification).
 */
export function moneyStateSupportsCreditGrant(moneyState: MoneyState): boolean {
  return GRANT_EVIDENCE_MONEY_STATES.has(moneyState);
}

export function canTransitionCreditGrantState(from: CreditGrantState, to: CreditGrantState): boolean {
  if (CREDIT_GRANT_TERMINAL_STATES.has(from)) return false;
  if (from === to) return true;
  return CREDIT_GRANT_TRANSITIONS[from].includes(to);
}

export function assertCreditGrantStateTransition(from: CreditGrantState, to: CreditGrantState): void {
  if (!canTransitionCreditGrantState(from, to)) {
    throw new Error(`Invalid credit-grant-state transition: ${from} -> ${to}.`);
  }
}
