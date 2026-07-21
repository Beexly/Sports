import type { MoneyState, OpportunityLifecycleState } from "./types";

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
