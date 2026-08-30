/**
 * NOVA credit vocabulary — S1 deterministic state machines (directive §11.1).
 *
 * Five NOVA-owned machines decompose the single broad `MoneyState` into
 * exact per-entity vocabularies:
 *
 *   `CreditProgramState`     — the provider's credit program itself
 *   `CreditApplicationState` — one application NOVA files against a program
 *   `CreditGrantState`       — one awarded grant (machine lives in
 *                              `lifecycle.ts`; list + adapter live here)
 *   `CreditBalanceState`     — the observed provider-side balance of a grant
 *   `CreditAllocationState`  — one earmarked slice of a grant's balance
 *
 * Every machine is pure and deterministic: an explicit exhaustive transition
 * map, a `canTransition*` guard, an `assert*Transition` thrower, and a
 * terminal predicate DERIVED from the map (a state with zero outgoing
 * transitions is terminal and absorbing). Self-transitions — the idempotent
 * restatement of an observation — are allowed on non-terminal states only,
 * matching the existing `CreditGrantState` machine in `lifecycle.ts`.
 *
 * MAPPING TO `MoneyState` — EXPLICIT, ONE-WAY, NOT INTERCHANGEABLE.
 * Each machine exports a `*ToMoneyState` adapter returning the MONEY-STATE
 * CEILING: the maximum `MoneyState` the credit-domain fact ALONE can justify
 * for the parent opportunity. The vocabularies must never be treated as
 * interchangeable because:
 *
 *   1. `MoneyState` continues into `earned`/`invoiced`/`paid`; credits are
 *      cost avoidance, never receivables — no credit machine can represent
 *      invoicing or payment, so a reverse mapping cannot exist.
 *   2. The credit machines carry consumption/reservation/operational
 *      granularity (`partially_consumed`, `reserved`, `provisional`,
 *      `disputed`, `frozen`) that `MoneyState` deliberately collapses — the
 *      forward mapping is lossy and therefore not invertible.
 *   3. Advancing an opportunity's `moneyState` requires additional recorded
 *      evidence (see `canTransitionMoneyState` in `lifecycle.ts`): a credit
 *      fact CAPS the defensible money state; it never advances it by itself.
 *
 * Tested invariant: a NON-terminal credit state never maps to a terminal
 * `MoneyState`, so a live credit entity can never imply a dead opportunity.
 */

import type {
  CreditAllocationState,
  CreditApplicationState,
  CreditBalanceState,
  CreditGrantState,
  CreditProgramState,
  MoneyState,
} from "./types";

interface CreditStateMachine<S extends string> {
  readonly states: readonly S[];
  readonly terminalStates: ReadonlySet<S>;
  readonly canTransition: (from: S, to: S) => boolean;
  readonly assertTransition: (from: S, to: S) => void;
  readonly isTerminal: (state: S) => boolean;
}

/**
 * Builds guard/assert/terminal helpers from an exhaustive transition map.
 * Terminality is derived, not declared: a state with no outgoing transitions
 * is terminal and absorbing (no self-restatement either), so a map edit can
 * never leave the predicate and the map disagreeing.
 */
function defineCreditStateMachine<S extends string>(
  machineName: string,
  transitions: Readonly<Record<S, readonly S[]>>,
): CreditStateMachine<S> {
  const states = Object.keys(transitions) as S[];
  const terminalStates: ReadonlySet<S> = new Set(
    states.filter((state) => transitions[state].length === 0),
  );
  const isTerminal = (state: S): boolean => terminalStates.has(state);
  const canTransition = (from: S, to: S): boolean => {
    if (terminalStates.has(from)) return false;
    if (from === to) return true;
    return transitions[from].includes(to);
  };
  const assertTransition = (from: S, to: S): void => {
    if (!canTransition(from, to)) {
      throw new Error(`Invalid ${machineName} transition: ${from} -> ${to}.`);
    }
  };
  return { states, terminalStates, canTransition, assertTransition, isTerminal };
}

// ─────────────────────────────────────────────────────────────────────────────
// CreditProgramState
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact transition map for `CreditProgramState`. `closed -> open` models
 * window-based programs that reopen; only `discontinued` is terminal.
 */
export const CREDIT_PROGRAM_STATE_TRANSITIONS: Readonly<
  Record<CreditProgramState, readonly CreditProgramState[]>
> = {
  announced: ["open", "discontinued"],
  open: ["suspended", "closed", "discontinued"],
  suspended: ["open", "closed", "discontinued"],
  closed: ["open", "discontinued"],
  discontinued: [],
};

const programMachine = defineCreditStateMachine(
  "credit-program-state",
  CREDIT_PROGRAM_STATE_TRANSITIONS,
);

export const CREDIT_PROGRAM_STATES: readonly CreditProgramState[] = programMachine.states;

export function canTransitionCreditProgramState(
  from: CreditProgramState,
  to: CreditProgramState,
): boolean {
  return programMachine.canTransition(from, to);
}

export function assertCreditProgramStateTransition(
  from: CreditProgramState,
  to: CreditProgramState,
): void {
  programMachine.assertTransition(from, to);
}

