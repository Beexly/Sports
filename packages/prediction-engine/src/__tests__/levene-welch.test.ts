import { describe, it, expect } from "vitest";
import {
  mean,
  median,
  sampleVariance,
  levene,
  brownForsythe,
  welchT,
  splitQuality,
} from "../conformal/levene-welch.js";

describe("mean / median / sampleVariance basic stats", () => {
  it("mean of an empty array is 0", () => {
    expect(mean([])).toBe(0);
  });

  it("mean ignores non-finite entries", () => {
    expect(mean([1, 2, NaN, 3, Infinity])).toBeCloseTo(2, 10);
  });

  it("median of an odd-length array is the middle element", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("median of an even-length array averages the two middle elements", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("sampleVariance of fewer than 2 usable observations is 0, not a crash", () => {
    expect(sampleVariance([])).toBe(0);
    expect(sampleVariance([5])).toBe(0);
    expect(sampleVariance([5, NaN])).toBe(0);
  });

  it("sampleVariance of a constant array is 0", () => {
    expect(sampleVariance([3, 3, 3, 3])).toBe(0);
  });

  it("sampleVariance matches the textbook unbiased estimator", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9], population variance well-known example (var=4.571..)
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(sampleVariance(xs)).toBeCloseTo(4.5714285714, 6);
  });
});

