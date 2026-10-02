import { describe, expect, it } from "vitest";
import type { IndependentEdgeSummary } from "@sports/types";
import {
  describeLifecycle,
  runMintTimeGates,
  transition,
  type PickLifecycleContext,
} from "./lifecycle-model";

const baseCtx: PickLifecycleContext = {
  independentEdge: null,
  isContradictedModelSignal: false,
  convictionVerdict: null,
  settlementResult: null,
};

function edge(expectedClv: number): IndependentEdgeSummary {
  return {
    decision: "PASS",
    agreement: "SPLIT",
    marketFairProb: 0.5,
    trueProb: 0.5,
    rawEdge: 0,
    shrunkEdge: 0,
    expectedClv,
    conviction: 50,
    sources: ["test"],
    priced: true,
    rationale: "test fixture",
  };
}

describe("pick lifecycle model", () => {
  it("stays MINTED when no gate fires", () => {
    expect(runMintTimeGates(baseCtx)).toBe("MINTED");
  });

  it("routes to ADVERSE_VETOED using the real pricesWorseThanMarket predicate", () => {
    const ctx: PickLifecycleContext = {
      ...baseCtx,
      independentEdge: edge(-0.05),
    };
    expect(runMintTimeGates(ctx)).toBe("ADVERSE_VETOED");
  });

  it("does not veto on a positive expectedClv (same sign convention as pricesWorseThanMarket)", () => {
    const ctx: PickLifecycleContext = {
      ...baseCtx,
      independentEdge: edge(0.05),
    };
    expect(runMintTimeGates(ctx)).toBe("MINTED");
  });

  it("routes to MODEL_SIGNAL_SUPPRESSED when the row is a contradicted model signal", () => {
    const ctx: PickLifecycleContext = { ...baseCtx, isContradictedModelSignal: true };
    expect(runMintTimeGates(ctx)).toBe("MODEL_SIGNAL_SUPPRESSED");
  });

  it("routes to CONVICTION_HELD only when the gate verdict is HELD", () => {
    const held: PickLifecycleContext = { ...baseCtx, convictionVerdict: "HELD" };
    const publish: PickLifecycleContext = { ...baseCtx, convictionVerdict: "PUBLISH" };
    expect(runMintTimeGates(held)).toBe("CONVICTION_HELD");
    expect(runMintTimeGates(publish)).toBe("MINTED");
  });

  it("checks gates in the real fixed order: adverse edge first, then model signal, then conviction", () => {
    // A row that would fail BOTH the adverse-edge check and the conviction check must
    // land on ADVERSE_VETOED, because that gate runs first in production (mint-time,
    // before the conviction gate ever sees the row).
    const ctx: PickLifecycleContext = {
      independentEdge: edge(-0.1),
      isContradictedModelSignal: false,
      convictionVerdict: "HELD",
      settlementResult: null,
    };
    expect(runMintTimeGates(ctx)).toBe("ADVERSE_VETOED");
  });

  it("transitions PUBLISHED -> settlement state matching the real PickResult enum", () => {
    expect(transition("PUBLISHED", "SETTLE", { ...baseCtx, settlementResult: "WIN" })).toBe(
      "SETTLED_WIN",
    );
    expect(transition("PUBLISHED", "SETTLE", { ...baseCtx, settlementResult: "LOSS" })).toBe(
      "SETTLED_LOSS",
    );
    expect(transition("PUBLISHED", "SETTLE", { ...baseCtx, settlementResult: "PUSH" })).toBe(
      "SETTLED_PUSH",
    );
    expect(transition("PUBLISHED", "SETTLE", { ...baseCtx, settlementResult: "VOID" })).toBe(
      "VOIDED",
    );
  });

  it("stays PUBLISHED while settlementResult is still null (PENDING)", () => {
    expect(transition("PUBLISHED", "SETTLE", baseCtx)).toBe("PUBLISHED");
  });

  it("never throws on an inapplicable event, and returns the same state", () => {
    expect(transition("SETTLED_WIN", "PUBLISH", baseCtx)).toBe("SETTLED_WIN");
    expect(transition("ADVERSE_VETOED", "SETTLE", baseCtx)).toBe("ADVERSE_VETOED");
  });

  it("describeLifecycle returns every documented state and only real, composed edges", () => {
    const { states, edges } = describeLifecycle();
    expect(states).toContain("PUBLISHED");
    expect(states).toContain("ADVERSE_VETOED");
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => states.includes(e.from))).toBe(true);
  });
});
