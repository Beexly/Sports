/**
 * Tests for ./1901-07329-auto-feature-eng (arXiv:1901.07329, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADOPT the autofeat selection layer iff (a) the selected <=40-feature set matches the full candidate
 * pool's 2024 test log-loss within 0.002 (selection is lossless), AND (b) the linear model on selected
 * features beats the hand-built linear baseline by >= 0.003 log-loss, AND (c) no selected feature
 * fails the unit-legality/time-safety audit.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1901-07329-auto-feature-eng";

describe("auto feature engineering (arXiv:1901.07329)", () => {
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
