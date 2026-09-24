/**
 * Tests for ./1609-07480v1-causal-injury (arXiv:1609.07480v1, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADAPT the landmark-horizon protocol and kappa-discipline immediately. ADOPT the GP-DTW model only if
 * the reproducible test clears ccc >= 0.60 at 7-day horizon; otherwise REJECT the kernel in favor of a
 * simpler DTW-kNN baseline. ADOPT supervised-PCA components only if kappa >= 0.10.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1609-07480v1-causal-injury";

describe("causal/injury estimators (arXiv:1609.07480v1)", () => {
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
