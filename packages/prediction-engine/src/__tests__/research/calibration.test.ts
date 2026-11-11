import { describe, it, expect } from "vitest";
import {
  pavaIsotonic,
  reliabilityBins,
  expectedCalibrationError,
  buildCalibrationMap,
  applyCalibration,
} from "../../research/calibration.js";

describe("pavaIsotonic", () => {
  it("leaves an already-monotone sequence untouched", () => {
    expect(pavaIsotonic([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("pools a single inversion", () => {
    expect(pavaIsotonic([3, 1, 2])).toEqual([2, 2, 2]);
  });

  it("pools a fully decreasing sequence to its mean", () => {
    expect(pavaIsotonic([4, 3, 2, 1])).toEqual([2.5, 2.5, 2.5, 2.5]);
  });

  it("returns an empty array for empty input", () => {
    expect(pavaIsotonic([])).toEqual([]);
  });

  it("produces a non-decreasing output for any input", () => {
    const out = pavaIsotonic([0.9, 0.1, 0.5, 0.2, 0.8]);
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]!);
    }
  });

  it("treats non-finite input as zero rather than propagating NaN", () => {
    const out = pavaIsotonic([Number.NaN, 1]);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe("reliabilityBins and ECE", () => {
  it("computes the count-weighted |observed - predicted| gap", () => {
    // one pair in bin 0 at p=0.05 (miss), one in bin 9 at p=0.95 (hit)
    const bins = reliabilityBins([{ p: 0.05, y: 0 }, { p: 0.95, y: 1 }], 10);
    expect(expectedCalibrationError(bins)).toBeCloseTo(0.05, 10);
  });

  it("reports zero ECE for a perfectly calibrated pair set", () => {
    const bins = reliabilityBins([{ p: 0.5, y: 0 }, { p: 0.5, y: 1 }], 10);
    // mean predicted 0.5, mean observed 0.5
    expect(expectedCalibrationError(bins)).toBeCloseTo(0, 10);
  });

  it("drops malformed pairs instead of coercing them", () => {
    const bins = reliabilityBins([
      { p: 1.7, y: 1 },
      { p: Number.NaN, y: 0 },
      { p: 0.5, y: 2 },
      { p: 0.5, y: 1 },
    ], 10);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(1);
  });

  it("rejects a bad bin count", () => {
    expect(() => reliabilityBins([], 0)).toThrow(RangeError);
  });
});

describe("buildCalibrationMap and applyCalibration", () => {
  it("returns an empty map when fewer than two bins carry data", () => {
    expect(buildCalibrationMap([{ p: 0.5, y: 1 }], 10)).toEqual([]);
  });

  it("returns a monotone non-decreasing map", () => {
    const pairs = [
      { p: 0.05, y: 0 }, { p: 0.15, y: 0 }, { p: 0.25, y: 1 },
      { p: 0.35, y: 0 }, { p: 0.65, y: 1 }, { p: 0.85, y: 1 },
    ];
    const map = buildCalibrationMap(pairs, 10);
    expect(map.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < map.length; i += 1) {
      expect(map[i]!.y).toBeGreaterThanOrEqual(map[i - 1]!.y);
      expect(map[i]!.x).toBeGreaterThanOrEqual(map[i - 1]!.x);
    }
  });

  it("is an identity no-op when no map could be estimated", () => {
    expect(applyCalibration([], 0.42)).toBe(0.42);
  });

  it("clamps below the first and above the last knot", () => {
    const map = [{ x: 0.2, y: 0.1 }, { x: 0.8, y: 0.9 }];
    expect(applyCalibration(map, 0.01)).toBe(0.1);
    expect(applyCalibration(map, 0.99)).toBe(0.9);
  });

  it("interpolates linearly between knots", () => {
    const map = [{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.6 }];
    expect(applyCalibration(map, 0.4)).toBeCloseTo(0.4, 10);
  });
});
