/**
 * Tests for ./2207-11486v1-auto-feature-eng (arXiv:2207.11486v1, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Adopt learned forgetting weights iff the GradMixedDecay-weighted model beats BOTH baselines
 * (stationary unweighted and 3-season window) by >= 0.003 log-loss on the held-out 2025 season AND the
 * learned decay curve is non-degenerate (effective sample size >= 300 games); reject if it fails to
 * beat the fixed window baseline. Mid-season refit only if the offseason fit clears the gate.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2207-11486v1-auto-feature-eng";

describe("auto feature engineering (arXiv:2207.11486v1)", () => {
  it("expands polynomial features", () => {
    expect(mod.polynomialFeatures([2, 3])).toEqual([2, 3, 4, 9, 6]);
    expect(mod.polynomialFeatures([5])).toEqual([5, 25]);
    expect(mod.polynomialFeatures([])).toBeNull();
  });

  it("filters low-variance columns", () => {
    expect(
      mod.varianceThresholdColumns(
        [
          [1, 1, 1],
          [1, 2, 3],
        ],
        0.5,
      ),
    ).toEqual([1]);
    expect(mod.varianceThresholdColumns([[1, 1, 1]], 0)).toEqual([0]);
    expect(mod.varianceThresholdColumns([[1, 1]], -1)).toBeNull();
  });

  it("z-score normalizes columns", () => {
    const z = mod.zScoreNormalize([1, 2, 3])!;
    expect(z[0]).toBeCloseTo(-1.2247449, 6);
    expect(z[1]).toBeCloseTo(0, 10);
    expect(z[2]).toBeCloseTo(1.2247449, 6);
    expect(mod.zScoreNormalize([5, 5, 5])).toBeNull();
  });
});
