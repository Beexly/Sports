/**
 * Tests for ./1809-08016v3-causal-injury (arXiv:1809.08016v3, lane=causal_injury).
 *
 * ACCEPTANCE GATE: Adopt if the modern-backbone port beats linear regression on KJMz (the ACL-relevant rotational
 * component) by >=0.05 correlation with 5-fold CIs excluding zero on held-out subjects; reject if the
 * gain is confined to ext/flex (KJMx), which the paper already shows is easy (r~0.99) and least
 * injury-relevant.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1809-08016v3-causal-injury";

describe("causal/injury estimators (arXiv:1809.08016v3)", () => {
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
