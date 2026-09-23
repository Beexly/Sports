/**
 * Tests for ./2409-04665-auto-feature-eng (arXiv:2409.04665, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADAPT the II pair-prior iff (a) 2024 held-out log-loss improves ≥ 0.003 for LightGBM, AND (b) the
 * II-prioritized arm beats the random-pair arm by ≥ 0.002, AND (c) the transductive-control arm
 * demonstrably inflates (confirming the audit can detect the bug class).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2409-04665-auto-feature-eng";

describe("auto feature engineering (arXiv:2409.04665)", () => {
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
