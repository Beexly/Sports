/**
 * Tests for ./1907-05326-causal-injury (arXiv:1907.05326, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADOPT the workload-risk feature into GSE's injury overlay only if: (a) leave-one-season-out AUC >=
 * 0.60 for next-week injury among skill-position players; (b) the low-ACWR risk artifact is absent
 * (monotone or flat risk below ratio 1.0); (c) the risk curve's inflection point is identified from
 * the continuous fit with bootstrap 90% CI width < 0.5 ratio units.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1907-05326-causal-injury";

describe("causal/injury estimators (arXiv:1907.05326)", () => {
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
