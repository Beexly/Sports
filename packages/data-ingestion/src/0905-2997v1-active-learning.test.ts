/**
 * Tests for ./0905-2997v1-active-learning (arXiv:0905.2997v1, lane=active_learning).
 *
 * ACCEPTANCE GATE: ADOPT the Delta/c rule iff it beats cost-blind greedy Delta at equal dollar budget by >= 0.005
 * held-out log-loss on the 2024 holdout, with the gain replicated when costs are re-randomized.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./0905-2997v1-active-learning";

describe("info-per-cost active learning (arXiv:0905.2997v1)", () => {
  it("scores delta over cost", () => {
    expect(mod.infoPerCostScore(10, 5)).toBeCloseTo(2, 10);
    expect(mod.infoPerCostScore(10, 5, 2)).toBeCloseTo(4, 10);
    expect(mod.infoPerCostScore(10, 0)).toBeNull();
    expect(mod.infoPerCostScore(-1, 5)).toBeNull();
    expect(mod.infoPerCostScore(10, 5, -1)).toBeNull();
  });

  it("greedy acquisition by ratio under a budget", () => {
    const cands = [
      { id: "a", delta: 10, cost: 5 },
      { id: "b", delta: 6, cost: 4 },
      { id: "c", delta: 9, cost: 3 },
    ];
    const r = mod.greedyAcquireByRatio(cands, 8)!;
    expect(r.selected).toEqual(["c", "a"]);
    expect(r.totalCost).toBe(8);
    expect(r.totalDelta).toBe(19);
    expect(mod.greedyAcquireByRatio(cands, -1)).toBeNull();
    expect(mod.greedyAcquireByRatio([{ id: "x", delta: 1, cost: 0 }], 8)).toBeNull();
  });

  it("subadditive batch cost stays below the sum of parts", () => {
    const c = mod.subadditiveBatchCost([5, 5], 0.25)!;
    expect(c).toBeCloseTo(8.75, 10);
    expect(c).toBeLessThanOrEqual(10);
    expect(mod.subadditiveBatchCost([5], 0.25)).toBeCloseTo(5, 10);
    expect(mod.subadditiveBatchCost([], 0.25)).toBeNull();
  });
});
