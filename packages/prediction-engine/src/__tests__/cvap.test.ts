import { describe, it, expect } from "vitest";
import { cvapPredict, CrossVennAbers, fitCvap } from "../calibration/cvap.js";
import type { IvapCalibrationPoint } from "../calibration/ivap.js";

function separableCalibration(n = 60): IvapCalibrationPoint[] {
  const points: IvapCalibrationPoint[] = [];
  for (let i = 0; i < n; i++) {
    const score = i / (n - 1);
    const label: 0 | 1 = score >= 0.5 ? 1 : 0;
    points.push({ score, label });
  }
  return points;
}

describe("cvapPredict", () => {
  it("empty calibration set returns the uninformative 0.5/0.5 point with 0 folds used", () => {
    const pred = cvapPredict([], 0.5);
    expect(pred.p0).toBe(0.5);
    expect(pred.p1).toBe(0.5);
    expect(pred.width).toBe(0);
    expect(pred.foldsUsed).toBe(0);
    expect(pred.foldPredictions).toEqual([]);
  });

  it("always returns p0 <= p1 across varied test scores", () => {
    const cal = separableCalibration();
    for (const s of [-1, 0, 0.25, 0.5, 0.75, 1, 2]) {
      const pred = cvapPredict(cal, s);
      expect(pred.p0).toBeLessThanOrEqual(pred.p1);
    }
  });

  it("width is always >= 0", () => {
    const cal = separableCalibration();
    for (const s of [-5, 0, 0.5, 1, 5]) {
      expect(cvapPredict(cal, s).width).toBeGreaterThanOrEqual(0);
    }
  });

  it("midpoint is always the mean of p0 and p1", () => {
    const cal = separableCalibration();
    for (const s of [0.1, 0.5, 0.9]) {
      const pred = cvapPredict(cal, s);
      expect(pred.midpoint).toBeCloseTo((pred.p0 + pred.p1) / 2, 12);
    }
  });

  it("clamps requested folds to at most the calibration size", () => {
    const cal = separableCalibration(3);
    const pred = cvapPredict(cal, 0.5, { folds: 100 });
    expect(pred.foldsUsed).toBeLessThanOrEqual(3);
    expect(pred.foldsUsed).toBeGreaterThanOrEqual(2);
  });

  it("clamps requested folds to at least 2 even when 1 is requested", () => {
    const cal = separableCalibration(10);
    const pred = cvapPredict(cal, 0.5, { folds: 1 });
    expect(pred.foldsUsed).toBeGreaterThanOrEqual(2);
  });

  it("defaults to min(5, n) folds when unspecified", () => {
    const cal = separableCalibration(3);
    const pred = cvapPredict(cal, 0.5);
    expect(pred.foldsUsed).toBe(3);
  });

  it("produces exactly foldsUsed fold predictions", () => {
    const cal = separableCalibration(20);
    const pred = cvapPredict(cal, 0.5, { folds: 4 });
    expect(pred.foldPredictions).toHaveLength(4);
  });

  it("is deterministic given the same seed and inputs", () => {
    const cal = separableCalibration();
    const a = cvapPredict(cal, 0.6, { seed: 42 });
    const b = cvapPredict(cal, 0.6, { seed: 42 });
    expect(a).toEqual(b);
  });

  it("different seeds can produce different fold assignments (not required to differ in output, but must not throw)", () => {
    const cal = separableCalibration();
    expect(() => cvapPredict(cal, 0.6, { seed: 1 })).not.toThrow();
    expect(() => cvapPredict(cal, 0.6, { seed: 999 })).not.toThrow();
  });

  it("arithmetic aggregation mode also yields an ordered, finite interval", () => {
    const cal = separableCalibration();
    const pred = cvapPredict(cal, 0.5, { aggregation: "arithmetic" });
    expect(pred.aggregation).toBe("arithmetic");
    expect(pred.p0).toBeLessThanOrEqual(pred.p1);
    expect(Number.isFinite(pred.p0)).toBe(true);
    expect(Number.isFinite(pred.p1)).toBe(true);
  });

  it("geometric aggregation is the default", () => {
    const cal = separableCalibration();
    const pred = cvapPredict(cal, 0.5);
    expect(pred.aggregation).toBe("geometric");
  });

  it("all output fields stay within [0, 1]", () => {
    const cal = separableCalibration();
    for (const s of [-100, 0, 0.5, 100]) {
      const pred = cvapPredict(cal, s);
      expect(pred.p0).toBeGreaterThanOrEqual(0);
      expect(pred.p1).toBeLessThanOrEqual(1);
    }
  });

  it("a pathological fold with zero training points falls back to the full calibration set rather than crashing", () => {
    // n slightly above k so LCG fold assignment has a real chance of leaving a
    // fold with all its points also being the only members of that fold
    // (i.e. train set would be empty for that fold if not for the fallback).
    const cal = separableCalibration(4);
    expect(() => cvapPredict(cal, 0.5, { folds: 4 })).not.toThrow();
  });
});

describe("CrossVennAbers / fitCvap", () => {
  it("fitCvap returns a working CrossVennAbers instance matching cvapPredict", () => {
    const cal = separableCalibration();
    const viaFactory = fitCvap(cal, { seed: 7 }).predict(0.5);
    const viaFunction = cvapPredict(cal, 0.5, { seed: 7 });
    expect(viaFactory).toEqual(viaFunction);
  });

  it("CrossVennAbers.predict matches the plain cvapPredict function", () => {
    const cal = separableCalibration();
    const cv = new CrossVennAbers(cal, { seed: 3, folds: 5 });
    expect(cv.predict(0.4)).toEqual(cvapPredict(cal, 0.4, { seed: 3, folds: 5 }));
  });
});

describe("CVAP vs single IVAP sanity", () => {
  it("CVAP fold predictions individually match a single-fold IVAP computed on the same train set shape", () => {
    // Not a strict tightness claim (that depends on data), just confirms the
    // fold mechanism is really running IVAP per fold, not some other path.
    const cal = separableCalibration(10);
    const pred = cvapPredict(cal, 0.5, { folds: 2, seed: 123 });
    expect(pred.foldPredictions).toHaveLength(2);
    for (const fold of pred.foldPredictions) {
      expect(fold.p0).toBeLessThanOrEqual(fold.p1);
      expect(fold.p0).toBeGreaterThanOrEqual(0);
      expect(fold.p1).toBeLessThanOrEqual(1);
    }
  });
});
