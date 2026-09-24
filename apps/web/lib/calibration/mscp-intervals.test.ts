import { describe, it, expect } from "vitest";
import {
  mscpIntervals,
  winklerScore,
  meanWinklerScore,
  intervalCoverage,
} from "@/lib/calibration/mscp-intervals";

// ============================================================
// arXiv 2601.18509 — MSCP intervals. Additive only.
// ============================================================

describe("MSCP intervals — 2601.18509", () => {
  it("mscpIntervals centers on the point forecast with the residual quantile", () => {
    const out = mscpIntervals([100], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], 0.2);
    expect(out.length).toBe(1);
    expect(out[0]!.lo).toBeLessThan(100);
    expect(out[0]!.hi).toBeGreaterThan(100);
    expect(out[0]!.hi - 100).toBeCloseTo(100 - out[0]!.lo, 10);
    expect(Number.isFinite(out[0]!.q)).toBe(true);
  });

  it("mscpIntervals fail-closes on thin windows without ACI alphas", () => {
    const out = mscpIntervals([100], [[1, 2]], 0.1);
    expect(out[0]!.lo).toBe(-Infinity);
    expect(out[0]!.hi).toBe(Infinity);
  });

  it("winklerScore penalizes violations at 2/alpha", () => {
    expect(winklerScore(40, 50, 45, 0.1)).toBe(10);
    expect(winklerScore(40, 50, 55, 0.1)).toBeCloseTo(10 + 20 * 5, 10);
    expect(winklerScore(40, 50, 35, 0.1)).toBeCloseTo(10 + 20 * 5, 10);
  });

  it("meanWinklerScore averages and intervalCoverage counts", () => {
    const iv = [
      { lo: 40, hi: 50 },
      { lo: 40, hi: 50 },
    ];
    expect(meanWinklerScore(iv, [45, 60], 0.1)).toBeCloseTo((10 + 210) / 2, 10);
    expect(intervalCoverage(iv, [45, 60])).toBeCloseTo(0.5, 10);
    expect(meanWinklerScore([], [], 0.1)).toBeNaN();
    expect(intervalCoverage([], [])).toBeNaN();
  });
});
