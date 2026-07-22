import { describe, expect, it } from "vitest";
import {
  CREDIT_ALLOCATION_STATES,
  CREDIT_APPLICATION_STATES,
  CREDIT_BALANCE_STATES,
  CREDIT_GRANT_STATES,
  CREDIT_PROGRAM_STATES,
  assertCreditAllocationStateTransition,
  assertCreditApplicationStateTransition,
  assertCreditBalanceStateTransition,
  assertCreditProgramStateTransition,
  assertMoneyStateTransition,
  canTransitionCreditAllocationState,
  canTransitionCreditApplicationState,
  canTransitionCreditBalanceState,
  canTransitionCreditGrantState,
  canTransitionCreditProgramState,
  canTransitionMoneyState,
  creditAllocationStateToMoneyState,
  creditApplicationStateToMoneyState,
  creditBalanceStateToMoneyState,
  creditGrantStateToMoneyState,
  creditProgramStateToMoneyState,
  isCreditAllocationStateTerminal,
  isCreditApplicationStateTerminal,
  isCreditBalanceStateTerminal,
  isCreditGrantStateTerminal,
  isCreditProgramStateTerminal,
  moneyStateSupportsCreditGrant,
  type CreditAllocationState,
  type CreditApplicationState,
  type CreditBalanceState,
  type CreditGrantState,
  type CreditProgramState,
  type MoneyState,
} from "@/lib/opportunity-engine";

/**
 * PROVENANCE. Directive §11.1 supplies the five credit vocabulary NAMES and
 * minimum state LISTS for the application/grant/allocation machines only; it
 * specifies no transition matrices, and no states at all for the
 * program/balance machines. The state lists asserted below therefore carry
 * spec authority where §11.1 defines them, while every transition EDGE (e.g.
 * closed -> open reopening, frozen semantics, applied_confirmed -> disputed,
 * released as the sole allocation terminal) is this unit's own design
 * decision, documented in credit.ts. Each expected matrix is typed out here
 * independently rather than imported from the module under test, so a
 * drifting transition map fails these tests instead of silently re-deriving
 * them. Shared machine rules: self-transition (idempotent restatement)
 * allowed on non-terminal states only; a terminal state is absorbing.
 */
function checkExactMatrix<S extends string>(
  states: readonly S[],
  expectedProper: Readonly<Record<S, readonly S[]>>,
  expectedTerminal: readonly S[],
  canTransition: (from: S, to: S) => boolean,
): void {
  const terminal = new Set(expectedTerminal);
  for (const from of states) {
    for (const to of states) {
      const expected = terminal.has(from)
        ? false
        : from === to
          ? true
          : expectedProper[from].includes(to);
      expect(canTransition(from, to), `${from} -> ${to}`).toBe(expected);
    }
  }
}

const ALL_MONEY_STATES: readonly MoneyState[] = [
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
  "expired",
  "rejected",
];

/** Absorbing `MoneyState`s (see `canTransitionMoneyState` in lifecycle.ts). */
const TERMINAL_MONEY_STATES: ReadonlySet<MoneyState> = new Set(["paid", "expired", "rejected"]);

describe("MoneyState machine — exhaustive matrix (lifecycle.ts)", () => {
  // Forward-only, no skipping: each non-terminal state may advance one step
  // along MONEY_STATE_ORDER or fall to rejected/expired; paid, rejected, and
  // expired are absorbing terminals with no outgoing edges at all.
  const EXPECTED: Readonly<Record<MoneyState, readonly MoneyState[]>> = {
    not_applicable: ["hypothetical", "rejected", "expired"],
    hypothetical: ["discovered", "rejected", "expired"],
    discovered: ["eligibility_unverified", "rejected", "expired"],
    eligibility_unverified: ["eligible", "rejected", "expired"],
    eligible: ["applied", "rejected", "expired"],
    applied: ["approved", "rejected", "expired"],
    approved: ["activated", "rejected", "expired"],
    activated: ["earned", "rejected", "expired"],
    earned: ["invoiced", "rejected", "expired"],
    invoiced: ["paid", "rejected", "expired"],
    paid: [],
    rejected: [],
    expired: [],
  };

  it("matches the exact transition matrix", () => {
    checkExactMatrix(ALL_MONEY_STATES, EXPECTED, [...TERMINAL_MONEY_STATES], canTransitionMoneyState);
  });

  it("keeps terminal states absorbing — a terminal cause can never be rewritten", () => {
    expect(canTransitionMoneyState("rejected", "expired")).toBe(false);
    expect(canTransitionMoneyState("expired", "rejected")).toBe(false);
    expect(canTransitionMoneyState("rejected", "rejected")).toBe(false);
    expect(canTransitionMoneyState("expired", "expired")).toBe(false);
    expect(canTransitionMoneyState("paid", "paid")).toBe(false);
    expect(canTransitionMoneyState("paid", "rejected")).toBe(false);
    expect(canTransitionMoneyState("paid", "expired")).toBe(false);
  });

  it("throws a descriptive error on invalid transitions and passes on valid ones", () => {
    expect(() => assertMoneyStateTransition("rejected", "expired")).toThrow(
      /invalid money-state transition: rejected -> expired/i,
    );
    expect(() => assertMoneyStateTransition("invoiced", "paid")).not.toThrow();
  });
});