export function isCreditProgramStateTerminal(state: CreditProgramState): boolean {
  return programMachine.isTerminal(state);
}

// ─────────────────────────────────────────────────────────────────────────────
// CreditApplicationState
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact transition map for `CreditApplicationState`. Forward one step at a
 * time (no skipping proof-bearing states, mirroring `canTransitionMoneyState`
 * in `lifecycle.ts`); `rejected`/`expired` reachable from any non-terminal
 * state; `approved` is the SUCCESS terminal that hands off to
 * `CreditGrantState`.
 */
export const CREDIT_APPLICATION_STATE_TRANSITIONS: Readonly<
  Record<CreditApplicationState, readonly CreditApplicationState[]>
> = {
  discovered: ["eligibility_unverified", "rejected", "expired"],
  eligibility_unverified: ["eligible", "rejected", "expired"],
  eligible: ["applied", "rejected", "expired"],
  applied: ["approved", "rejected", "expired"],
  approved: [],
  rejected: [],
  expired: [],
};

const applicationMachine = defineCreditStateMachine(
  "credit-application-state",
  CREDIT_APPLICATION_STATE_TRANSITIONS,
);

export const CREDIT_APPLICATION_STATES: readonly CreditApplicationState[] =
  applicationMachine.states;

export function canTransitionCreditApplicationState(
  from: CreditApplicationState,
  to: CreditApplicationState,
): boolean {
  return applicationMachine.canTransition(from, to);
}

export function assertCreditApplicationStateTransition(
  from: CreditApplicationState,
  to: CreditApplicationState,
): void {
  applicationMachine.assertTransition(from, to);
}

export function isCreditApplicationStateTerminal(state: CreditApplicationState): boolean {
  return applicationMachine.isTerminal(state);
}

