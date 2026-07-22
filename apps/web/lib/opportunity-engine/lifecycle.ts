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
  if (to === "rejected" || to === "expired") return from !== "paid";
  if (from === "rejected" || from === "expired" || from === "paid") return false;
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
 * pattern: forward-only consumption with no state skipping, terminal states
 * absorbing, and `expired`/`revoked` reachable from any non-terminal state.
 *
 * The sibling credit machines (program/application/balance/allocation) and
 * the explicit `CreditGrantState -> MoneyState` ceiling adapter live in
 * `credit.ts` (directive §11.1); the receipted `CreditGrantSnapshot`
 * contract lives in `credit-snapshot.ts` (§11.2).
 */
const CREDIT_GRANT_CONSUMPTION_ORDER: readonly CreditGrantState[] = [
  "approved",
  "activated",
  "partially_consumed",
  "exhausted",
];

const CREDIT_GRANT_TERMINAL_STATES: ReadonlySet<CreditGrantState> = new Set([
  "exhausted",
  "expired",
  "revoked",
]);

export function isCreditGrantStateTerminal(state: CreditGrantState): boolean {
  return CREDIT_GRANT_TERMINAL_STATES.has(state);
}

/**
 * A credit grant may exist (in any `CreditGrantState`) only while its parent
 * opportunity's `moneyState` has reached at least `"approved"` in
 * `MONEY_STATE_ORDER`. Terminal money states (`expired`/`rejected`) and every
 * pre-approval state cannot carry a live grant sub-state.
 */
export function moneyStateSupportsCreditGrant(moneyState: MoneyState): boolean {
  const approvedIndex = MONEY_STATE_ORDER.indexOf("approved");
  const index = MONEY_STATE_ORDER.indexOf(moneyState);
  return index >= approvedIndex;
}

export function canTransitionCreditGrantState(from: CreditGrantState, to: CreditGrantState): boolean {
  if (CREDIT_GRANT_TERMINAL_STATES.has(from)) return false;
  if (to === "expired" || to === "revoked") return true;
  if (from === to) return true;
  const fromIndex = CREDIT_GRANT_CONSUMPTION_ORDER.indexOf(from);
  const toIndex = CREDIT_GRANT_CONSUMPTION_ORDER.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return false;
  // Do not skip consumption states: a grant cannot become exhausted without
  // first recording activation and partial consumption evidence.
  return toIndex === fromIndex + 1;
}

export function assertCreditGrantStateTransition(from: CreditGrantState, to: CreditGrantState): void {
  if (!canTransitionCreditGrantState(from, to)) {
    throw new Error(`Invalid credit-grant-state transition: ${from} -> ${to}.`);
  }
}