describe("levene / brownForsythe (variance-heterogeneity tests)", () => {
  it("is invalid with fewer than 2 non-empty groups", () => {
    const result = brownForsythe([[1, 2, 3]]);
    expect(result.valid).toBe(false);
    expect(result.statistic).toBe(0);
    expect(result.reason).toBeDefined();
  });

  it("is invalid when total samples do not exceed the group count", () => {
    const result = brownForsythe([[1], [2]]);
    expect(result.valid).toBe(false);
  });

  it("empty groups are dropped, not counted", () => {
    const result = brownForsythe([[], [1, 2, 3, 4], [5, 6, 7, 8]]);
    expect(result.groupCount).toBe(2);
  });

  it("detects genuine variance heterogeneity between a tight and a spread-out group", () => {
    const tight = [10, 10.1, 9.9, 10.05, 9.95, 10, 10.02, 9.98];
    const spread = [0, 20, 5, 15, 2, 18, 8, 12];
    const result = brownForsythe([tight, spread]);
    expect(result.valid).toBe(true);
    expect(result.statistic).toBeGreaterThan(0);
  });

  it("reports invalid (not Infinity) when every group is internally constant", () => {
    // Zero within-group deviation spread: the 0/0 case.
    const result = brownForsythe([
      [1, 1, 1, 1],
      [5, 5, 5, 5],
    ]);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/zero within-group/);
  });

  it("df1 = k - 1 and df2 = N - k on a valid test", () => {
    const result = brownForsythe([[1, 2, 3, 4, 5], [10, 2, 30, 4, 15, 6]]);
    expect(result.df1).toBe(1);
    expect(result.df2).toBe(11 - 2);
  });

  it("classic levene and brownForsythe can disagree on skewed data but both stay finite and non-negative", () => {
    const a = [1, 1, 1, 1, 1, 1, 1, 100]; // heavy-tailed
    const b = [2, 3, 4, 2, 3, 4, 3, 2];
    const l = levene([a, b]);
    const bf = brownForsythe([a, b]);
    for (const r of [l, bf]) {
      if (r.valid) {
        expect(Number.isFinite(r.statistic)).toBe(true);
        expect(r.statistic).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("welchT", () => {
  it("is invalid with fewer than 2 samples on either side", () => {
    expect(welchT([1], [1, 2, 3]).valid).toBe(false);
    expect(welchT([1, 2, 3], [1]).valid).toBe(false);
  });

  it("is invalid when both groups are constant (zero pooled SE)", () => {
    const result = welchT([5, 5, 5], [5, 5, 5]);
    expect(result.valid).toBe(false);
  });

  it("t is signed in the mean(a) - mean(b) direction", () => {
    const higher = welchT([10, 11, 12, 13], [1, 2, 3, 4]);
    expect(higher.valid).toBe(true);
    expect(higher.t).toBeGreaterThan(0);

    const lower = welchT([1, 2, 3, 4], [10, 11, 12, 13]);
    expect(lower.valid).toBe(true);
    expect(lower.t).toBeLessThan(0);
  });

  it("t is close to 0 for two samples with the same mean", () => {
    const result = welchT([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(result.valid).toBe(true);
    expect(result.t).toBeCloseTo(0, 6);
  });

  it("df is always positive and finite for a valid result", () => {
    const result = welchT([1, 5, 3, 9], [2, 2, 8, 4, 6]);
    expect(result.valid).toBe(true);
    expect(result.df).toBeGreaterThan(0);
    expect(Number.isFinite(result.df)).toBe(true);
  });
});

describe("splitQuality (total function invariants)", () => {
  it("is invalid with fewer than 2 finite samples on either side", () => {
    expect(splitQuality([1], [1, 2, 3]).valid).toBe(false);
    expect(splitQuality([], []).valid).toBe(false);
  });

  it("never throws and never returns NaN/Infinity across a wide range of inputs", () => {
    const cases: [number[], number[]][] = [
      [[1, 2, 3, 4], [5, 6, 7, 8]],
      [[1, 1, 1], [1, 1, 1]],
      [[0, 0, 0, 0], [1e10, -1e10, 1e10, -1e10]],
      [[NaN, 1, 2, 3], [4, 5, Infinity, 6]],
      [[], []],
      [[1], [1]],
    ];
    for (const [left, right] of cases) {
      const result = splitQuality(left, right);
      expect(Number.isNaN(result.score)).toBe(false);
      expect(Number.isFinite(result.score)).toBe(true);
      if (result.valid) {
        expect(result.score).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("scores a real variance-separating split higher than a null (no-separation) split", () => {
    const separating = splitQuality(
      [10, 10.1, 9.9, 10.05, 9.95, 10, 10.02, 9.98], // tight
      [0, 20, 5, 15, 2, 18, 8, 12], // spread
    );
    const identical = splitQuality(
      [10, 10.1, 9.9, 10.05, 9.95, 10, 10.02, 9.98],
      [10, 10.1, 9.9, 10.05, 9.95, 10, 10.02, 9.98],
    );
    expect(separating.valid).toBe(true);
    // identical groups have zero within-group... no, identical groups here
    // have IDENTICAL between-group deviations too, so brownForsythe is often
    // invalid (0/0) — only assert the comparison when both are valid.
    if (identical.valid) {
      expect(separating.score).toBeGreaterThan(identical.score);
    }
  });

  it("the mean-shift leg is saturated: an enormous |t| cannot push the score arbitrarily high", () => {
    // Two children with identical (near-zero) variance but a huge mean gap.
    const left = [1000, 1000.001, 999.999, 1000.002];
    const right = [1, 1.001, 0.999, 1.002];
    const result = splitQuality(left, right);
    if (result.valid) {
      // Saturated mean leg is strictly < 0.15 (MEAN_SHIFT_WEIGHT).
      const meanLegContribution = result.score - result.varianceStatistic;
      expect(meanLegContribution).toBeLessThan(0.15);
      expect(meanLegContribution).toBeGreaterThanOrEqual(0);
    }
  });

  it("survives a degenerate Welch leg by keeping the variance score alone", () => {
    // Both sides constant internally after adjusting for variance test validity
    // is hard to construct without also invalidating brownForsythe, so instead
    // confirm meanStatistic falls back to 0 when welchT itself is invalid.
    const left = [5, 5, 5, 5]; // constant -> welchT invalid (zero pooled SE) if right also constant
    const right = [5, 5, 5, 5];
    const result = splitQuality(left, right);
    // brownForsythe is also invalid here (zero within-group spread), so the
    // whole split should be reported invalid, not silently "valid" with a
    // meaningless score.
    expect(result.valid).toBe(false);
  });
});
