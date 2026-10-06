import { describe, expect, it } from "vitest";

import {
  ENABLED,
  effectiveSampleSize,
  splitConformalInterval,
  weightedQuantile,
  weightedSplitConformalInterval,
} from "@/lib/calibration/1904-06019-weighted-split-conformal-covariate-shift";

describe("likelihood-ratio-weighted split conformal", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("effectiveSampleSize degrades with skewed weights", () => {
    expect(effectiveSampleSize([1, 1, 1, 1])).toBeCloseTo(4, 10);
    const skewed = effectiveSampleSize([100, 1, 1, 1, 1]);
    expect(skewed).toBeLessThan(2);
  });

  it("weightedQuantile reduces to the standard quantile under uniform weights", () => {
    const vals = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const w = vals.map(() => 1);
    expect(weightedQuantile(vals, w, 0.9)).toBeCloseTo(1.0, 10);
    expect(weightedQuantile(vals, w, 0.5)).toBeCloseTo(0.6, 10);
  });

  it("upweighting large residuals widens the interval", () => {
    const residuals = [...Array.from({ length: 10 }, (_, i) => 0.5 + i * 0.1), 5.0, 6.0];
    const base = splitConformalInterval(24, residuals, 0.2);
    const shifted = weightedSplitConformalInterval(
      24,
      residuals,
      [...Array.from({ length: 10 }, () => 1), 50, 50],
      0.2,
      2, // tiny nHatMin so weighting is used
    );
    expect(shifted.usedWeighting).toBe(true);
    expect(shifted.hi - shifted.lo).toBeGreaterThan(base.hi - base.lo);
  });

  it("falls back to unweighted + abstention flag when n-hat < 100", () => {
    const residuals = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.05);
    const ratios = residuals.map((_, i) => (i === 0 ? 1000 : 0.001));
    const res = weightedSplitConformalInterval(24, residuals, ratios, 0.1);
    expect(res.nHat).toBeLessThan(100);
    expect(res.usedWeighting).toBe(false);
    expect(res.abstentionFlag).toBe(true);
    const base = splitConformalInterval(24, residuals, 0.1);
    expect(res.lo).toBeCloseTo(base.lo, 10);
    expect(res.hi).toBeCloseTo(base.hi, 10);
  });
});
