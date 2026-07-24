/**
 * UQ Calibration tests — PAV / IVAP / CVAP / aggregation
 * Handoff §5 expectations: unit + property tests for multiprob width ≥ 0,
 * p0 ≤ p1 after ordering, geometric aggregation extremes, etc.
 * Does not rewrite core algorithms; only verifies.
 */

import { describe, it, expect } from "vitest";
import { pavIsotonic, pavBinary } from "../calibration/pav.js";
import { InductiveVennAbers, fitIvap, ivapPredict, type IvapCalibrationPoint } from "../calibration/ivap.js";
import { cvapPredict, fitCvap } from "../calibration/cvap.js";
import {
  logSpaceGeometricMeanAggregation,
  arithmeticMeanAggregation,
  neumaierSum,
  multiprobToPoint,
  toFull,
  type Multiprobability,
} from "../calibration/aggregation.js";

function makeCal(n: number, p: number = 0.6): IvapCalibrationPoint[] {
  const pts: IvapCalibrationPoint[] = [];
  for (let i = 0; i < n; i++) {
    const score = i / (n - 1 || 1);
    // Bernoulli-ish around p, deterministic for tests
    const label = ((i * 7 + 3) % 10) / 10 < p ? 1 : 0;
    pts.push({ score, label: label as 0 | 1 });
  }
  return pts;
}

describe("pavIsotonic", () => {
  it("returns empty for empty input", () => {
    expect(pavIsotonic([])).toEqual([]);
  });

  it("is identity on already non-decreasing sequences", () => {
    const ys = [0.1, 0.2, 0.5, 0.9];
    expect(pavIsotonic(ys)).toEqual(ys);
  });

  it("pools adjacent violators", () => {
    // Classic example: 1, 0 → both become 0.5
    const fitted = pavIsotonic([1, 0]);
    expect(fitted[0]).toBeCloseTo(0.5);
    expect(fitted[1]).toBeCloseTo(0.5);
  });

  it("respects weights", () => {
    // Heavy weight on the high value should pull the average up
    const fitted = pavIsotonic([0, 1], [1, 9]);
    expect(fitted[0]).toBeCloseTo(0.9);
    expect(fitted[1]).toBeCloseTo(0.9);
  });

  it("pavBinary works on 0/1 labels", () => {
    const fitted = pavBinary([0, 1, 0, 1] as (0 | 1)[]);
    expect(fitted.length).toBe(4);
    // Must be non-decreasing
    for (let i = 1; i < fitted.length; i++) {
      expect(fitted[i]!).toBeGreaterThanOrEqual(fitted[i - 1]! - 1e-12);
    }
  });
});

describe("aggregation", () => {
  it("neumaierSum matches ordinary sum on well-behaved data", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(neumaierSum(xs)).toBeCloseTo(15);
  });

  it("logSpaceGeometricMeanAggregation produces ordered multiprob", () => {
    const folds: Multiprobability[] = [
      { p0: 0.2, p1: 0.4 },
      { p0: 0.3, p1: 0.5 },
      { p0: 0.1, p1: 0.35 },
    ];
    const agg = logSpaceGeometricMeanAggregation(folds);
    expect(agg.p0).toBeLessThanOrEqual(agg.p1);
    expect(agg.p0).toBeGreaterThanOrEqual(0);
    expect(agg.p1).toBeLessThanOrEqual(1);
  });

  it("handles extreme probabilities without NaN", () => {
    const folds: Multiprobability[] = [
      { p0: 1e-15, p1: 1 - 1e-15 },
      { p0: 0.5, p1: 0.5 },
      { p0: 0.01, p1: 0.99 },
    ];
    const agg = logSpaceGeometricMeanAggregation(folds);
    expect(Number.isFinite(agg.p0)).toBe(true);
    expect(Number.isFinite(agg.p1)).toBe(true);
    expect(agg.p0).toBeLessThanOrEqual(agg.p1);
  });

  it("arithmeticMeanAggregation is simple average", () => {
    const folds: Multiprobability[] = [
      { p0: 0.2, p1: 0.4 },
      { p0: 0.4, p1: 0.6 },
    ];
    const agg = arithmeticMeanAggregation(folds);
    expect(agg.p0).toBeCloseTo(0.3);
    expect(agg.p1).toBeCloseTo(0.5);
  });

  it("toFull and multiprobToPoint preserve width ≥ 0", () => {
    const mp = { p0: 0.3, p1: 0.7 };
    const full = toFull(mp);
    expect(full.width).toBeGreaterThanOrEqual(0);
    expect(multiprobToPoint(mp, "midpoint")).toBeCloseTo(0.5);
    expect(multiprobToPoint(mp, "lower")).toBeCloseTo(0.3);
    expect(multiprobToPoint(mp, "upper")).toBeCloseTo(0.7);
  });
});

describe("InductiveVennAbers (IVAP)", () => {
  it("empty calibration returns 0.5", () => {
    const pred = ivapPredict([], 0.5);
    expect(pred.p0).toBe(0.5);
    expect(pred.p1).toBe(0.5);
    expect(pred.width).toBe(0);
  });

  it("p0 ≤ p1 and width ≥ 0 (property)", () => {
    const cal = makeCal(40);
    const ivap = fitIvap(cal);
    for (const score of [0, 0.25, 0.5, 0.75, 1]) {
      const pred = ivap.predict(score);
      expect(pred.p0).toBeLessThanOrEqual(pred.p1 + 1e-12);
      expect(pred.width).toBeGreaterThanOrEqual(-1e-12);
      expect(pred.pMid).toBeCloseTo((pred.p0 + pred.p1) / 2);
    }
  });

  it("is deterministic", () => {
    const cal = makeCal(20);
    const a = ivapPredict(cal, 0.4);
    const b = ivapPredict(cal, 0.4);
    expect(a.p0).toBe(b.p0);
    expect(a.p1).toBe(b.p1);
  });
});

describe("CrossVennAbers (CVAP)", () => {
  it("produces valid multiprob with width ≥ 0", () => {
    const cal = makeCal(50);
    const pred = cvapPredict(cal, 0.55, { folds: 5 });
    expect(pred.p0).toBeLessThanOrEqual(pred.p1 + 1e-12);
    expect(pred.width).toBeGreaterThanOrEqual(-1e-12);
    expect(pred.foldsUsed).toBe(5);
    expect(pred.foldPredictions.length).toBe(5);
  });

  it("geometric vs arithmetic both ordered", () => {
    const cal = makeCal(30);
    const geo = cvapPredict(cal, 0.6, { folds: 3, aggregation: "geometric" });
    const arith = cvapPredict(cal, 0.6, { folds: 3, aggregation: "arithmetic" });
    expect(geo.p0).toBeLessThanOrEqual(geo.p1);
    expect(arith.p0).toBeLessThanOrEqual(arith.p1);
  });

  it("factory class works", () => {
    const cal = makeCal(25);
    const model = fitCvap(cal, { folds: 4 });
    const pred = model.predict(0.3);
    expect(pred.foldsUsed).toBe(4);
  });
});
