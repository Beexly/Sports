import { describe, it, expect } from "vitest";
import {
  pinballLoss,
  monotoneQuantiles,
  quantileInterpolatedCdf,
  overUnderProbs,
  quantileGridCrps,
} from "@/lib/calibration/deep-quantile-totals";

// ============================================================
// arXiv 2402.06062v1 — deep quantile totals. Additive only.
// ============================================================

describe("deep quantile totals — 2402.06062v1", () => {
  it("pinballLoss matches the textbook formula", () => {
    expect(pinballLoss(5, 3, 0.5)).toBeCloseTo(1, 10);
    expect(pinballLoss(3, 5, 0.5)).toBeCloseTo(1, 10);
    expect(pinballLoss(5, 3, 0.9)).toBeCloseTo(1.8, 10);
    expect(pinballLoss(3, 5, 0.9)).toBeCloseTo(0.2, 10);
    expect(pinballLoss(4, 4, 0.3)).toBe(0);
  });

  it("monotoneQuantiles repairs crossings and preserves order", () => {
    const fixed = monotoneQuantiles([40, 45, 43, 50]);
    for (let i = 1; i < fixed.length; i++) {
      expect(fixed[i]!).toBeGreaterThanOrEqual(fixed[i - 1]!);
    }
    expect(monotoneQuantiles([1, 2, 3])).toEqual([1, 2, 3]);
    expect(monotoneQuantiles([])).toEqual([]);
  });

  it("quantileInterpolatedCdf inverts the quantile grid", () => {
    const tau = [0.1, 0.5, 0.9];
    const q = [35, 45, 55];
    expect(quantileInterpolatedCdf(tau, q, 45)).toBeCloseTo(0.5, 10);
    expect(quantileInterpolatedCdf(tau, q, 40)).toBeCloseTo(0.3, 10);
    expect(quantileInterpolatedCdf(tau, q, 0)).toBe(0);
    expect(quantileInterpolatedCdf(tau, q, 100)).toBe(1);
    expect(quantileInterpolatedCdf([], [], 45)).toBeNaN();
  });

  it("overUnderProbs sums to 1", () => {
    const tau = [0.1, 0.5, 0.9];
    const q = [35, 45, 55];
    const { under, over } = overUnderProbs(tau, q, 44);
    expect(under + over).toBeCloseTo(1, 10);
    expect(under).toBeLessThan(0.5);
    expect(over).toBeGreaterThan(0.5);
  });

  it("quantileGridCrps is non-negative", () => {
    const tau = [0.1, 0.5, 0.9];
    const q = [35, 45, 55];
    expect(quantileGridCrps(tau, q, 45)).toBeGreaterThanOrEqual(0);
    expect(quantileGridCrps([], [], 45)).toBeNaN();
  });
});
