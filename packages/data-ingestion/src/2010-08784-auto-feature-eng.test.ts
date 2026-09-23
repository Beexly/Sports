/**
 * Tests for ./2010-08784-auto-feature-eng (arXiv:2010.08784, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADOPT the DIFER feature set iff it improves 2024 held-out log-loss by >=0.003 over the
 * OpenFE-augmented baseline, with every surviving feature passing the time-safety audit (recomputable
 * from pre-game data only) and an interpretability check (each feature must have a one-line football
 * meaning). REJECT if gain < 0.003, if >30% of survivors fail interpretability, or if
 * validation-selected features degrade on test.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2010-08784-auto-feature-eng";

describe("auto feature engineering (arXiv:2010.08784)", () => {
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
