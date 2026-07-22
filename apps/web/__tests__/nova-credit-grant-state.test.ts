import { describe, expect, it } from "vitest";
import {
  assertCreditGrantStateTransition,
  canTransitionCreditGrantState,
  isCreditGrantStateTerminal,
  moneyStateSupportsCreditGrant,
  type CreditGrantState,
  type MoneyState,
} from "@/lib/opportunity-engine";

const NON_TERMINAL: readonly CreditGrantState[] = ["approved", "activated", "partially_consumed"];
const TERMINAL: readonly CreditGrantState[] = ["exhausted", "expired", "revoked"];
const ALL_STATES: readonly CreditGrantState[] = [...NON_TERMINAL, ...TERMINAL];

describe("NOVA credit-grant state refinement (freeze §5.2)", () => {
  it("allows forward consumption one step at a time", () => {
    expect(canTransitionCreditGrantState("approved", "activated")).toBe(true);
    expect(canTransitionCreditGrantState("activated", "partially_consumed")).toBe(true);
    expect(canTransitionCreditGrantState("partially_consumed", "exhausted")).toBe(true);
  });

  it("allows a non-terminal state to restate itself", () => {
    for (const state of NON_TERMINAL) {
      expect(canTransitionCreditGrantState(state, state)).toBe(true);
    }
  });

  it("rejects backward transitions", () => {
    expect(canTransitionCreditGrantState("activated", "approved")).toBe(false);
    expect(canTransitionCreditGrantState("partially_consumed", "activated")).toBe(false);
    expect(canTransitionCreditGrantState("partially_consumed", "approved")).toBe(false);
  });

  it("rejects skipping consumption states", () => {
    expect(canTransitionCreditGrantState("approved", "partially_consumed")).toBe(false);
    expect(canTransitionCreditGrantState("approved", "exhausted")).toBe(false);
    expect(canTransitionCreditGrantState("activated", "exhausted")).toBe(false);
  });

  it("reaches expired and revoked from any non-terminal state", () => {
    for (const from of NON_TERMINAL) {
      expect(canTransitionCreditGrantState(from, "expired")).toBe(true);
      expect(canTransitionCreditGrantState(from, "revoked")).toBe(true);
    }
  });

  it("treats exhausted, expired, and revoked as absorbing terminal states", () => {
    for (const from of TERMINAL) {
      expect(isCreditGrantStateTerminal(from)).toBe(true);
      for (const to of ALL_STATES) {
        expect(canTransitionCreditGrantState(from, to)).toBe(false);
      }
    }
    for (const state of NON_TERMINAL) {
      expect(isCreditGrantStateTerminal(state)).toBe(false);
    }
  });

  it("throws a descriptive error on invalid transitions and passes on valid ones", () => {
    expect(() => assertCreditGrantStateTransition("exhausted", "activated")).toThrow(
      /invalid credit-grant-state transition: exhausted -> activated/i,
    );
    expect(() => assertCreditGrantStateTransition("approved", "activated")).not.toThrow();
  });

  it("presumes the parent opportunity moneyState is at least approved", () => {
    const supporting: readonly MoneyState[] = ["approved", "activated", "earned", "invoiced", "paid"];
    const nonSupporting: readonly MoneyState[] = [
      "not_applicable",
      "hypothetical",
      "discovered",
      "eligibility_unverified",
      "eligible",
      "applied",
      "expired",
      "rejected",
    ];
    for (const state of supporting) {
      expect(moneyStateSupportsCreditGrant(state)).toBe(true);
    }
    for (const state of nonSupporting) {
      expect(moneyStateSupportsCreditGrant(state)).toBe(false);
    }
  });
});
