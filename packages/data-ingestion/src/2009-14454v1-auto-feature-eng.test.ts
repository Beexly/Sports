/**
 * Tests for ./2009-14454v1-auto-feature-eng (arXiv:2009.14454v1, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Adopt PRoFILE iff (a) on Test A its top-25% masking degrades log-loss more than SHAP's top-25% by a
 * relative margin >=10%, AND (b) on Test B its fidelity degrades less than SHAP's under the 2022+ era
 * shift, AND (c) on Test C mean weekly s-hat spikes coincide with documented regime breaks at >=60%
 * hit rate.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2009-14454v1-auto-feature-eng";

describe("auto feature engineering (arXiv:2009.14454v1)", () => {
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
