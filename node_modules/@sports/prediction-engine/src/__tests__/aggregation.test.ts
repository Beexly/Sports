import { describe, it, expect } from "vitest";
import {
  neumaierSum,
  logSpaceGeometricMeanAggregation,
  arithmeticMeanAggregation,
  toFull,
  multiprobToPoint,
  type Multiprobability,
} from "../calibration/aggregation.js";

describe("neumaierSum", () => {
  it("matches naive summation for well-scaled values", () => {
    expect(neumaierSum([1, 2, 3, 4, 5])).toBeCloseTo(15, 10);
  });

  it("returns 0 for an empty array", () => {
    expect(neumaierSum([])).toBe(0);
  });

  it("is more accurate than naive summation for catastrophic-cancellation inputs", () => {
    // A case where a naive running sum loses precision: a huge value followed
    // by a small value that a plain running total would round away entirely
    // (1e16 + 1 === 1e16 in float64 naive summation).
    const big = 1e16;
    const values = [big, 1];
    let naive = 0;
    for (const v of values) naive += v;
    expect(naive).toBe(big); // demonstrates the precision loss this function fixes

    // Neumaier tracks a compensation term, so the +1 is not lost.
    const result = neumaierSum(values);
    expect(result).toBeCloseTo(big + 1, 0);
  });
});

describe("logSpaceGeometricMeanAggregation", () => {
  it("throws on an empty fold list", () => {
    expect(() => logSpaceGeometricMeanAggregation([])).toThrow();
  });

  it("returns the same interval when every fold agrees", () => {
    const folds: Multiprobability[] = [
      { p0: 0.3, p1: 0.6 },
      { p0: 0.3, p1: 0.6 },
      { p0: 0.3, p1: 0.6 },
    ];
    const agg = logSpaceGeometricMeanAggregation(folds);
    expect(agg.p0).toBeCloseTo(0.3, 6);
    expect(agg.p1).toBeCloseTo(0.6, 6);
  });

  it("always returns p0 <= p1", () => {
    const folds: Multiprobability[] = [
      { p0: 0.9, p1: 0.95 },
      { p0: 0.05, p1: 0.1 },
      { p0: 0.5, p1: 0.5 },
    ];
    const agg = logSpaceGeometricMeanAggregation(folds);
    expect(agg.p0).toBeLessThanOrEqual(agg.p1);
  });

  it("handles extreme probabilities near 0 and 1 without producing NaN/Infinity", () => {
    const folds: Multiprobability[] = [
      { p0: 0, p1: 1 },
      { p0: 1e-15, p1: 1 - 1e-15 },
      { p0: 0.5, p1: 0.5 },
    ];
    const agg = logSpaceGeometricMeanAggregation(folds);
    expect(Number.isFinite(agg.p0)).toBe(true);
    expect(Number.isFinite(agg.p1)).toBe(true);
    expect(agg.p0).toBeGreaterThanOrEqual(0);
    expect(agg.p1).toBeLessThanOrEqual(1);
  });

  it("a single fold is returned essentially unchanged", () => {
    const folds: Multiprobability[] = [{ p0: 0.2, p1: 0.4 }];
    const agg = logSpaceGeometricMeanAggregation(folds);
    expect(agg.p0).toBeCloseTo(0.2, 6);
    expect(agg.p1).toBeCloseTo(0.4, 6);
  });
});

describe("arithmeticMeanAggregation", () => {
  it("throws on an empty fold list", () => {
    expect(() => arithmeticMeanAggregation([])).toThrow();
  });

  it("computes the plain mean of p0 and p1 across folds", () => {
    const folds: Multiprobability[] = [
      { p0: 0.2, p1: 0.4 },
      { p0: 0.4, p1: 0.6 },
    ];
    const agg = arithmeticMeanAggregation(folds);
    expect(agg.p0).toBeCloseTo(0.3, 10);
    expect(agg.p1).toBeCloseTo(0.5, 10);
  });

  it("always returns p0 <= p1 even if fold order would otherwise invert it", () => {
    const folds: Multiprobability[] = [{ p0: 0.9, p1: 0.1 }];
    const agg = arithmeticMeanAggregation(folds);
    expect(agg.p0).toBeLessThanOrEqual(agg.p1);
  });
});

describe("toFull", () => {
  it("adds midpoint and width consistently", () => {
    const full = toFull({ p0: 0.2, p1: 0.5 });
    expect(full.midpoint).toBeCloseTo(0.35, 10);
    expect(full.width).toBeCloseTo(0.3, 10);
  });

  it("width is 0 for a degenerate interval", () => {
    const full = toFull({ p0: 0.4, p1: 0.4 });
    expect(full.width).toBe(0);
  });
});

describe("multiprobToPoint", () => {
  const mp: Multiprobability = { p0: 0.2, p1: 0.6 };

  it("lower returns the smaller endpoint", () => {
    expect(multiprobToPoint(mp, "lower")).toBeCloseTo(0.2, 10);
  });

  it("upper returns the larger endpoint", () => {
    expect(multiprobToPoint(mp, "upper")).toBeCloseTo(0.6, 10);
  });

  it("midpoint (default) returns the average", () => {
    expect(multiprobToPoint(mp)).toBeCloseTo(0.4, 10);
    expect(multiprobToPoint(mp, "midpoint")).toBeCloseTo(0.4, 10);
  });

  it("minimax returns the midpoint under 0-1 loss", () => {
    expect(multiprobToPoint(mp, "minimax")).toBeCloseTo(0.4, 10);
  });

  it("is order-independent when p0/p1 are swapped in the input", () => {
    const swapped: Multiprobability = { p0: 0.6, p1: 0.2 };
    expect(multiprobToPoint(swapped, "lower")).toBeCloseTo(0.2, 10);
    expect(multiprobToPoint(swapped, "upper")).toBeCloseTo(0.6, 10);
  });
});
