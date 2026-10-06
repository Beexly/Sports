/**
 * Tests for ./2102-06024v3-auto-feature-eng (arXiv:2102.06024v3, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Accept iff NFS top-k (best k) improves 2024 held-out log-loss by >= 0.003 over both baseline A (all
 * streams) and baseline C (hand-picked), with k <= 40 (deployment discipline). Reject if NFS selection
 * underperforms the full set, if the selected set is unstable across 5 seeds (Jaccard < 0.5), or if it
 * merely rediscovers the hand-picked set with no lift.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2102-06024v3-auto-feature-eng";

describe("auto feature engineering (arXiv:2102.06024v3)", () => {
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
