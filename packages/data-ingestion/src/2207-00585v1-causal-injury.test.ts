/**
 * Tests for ./2207-00585v1-causal-injury (arXiv:2207.00585v1, lane=causal_injury).
 *
 * ACCEPTANCE GATE: Adopt iff the NFL port achieves ROC-AUC >= 0.65 with 95% CIs excluding 0.5 on the 2022-2024 forward
 * test AND beats the workload-only baseline (the paper's 0.674 is the meet-or-beat benchmark).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2207-00585v1-causal-injury";

describe("causal/injury estimators (arXiv:2207.00585v1)", () => {
  it("computes inverse-propensity weights", () => {
    expect(mod.ipwWeights([true, false], [0.5, 0.5])).toEqual([2, 2]);
    expect(mod.ipwWeights([true], [0.25])).toEqual([4]);
    expect(mod.ipwWeights([true], [0])).toBeNull();
    expect(mod.ipwWeights([true], [1])).toBeNull();
    expect(mod.ipwWeights([true, false], [0.5])).toBeNull();
  });

  it("estimates difference-in-differences", () => {
    // treated: 11 -> 15 (+4); control: 11 -> 12 (+1); DiD = 3
    expect(mod.didEstimate([10, 12], [14, 16], [10, 12], [11, 13])).toBeCloseTo(3, 10);
    expect(mod.didEstimate([10, 12], [14, 16], [10, 12], [14, 16])).toBeCloseTo(0, 10);
    expect(mod.didEstimate([], [1], [1], [1])).toBeNull();
  });

  it("checks covariate balance with standardized mean difference", () => {
    expect(mod.standardizedMeanDiff([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    const d = mod.standardizedMeanDiff([1, 2, 3], [2, 3, 4])!;
    expect(d).toBeLessThan(0);
    expect(mod.standardizedMeanDiff([5, 5], [5, 5])).toBeNull();
  });
});
