import { describe, it, expect } from "vitest";
import {
  neumaierSum,
  logSpaceGeometricMeanAggregation,
  arithmeticMeanAggregation,
  toFull,
  multiprobToPoint,
  type Multiprobability,
} from "../calibration/aggregation.js";

/**
 * CHARACTERIZATION (freeze) tests for calibration/aggregation.ts — 2026-10-15.
 *
 * Pins behavior the main suite (aggregation.test.ts) does not: exact golden
 * outputs for mixed folds, the eps clamping contract, order normalization of
 * inverted folds, and toFull's NON-normalization (see the flagged case).
 */
describe("logSpaceGeometricMeanAggregation — characterization goldens", () => {
  it("golden: three mixed folds", () => {
    const agg = logSpaceGeometricMeanAggregation([
      { p0: 0.3, p1: 0.6 },
      { p0: 0.5, p1: 0.7 },
      { p0: 0.2, p1: 0.9 },
    ]);
    expect(agg.p0).toBeCloseTo(0.3457867379622821, 10);
    expect(agg.p1).toBeCloseTo(0.7230426792525689, 10);
  });

  it("golden: a single inverted fold {p0:0.9, p1:0.1} is order-normalized", () => {
    const agg = logSpaceGeometricMeanAggregation([{ p0: 0.9, p1: 0.1 }]);
    expect(agg.p0).toBeCloseTo(0.1, 10);
    expect(agg.p1).toBeCloseTo(0.9, 10);
  });

  it("pins the default eps clamp: {p0:0, p1:1} aggregates to ~[1e-12, 1-1e-12]", () => {
    const agg = logSpaceGeometricMeanAggregation([{ p0: 0, p1: 1 }]);
    expect(agg.p0).toBeCloseTo(1e-12, 12);
    expect(agg.p1).toBeCloseTo(1 - 1e-12, 12);
  });

  it("pins a custom eps: eps=1e-6 moves the clamp to ~[1e-6, 1-1e-6]", () => {
    const agg = logSpaceGeometricMeanAggregation([{ p0: 0, p1: 1 }], 1e-6);
    expect(agg.p0).toBeCloseTo(1e-6, 9);
    expect(agg.p1).toBeCloseTo(1 - 1e-6, 9);
  });
});

describe("arithmeticMeanAggregation — characterization goldens", () => {
  it("golden: two inverted folds average then order-normalize", () => {
    const agg = arithmeticMeanAggregation([
      { p0: 0.9, p1: 0.1 },
      { p0: 0.8, p1: 0.2 },
    ]);
    expect(agg.p0).toBeCloseTo(0.15, 10);
    expect(agg.p1).toBeCloseTo(0.85, 10);
  });
});

describe("toFull — characterization", () => {
  it("FLAG: toFull does NOT order-normalize — an inverted input yields a negative width", () => {
    // Current behavior, pinned deliberately. The aggregation functions above
    // order-normalize before toFull is applied in cvap.ts, so production paths
    // pass ordered intervals; but toFull itself will happily emit width < 0
    // for a raw inverted input. Any new caller must pass p0 <= p1.
    const full = toFull({ p0: 0.8, p1: 0.2 });
    expect(full.midpoint).toBeCloseTo(0.5, 12);
    expect(full.width).toBeCloseTo(-0.6, 10);
  });
});

describe("multiprobToPoint — characterization", () => {
  it("swapped input: minimax and midpoint both return the interval center", () => {
    const swapped: Multiprobability = { p0: 0.6, p1: 0.2 };
    expect(multiprobToPoint(swapped, "minimax")).toBeCloseTo(0.4, 12);
    expect(multiprobToPoint(swapped, "midpoint")).toBeCloseTo(0.4, 12);
  });
});

describe("neumaierSum — characterization goldens", () => {
  it("recovers the +1 in [1e16, 1, -1e16] where naive summation returns 0", () => {
    expect(neumaierSum([1e16, 1, -1e16])).toBe(1);
    expect([1e16, 1, -1e16].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("sums ten 0.1 values to 1 within float tolerance", () => {
    expect(neumaierSum(Array(10).fill(0.1))).toBeCloseTo(1, 12);
  });
});