// ─────────────────────────────────────────────────────────────────────────────
// CreditGrantState — machine lives in lifecycle.ts; the exhaustive state list
// and the MoneyState adapter live here so PR-D can enumerate without
// re-declaring the vocabulary.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exhaustive `CreditGrantState` list. The `satisfies Record<CreditGrantState,
 * true>` clause makes this a compile error the moment the union in `types.ts`
 * gains or loses a member.
 */
export const CREDIT_GRANT_STATES: readonly CreditGrantState[] = Object.keys({
  approved: true,
  activated: true,
  partially_consumed: true,
  exhausted: true,
  expired: true,
  revoked: true,
} satisfies Record<CreditGrantState, true>) as CreditGrantState[];

// ─────────────────────────────────────────────────────────────────────────────
// CreditBalanceState
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact transition map for `CreditBalanceState`. `frozen` is the reversible
 * provider hold; depletion can only be observed from `active` (a frozen
 * balance cannot burn down); `depleted`/`expired`/`revoked` are terminal.
 */
export const CREDIT_BALANCE_STATE_TRANSITIONS: Readonly<
  Record<CreditBalanceState, readonly CreditBalanceState[]>
> = {
  provisioned: ["active", "expired", "revoked"],
  active: ["frozen", "depleted", "expired", "revoked"],
  frozen: ["active", "expired", "revoked"],
  depleted: [],
  expired: [],
  revoked: [],
};

const balanceMachine = defineCreditStateMachine(
  "credit-balance-state",
  CREDIT_BALANCE_STATE_TRANSITIONS,
);

export const CREDIT_BALANCE_STATES: readonly CreditBalanceState[] = balanceMachine.states;

export function canTransitionCreditBalanceState(
  from: CreditBalanceState,
  to: CreditBalanceState,
): boolean {
  return balanceMachine.canTransition(from, to);
}

export function assertCreditBalanceStateTransition(
  from: CreditBalanceState,
  to: CreditBalanceState,
): void {
  balanceMachine.assertTransition(from, to);
}

export function isCreditBalanceStateTerminal(state: CreditBalanceState): boolean {
  return balanceMachine.isTerminal(state);
}

// ─────────────────────────────────────────────────────────────────────────────
// CreditAllocationState
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact transition map for `CreditAllocationState`. "No atomic reservation,
 * no activation" (directive §11.2) is structural here: `provisional` (usage
 * observed) is reachable ONLY from `reserved`. `applied_confirmed` is
 * absorbing except for a post-confirmation `disputed` reopening; `released`
 * is the sole terminal state (the slice returned to the pool).
 */
export const CREDIT_ALLOCATION_STATE_TRANSITIONS: Readonly<
  Record<CreditAllocationState, readonly CreditAllocationState[]>
> = {
  available: ["reserved", "released"],
  reserved: ["provisional", "released"],
  provisional: ["applied_confirmed", "disputed", "released"],
  applied_confirmed: ["disputed"],
  released: [],
  disputed: ["applied_confirmed", "released"],
};

const allocationMachine = defineCreditStateMachine(
  "credit-allocation-state",
  CREDIT_ALLOCATION_STATE_TRANSITIONS,
);

export const CREDIT_ALLOCATION_STATES: readonly CreditAllocationState[] =
  allocationMachine.states;

export function canTransitionCreditAllocationState(
  from: CreditAllocationState,
  to: CreditAllocationState,
): boolean {
  return allocationMachine.canTransition(from, to);
}

export function assertCreditAllocationStateTransition(
  from: CreditAllocationState,
  to: CreditAllocationState,
): void {
  allocationMachine.assertTransition(from, to);
}

export function isCreditAllocationStateTerminal(state: CreditAllocationState): boolean {
  return allocationMachine.isTerminal(state);
}

// ─────────────────────────────────────────────────────────────────────────────
// Explicit MoneyState adapters (money-state CEILINGS — see module doc)
// ─────────────────────────────────────────────────────────────────────────────

const CREDIT_PROGRAM_STATE_MONEY_CEILING: Readonly<Record<CreditProgramState, MoneyState>> = {
  announced: "hypothetical",
  open: "discovered",
  suspended: "discovered",
  closed: "discovered",
  discontinued: "expired",
};

/**
 * Money-state CEILING a program state alone justifies. A program merely
 * existing (even `open`) caps the parent opportunity at `"discovered"` —
 * eligibility, application, and award all require their own evidence.
 * `closed`/`suspended` stay at `"discovered"` (not `"expired"`) because both
 * are reversible while `MoneyState.expired` is terminal; only the terminal
 * `discontinued` maps to the terminal `"expired"`.
 */
export function creditProgramStateToMoneyState(state: CreditProgramState): MoneyState {
  return CREDIT_PROGRAM_STATE_MONEY_CEILING[state];
}

const CREDIT_APPLICATION_STATE_MONEY_CEILING: Readonly<
  Record<CreditApplicationState, MoneyState>
> = {
  discovered: "discovered",
  eligibility_unverified: "eligibility_unverified",
  eligible: "eligible",
  applied: "applied",
  approved: "approved",
  rejected: "rejected",
  expired: "expired",
};

/**
 * Money-state CEILING an application state alone justifies. The words
 * coincide by design, but the machines are NOT interchangeable: this
 * machine's `approved` is a success TERMINAL (handing off to
 * `CreditGrantState`), while `MoneyState.approved` continues toward
 * activation/earning — a mapped value must never be written back as if it
 * were the application state.
 */
export function creditApplicationStateToMoneyState(state: CreditApplicationState): MoneyState {
  return CREDIT_APPLICATION_STATE_MONEY_CEILING[state];
}

const CREDIT_GRANT_STATE_MONEY_CEILING: Readonly<Record<CreditGrantState, MoneyState>> = {
  approved: "approved",
  activated: "activated",
  partially_consumed: "earned",
  exhausted: "earned",
  expired: "expired",
  revoked: "rejected",
};

/**
 * Money-state CEILING a grant state alone justifies. Consumption realizes
 * cost-avoidance value, so `partially_consumed`/`exhausted` cap at
 * `"earned"` — never `"invoiced"`/`"paid"`, which are receivable states with
 * no credit-domain counterpart. The consumption granularity
 * (`partially_consumed` vs `exhausted`) collapses in the mapping, which is
 * why it cannot be inverted.
 */
export function creditGrantStateToMoneyState(state: CreditGrantState): MoneyState {
  return CREDIT_GRANT_STATE_MONEY_CEILING[state];
}

const CREDIT_BALANCE_STATE_MONEY_CEILING: Readonly<Record<CreditBalanceState, MoneyState>> = {
  provisioned: "approved",
  active: "activated",
  frozen: "activated",
  depleted: "earned",
  expired: "expired",
  revoked: "rejected",
};

/**
 * Money-state CEILING a balance state alone justifies. `frozen` maps to
 * `"activated"` — NOT a regression — because `MoneyState` has no reversible
 * suspension vocabulary and money states may not move backward; the
 * operational hold lives only in `CreditBalanceState`, which is precisely why
 * the two vocabularies cannot be interchanged.
 */
export function creditBalanceStateToMoneyState(state: CreditBalanceState): MoneyState {
  return CREDIT_BALANCE_STATE_MONEY_CEILING[state];
}

const CREDIT_ALLOCATION_STATE_MONEY_CEILING: Readonly<
  Record<CreditAllocationState, MoneyState>
> = {
  available: "activated",
  reserved: "activated",
  provisional: "activated",
  applied_confirmed: "earned",
  released: "activated",
  disputed: "activated",
};

/**
 * Money-state CEILING an allocation state alone justifies. An allocation
 * exists only inside an activated grant, so everything short of a provider
 * CONFIRMATION caps at `"activated"`; only `applied_confirmed` justifies
 * `"earned"`. `reserved`/`provisional`/`disputed` collapse into
 * `"activated"` because `MoneyState` cannot represent reservation or dispute
 * semantics at all — the defining reason this vocabulary exists separately.
 */
export function creditAllocationStateToMoneyState(state: CreditAllocationState): MoneyState {
  return CREDIT_ALLOCATION_STATE_MONEY_CEILING[state];
}
