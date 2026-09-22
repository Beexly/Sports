import { describe, it, expect } from "vitest";
import {
  empiricalQuantile,
  predictiveResampleInterval,
  horizonInflationFactor,
  coverageWithinBall,
  coversTarget,
  residualScorecaster,
} from "@/lib/calibration/martingale-uncertainty";

// ============================================================
// arXiv 2401.17743v1 — martingale-posterior uncertainty. Additive.
// ============================================================

describe("martingale uncertainty — 2401.17743v1", () => {
  it("empiricalQuantile interpolates correctly", () => {
    expect(empiricalQuantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
    expect(empiricalQuantile([5], 0.9)).toBe(5);
    expect(empiricalQuantile([], 0.5)).toBeNaN();
  });

  it("predictiveResampleInterval is the central interval", () => {
    const r = Array.from({ length: 100 }, (_, i) => i - 50);
    const { lo, hi } = predictiveResampleInterval(r, 0.2);
    expect(lo).toBeCloseTo(empiricalQuantile(r, 0.1), 10);
    expect(hi).toBeCloseTo(empiricalQuantile(r, 0.9), 10);
    expect(lo).toBeLessThan(hi);
  });

  it("horizonInflationFactor grows with horizon, is 1 at week 1", () => {
    expect(horizonInflationFactor(1, 0.5)).toBe(1);
    const f2 = horizonInflationFactor(2, 0.5);
    const f4 = horizonInflationFactor(4, 0.5);
    expect(f2).toBeGreaterThan(1);
    expect(f4).toBeGreaterThan(f2);
  });

  it("coverageWithinBall counts absolute errors inside tau", () => {
    expect(coverageWithinBall([-1, 0, 1, 5], 1)).toBeCloseTo(0.75, 10);
    expect(coverageWithinBall([], 1)).toBeNaN();
  });

  it("coversTarget applies the tolerance gate", () => {
    expect(coversTarget(0.89, 0.9, 2)).toBe(true);
    expect(coversTarget(0.85, 0.9, 2)).toBe(false);
    expect(coversTarget(Number.NaN, 0.9, 2)).toBe(false);
  });

  it("residualScorecaster evaluates the linear model", () => {
    expect(residualScorecaster([1, 2], [0.5, 0.25], -1)).toBeCloseTo(0, 10);
    expect(residualScorecaster([], [])).toBe(0);
  });
});