describe("NOVA credit-program state machine (directive §11.1)", () => {
  const EXPECTED: Readonly<Record<CreditProgramState, readonly CreditProgramState[]>> = {
    announced: ["open", "discontinued"],
    open: ["suspended", "closed", "discontinued"],
    suspended: ["open", "closed", "discontinued"],
    closed: ["open", "discontinued"],
    discontinued: [],
  };
  const TERMINAL: readonly CreditProgramState[] = ["discontinued"];

  it("exports the exhaustive state list", () => {
    expect([...CREDIT_PROGRAM_STATES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("matches the exact transition matrix", () => {
    checkExactMatrix(CREDIT_PROGRAM_STATES, EXPECTED, TERMINAL, canTransitionCreditProgramState);
  });

  it("derives terminality from the map", () => {
    for (const state of CREDIT_PROGRAM_STATES) {
      expect(isCreditProgramStateTerminal(state), state).toBe(TERMINAL.includes(state));
    }
  });

  it("allows a closed application window to reopen but never a discontinued program", () => {
    expect(canTransitionCreditProgramState("closed", "open")).toBe(true);
    expect(canTransitionCreditProgramState("discontinued", "open")).toBe(false);
  });

  it("throws a descriptive error on invalid transitions and passes on valid ones", () => {
    expect(() => assertCreditProgramStateTransition("discontinued", "open")).toThrow(
      /invalid credit-program-state transition: discontinued -> open/i,
    );
    expect(() => assertCreditProgramStateTransition("announced", "open")).not.toThrow();
  });
});

describe("NOVA credit-application state machine (directive §11.1)", () => {
  const EXPECTED: Readonly<Record<CreditApplicationState, readonly CreditApplicationState[]>> = {
    discovered: ["eligibility_unverified", "rejected", "expired"],
    eligibility_unverified: ["eligible", "rejected", "expired"],
    eligible: ["applied", "rejected", "expired"],
    applied: ["approved", "rejected", "expired"],
    approved: [],
    rejected: [],
    expired: [],
  };
  const TERMINAL: readonly CreditApplicationState[] = ["approved", "rejected", "expired"];

  it("exports the exhaustive state list", () => {
    expect([...CREDIT_APPLICATION_STATES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("matches the exact transition matrix", () => {
    checkExactMatrix(
      CREDIT_APPLICATION_STATES,
      EXPECTED,
      TERMINAL,
      canTransitionCreditApplicationState,
    );
  });

  it("derives terminality from the map", () => {
    for (const state of CREDIT_APPLICATION_STATES) {
      expect(isCreditApplicationStateTerminal(state), state).toBe(TERMINAL.includes(state));
    }
  });

  it("never skips a proof-bearing state on the forward chain", () => {
    expect(canTransitionCreditApplicationState("discovered", "eligible")).toBe(false);
    expect(canTransitionCreditApplicationState("discovered", "applied")).toBe(false);
    expect(canTransitionCreditApplicationState("discovered", "approved")).toBe(false);
    expect(canTransitionCreditApplicationState("eligible", "approved")).toBe(false);
  });

  it("treats approved as a success terminal — the grant machine takes over", () => {
    expect(isCreditApplicationStateTerminal("approved")).toBe(true);
    expect(moneyStateSupportsCreditGrant(creditApplicationStateToMoneyState("approved"))).toBe(
      true,
    );
  });

  it("throws a descriptive error on invalid transitions and passes on valid ones", () => {
    expect(() => assertCreditApplicationStateTransition("approved", "applied")).toThrow(
      /invalid credit-application-state transition: approved -> applied/i,
    );
    expect(() => assertCreditApplicationStateTransition("applied", "approved")).not.toThrow();
  });
});

describe("NOVA credit-grant state machine — exhaustive matrix (directive §11.1)", () => {
  const EXPECTED: Readonly<Record<CreditGrantState, readonly CreditGrantState[]>> = {
    approved: ["activated", "expired", "revoked"],
    activated: ["partially_consumed", "expired", "revoked"],
    partially_consumed: ["exhausted", "expired", "revoked"],
    exhausted: [],
    expired: [],
    revoked: [],
  };
  const TERMINAL: readonly CreditGrantState[] = ["exhausted", "expired", "revoked"];

  it("exports the exhaustive state list", () => {
    expect([...CREDIT_GRANT_STATES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("matches the exact transition matrix", () => {
    checkExactMatrix(CREDIT_GRANT_STATES, EXPECTED, TERMINAL, canTransitionCreditGrantState);
  });

  it("derives terminality consistently with lifecycle.ts", () => {
    for (const state of CREDIT_GRANT_STATES) {
      expect(isCreditGrantStateTerminal(state), state).toBe(TERMINAL.includes(state));
    }
  });
});

describe("NOVA credit-balance state machine (directive §11.1)", () => {
  const EXPECTED: Readonly<Record<CreditBalanceState, readonly CreditBalanceState[]>> = {
    provisioned: ["active", "expired", "revoked"],
    active: ["frozen", "depleted", "expired", "revoked"],
    frozen: ["active", "expired", "revoked"],
    depleted: [],
    expired: [],
    revoked: [],
  };
  const TERMINAL: readonly CreditBalanceState[] = ["depleted", "expired", "revoked"];

  it("exports the exhaustive state list", () => {
    expect([...CREDIT_BALANCE_STATES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("matches the exact transition matrix", () => {
    checkExactMatrix(CREDIT_BALANCE_STATES, EXPECTED, TERMINAL, canTransitionCreditBalanceState);
  });

  it("derives terminality from the map", () => {
    for (const state of CREDIT_BALANCE_STATES) {
      expect(isCreditBalanceStateTerminal(state), state).toBe(TERMINAL.includes(state));
    }
  });

  it("cannot observe depletion of a frozen or merely provisioned balance", () => {
    expect(canTransitionCreditBalanceState("frozen", "depleted")).toBe(false);
    expect(canTransitionCreditBalanceState("provisioned", "depleted")).toBe(false);
    expect(canTransitionCreditBalanceState("active", "depleted")).toBe(true);
  });

  it("throws a descriptive error on invalid transitions and passes on valid ones", () => {
    expect(() => assertCreditBalanceStateTransition("depleted", "active")).toThrow(
      /invalid credit-balance-state transition: depleted -> active/i,
    );
    expect(() => assertCreditBalanceStateTransition("frozen", "active")).not.toThrow();
  });
});

describe("NOVA credit-allocation state machine (directive §11.1)", () => {
  const EXPECTED: Readonly<Record<CreditAllocationState, readonly CreditAllocationState[]>> = {
    available: ["reserved", "released"],
    reserved: ["provisional", "released"],
    provisional: ["applied_confirmed", "disputed", "released"],
    applied_confirmed: ["disputed"],
    released: [],
    disputed: ["applied_confirmed", "released"],
  };
  const TERMINAL: readonly CreditAllocationState[] = ["released"];

  it("exports the exhaustive state list", () => {
    expect([...CREDIT_ALLOCATION_STATES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("matches the exact transition matrix", () => {
    checkExactMatrix(
      CREDIT_ALLOCATION_STATES,
      EXPECTED,
      TERMINAL,
      canTransitionCreditAllocationState,
    );
  });

  it("derives terminality from the map", () => {
    for (const state of CREDIT_ALLOCATION_STATES) {
      expect(isCreditAllocationStateTerminal(state), state).toBe(TERMINAL.includes(state));
    }
  });

  it("enforces 'no atomic reservation, no activation' structurally (directive §11.2)", () => {
    expect(canTransitionCreditAllocationState("available", "provisional")).toBe(false);
    expect(canTransitionCreditAllocationState("available", "applied_confirmed")).toBe(false);
    expect(canTransitionCreditAllocationState("reserved", "applied_confirmed")).toBe(false);
    expect(canTransitionCreditAllocationState("reserved", "provisional")).toBe(true);
  });

  it("lets a confirmed application reopen only through dispute, never released directly", () => {
    expect(canTransitionCreditAllocationState("applied_confirmed", "disputed")).toBe(true);
    expect(canTransitionCreditAllocationState("applied_confirmed", "released")).toBe(false);
    expect(canTransitionCreditAllocationState("disputed", "released")).toBe(true);
    expect(canTransitionCreditAllocationState("disputed", "applied_confirmed")).toBe(true);
  });

  it("throws a descriptive error on invalid transitions and passes on valid ones", () => {
    expect(() => assertCreditAllocationStateTransition("released", "reserved")).toThrow(
      /invalid credit-allocation-state transition: released -> reserved/i,
    );
    expect(() => assertCreditAllocationStateTransition("available", "reserved")).not.toThrow();
  });
});

describe("NOVA credit -> MoneyState ceiling adapters (directive §11.1: explicit, not interchangeable)", () => {
  it("maps every credit-program state to the documented ceiling", () => {
    const expected: Readonly<Record<CreditProgramState, MoneyState>> = {
      announced: "hypothetical",
      open: "discovered",
      suspended: "discovered",
      closed: "discovered",
      discontinued: "expired",
    };
    for (const state of CREDIT_PROGRAM_STATES) {
      expect(creditProgramStateToMoneyState(state), state).toBe(expected[state]);
    }
  });

  it("maps every credit-application state to the documented ceiling", () => {
    const expected: Readonly<Record<CreditApplicationState, MoneyState>> = {
      discovered: "discovered",
      eligibility_unverified: "eligibility_unverified",
      eligible: "eligible",
      applied: "applied",
      approved: "approved",
      rejected: "rejected",
      expired: "expired",
    };
    for (const state of CREDIT_APPLICATION_STATES) {
      expect(creditApplicationStateToMoneyState(state), state).toBe(expected[state]);
    }
  });

  it("maps every credit-grant state to the documented ceiling — consumption caps at earned, never invoiced/paid", () => {
    const expected: Readonly<Record<CreditGrantState, MoneyState>> = {
      approved: "approved",
      activated: "activated",
      partially_consumed: "earned",
      exhausted: "earned",
      expired: "expired",
      revoked: "rejected",
    };
    for (const state of CREDIT_GRANT_STATES) {
      expect(creditGrantStateToMoneyState(state), state).toBe(expected[state]);
    }
  });

  it("maps every credit-balance state to the documented ceiling — frozen is not a money regression", () => {
    const expected: Readonly<Record<CreditBalanceState, MoneyState>> = {
      provisioned: "approved",
      active: "activated",
      frozen: "activated",
      depleted: "earned",
      expired: "expired",
      revoked: "rejected",
    };
    for (const state of CREDIT_BALANCE_STATES) {
      expect(creditBalanceStateToMoneyState(state), state).toBe(expected[state]);
    }
  });

  it("maps every credit-allocation state to the documented ceiling — only provider confirmation justifies earned", () => {
    const expected: Readonly<Record<CreditAllocationState, MoneyState>> = {
      available: "activated",
      reserved: "activated",
      provisional: "activated",
      applied_confirmed: "earned",
      released: "activated",
      disputed: "activated",
    };
    for (const state of CREDIT_ALLOCATION_STATES) {
      expect(creditAllocationStateToMoneyState(state), state).toBe(expected[state]);
    }
  });

  it("adapters are total over each machine and land inside the MoneyState vocabulary", () => {
    const memberships: readonly MoneyState[] = [
      ...CREDIT_PROGRAM_STATES.map(creditProgramStateToMoneyState),
      ...CREDIT_APPLICATION_STATES.map(creditApplicationStateToMoneyState),
      ...CREDIT_GRANT_STATES.map(creditGrantStateToMoneyState),
      ...CREDIT_BALANCE_STATES.map(creditBalanceStateToMoneyState),
      ...CREDIT_ALLOCATION_STATES.map(creditAllocationStateToMoneyState),
    ];
    for (const mapped of memberships) {
      expect(ALL_MONEY_STATES).toContain(mapped);
    }
  });

  it("a live (non-terminal) credit state never maps to a terminal MoneyState", () => {
    for (const state of CREDIT_PROGRAM_STATES) {
      if (!isCreditProgramStateTerminal(state)) {
        expect(TERMINAL_MONEY_STATES.has(creditProgramStateToMoneyState(state)), state).toBe(false);
      }
    }
    for (const state of CREDIT_APPLICATION_STATES) {
      if (!isCreditApplicationStateTerminal(state)) {
        expect(TERMINAL_MONEY_STATES.has(creditApplicationStateToMoneyState(state)), state).toBe(
          false,
        );
      }
    }
    for (const state of CREDIT_GRANT_STATES) {
      if (!isCreditGrantStateTerminal(state)) {
        expect(TERMINAL_MONEY_STATES.has(creditGrantStateToMoneyState(state)), state).toBe(false);
      }
    }
    for (const state of CREDIT_BALANCE_STATES) {
      if (!isCreditBalanceStateTerminal(state)) {
        expect(TERMINAL_MONEY_STATES.has(creditBalanceStateToMoneyState(state)), state).toBe(false);
      }
    }
    for (const state of CREDIT_ALLOCATION_STATES) {
      if (!isCreditAllocationStateTerminal(state)) {
        expect(TERMINAL_MONEY_STATES.has(creditAllocationStateToMoneyState(state)), state).toBe(
          false,
        );
      }
    }
  });
});
