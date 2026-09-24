import { describe, it, expect } from "vitest";
import {
  productKernelWeight,
  knnWeights,
  effectiveSampleSize,
  adjustedWeightedQuantile,
  localizedConformalInterval,
  isStarved,
} from "@/lib/calibration/localized-conformal";

// ============================================================
// arXiv 2106.08460 — localized conformal prediction. Additive.
// ============================================================

describe("localized conformal — 2106.08460", () => {
  it("productKernelWeight is 1 at zero distance, decays with distance", () => {
    expect(productKernelWeight([1, 2], [1, 2], [1, 1])).toBeCloseTo(1, 10);
    const near = productKernelWeight([0], [0.5], [1]);
    const far = productKernelWeight([0], [3], [1]);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it("productKernelWeight is 0 on shape mismatch or bad bandwidth", () => {
    expect(productKernelWeight([1], [1, 2], [1])).toBe(0);
    expect(productKernelWeight([1], [1], [0])).toBe(0);
  });

  it("knnWeights put 1/k on the k nearest", () => {
    const w = knnWeights([0], [[0], [1], [2], [10]], 2);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[0]).toBeCloseTo(0.5, 10);
    expect(w[1]).toBeCloseTo(0.5, 10);
    expect(w[3]).toBe(0);
    expect(knnWeights([0], [], 2)).toEqual([]);
  });

  it("effectiveSampleSize of uniform weights is n", () => {
    expect(effectiveSampleSize([1, 1, 1, 1])).toBeCloseTo(4, 10);
    expect(effectiveSampleSize([1, 0, 0, 0])).toBeCloseTo(1, 10);
    expect(effectiveSampleSize([])).toBe(0);
  });

  it("adjustedWeightedQuantile is conservative vs naive on tiny weights", () => {
    // One calibration point with tiny weight: most mass sits at +inf.
    const q = adjustedWeightedQuantile([5], [0.001], 1, 0.1);
    expect(q).toBe(Number.POSITIVE_INFINITY);
  });

  it("adjustedWeightedQuantile returns a real quantile with mass", () => {
    const q = adjustedWeightedQuantile([1, 2, 3], [1, 1, 1], 0.001, 0.1);
    expect(q).toBe(3);
  });

  it("localizedConformalInterval centers on the forecast and reports nEff", () => {
    const xCal = [[0], [0.1], [5], [5.1]];
    const iv = localizedConformalInterval(10, [0.05], xCal, [1, 1, 1, 1], 0.2, [0.5]);
    expect(iv.lo).toBeLessThanOrEqual(10);
    expect(iv.hi).toBeGreaterThanOrEqual(10);
    expect(iv.nEff).toBeGreaterThan(0);
    expect(iv.nEff).toBeLessThan(4);
  });

  it("localizedConformalInterval is vacuous on empty calibration", () => {
    const iv = localizedConformalInterval(10, [0], [], [], 0.1, [1]);
    expect(iv.lo).toBe(Number.NEGATIVE_INFINITY);
    expect(iv.nEff).toBe(0);
  });

  it("isStarved flags collapsed effective samples", () => {
    expect(isStarved(12)).toBe(true);
    expect(isStarved(50)).toBe(false);
    expect(isStarved(200)).toBe(false);
  });
});
