/**
 * Tests for ./2507-04929v1-active-learning (arXiv:2507.04929v1, lane=active_learning).
 *
 * ACCEPTANCE GATE: ADOPT the better of the two rules iff it beats cost-blind top-k at equal weekly dollar budget by >=0.005 held-out log-loss on the 2024 season simulation AND does not collapse in any single week (no week >2x average per-dollar regret).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2507-04929v1-active-learning";

describe("2507-04929v1 ConBatch-BAL: Batch Bayesian Active Learning under", () => {
  it("uniform distribution has the highest entropy", () => {
    const h = mod.entropyScores([[0.5, 0.5], [0.9, 0.1]])!;
    expect(h[0]).toBeCloseTo(Math.LN2, 10);
    expect(h[0]!).toBeGreaterThan(h[1]!);
    expect(mod.entropyScores([])).toBeNull();
  });
  it("margin is 0 for ties and large for confident rows", () => {
    expect(mod.marginScores([[0.5, 0.5], [0.9, 0.1]])).toEqual([0, 0.8]);
    expect(mod.marginScores([[0.5]])).toBeNull();
  });
  it("top-K returns highest-score indices first", () => {
    expect(mod.topKIndices([0.1, 0.9, 0.5], 2)).toEqual([1, 2]);
    expect(mod.topKIndices([0.1], 2)).toBeNull();
  });
});
