/**
 * Tests for ./2104-02883v1-auto-feature-eng (arXiv:2104.02883v1, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Accept iff the faded online top-40 matches-or-beats baseline A on average 2019-2024 log-loss (Delta
 * >= 0.001) AND the online scores reproduce offline scores within rank-mismatch <1% on a static
 * snapshot (parity check). Reject if fading adds nothing over full-history screening (keep the cheaper
 * offline version) or if weekly rank churn is so high the feature set is unstable.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2104-02883v1-auto-feature-eng";

describe("auto feature engineering (arXiv:2104.02883v1)", () => {
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
