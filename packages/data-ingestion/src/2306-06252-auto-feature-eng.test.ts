/**
 * Tests for ./2306-06252-auto-feature-eng (arXiv:2306.06252, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADAPT if: >=0.003 held-out NFL log-loss improvement on 2025 games versus the basic-features
 * baseline, with all operators provably causal (AST-verified past-only), feature generation time <5%
 * of downstream training time, and the pruning stage removing >=50% of generated features without
 * hurting validation performance; REJECT if no gate improvement under walk-forward splits, leakage
 * scan fails, or the pruned extended set performs no better than hand-built rolling features.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2306-06252-auto-feature-eng";

describe("auto feature engineering (arXiv:2306.06252)", () => {
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
