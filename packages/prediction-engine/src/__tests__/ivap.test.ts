import { describe, it, expect } from "vitest";
import {
  InductiveVennAbers,
  fitIvap,
  ivapPredict,
  type IvapCalibrationPoint,
} from "../calibration/ivap.js";

/** A calibration set where higher score cleanly predicts label 1. */
function separableCalibration(n = 40): IvapCalibrationPoint[] {
  const points: IvapCalibrationPoint[] = [];
  for (let i = 0; i < n; i++) {
    const score = i / (n - 1);
    const label: 0 | 1 = score >= 0.5 ? 1 : 0;
    points.push({ score, label });
  }
  return points;
}

describe("InductiveVennAbers", () => {
  it("empty calibration set returns the uninformative 0.5/0.5 point", () => {
    const pred = new InductiveVennAbers([]).predict(0.7);
    expect(pred).toEqual({ p0: 0.5, p1: 0.5, pMid: 0.5, width: 0 });
  });

  it("always returns p0 <= p1 (ordered interval), for varied scores", () => {
    const cal = separableCalibration();
    const ivap = new InductiveVennAbers(cal);
    for (const s of [-1, 0, 0.1, 0.3, 0.5, 0.7, 0.9, 1, 2]) {
      const pred = ivap.predict(s);
      expect(pred.p0).toBeLessThanOrEqual(pred.p1);
    }
  });

  it("width is always >= 0", () => {
    const cal = separableCalibration();
    const ivap = new InductiveVennAbers(cal);
    for (const s of [-5, 0, 0.25, 0.5, 0.75, 1, 5]) {
      expect(ivap.predict(s).width).toBeGreaterThanOrEqual(0);
    }
  });

  it("pMid is always the midpoint of [p0, p1]", () => {
    const cal = separableCalibration();
    const ivap = new InductiveVennAbers(cal);
    for (const s of [0.1, 0.4, 0.6, 0.9]) {
      const pred = ivap.predict(s);
      expect(pred.pMid).toBeCloseTo((pred.p0 + pred.p1) / 2, 12);
    }
  });

  it("a score far above all calibration scores predicts near 1", () => {
    const cal = separableCalibration();
    const pred = new InductiveVennAbers(cal).predict(10);
    expect(pred.p0).toBeGreaterThan(0.8);
  });

  it("a score far below all calibration scores predicts near 0", () => {
    const cal = separableCalibration();
    const pred = new InductiveVennAbers(cal).predict(-10);
    expect(pred.p1).toBeLessThan(0.2);
  });

  it("every output field stays within [0, 1]", () => {
    const cal = separableCalibration();
    const ivap = new InductiveVennAbers(cal);
    for (const s of [-100, -1, 0, 0.5, 1, 100]) {
      const pred = ivap.predict(s);
      for (const field of [pred.p0, pred.p1, pred.pMid] as const) {
        expect(field).toBeGreaterThanOrEqual(0);
        expect(field).toBeLessThanOrEqual(1);
      }
    }
  });

  it("a tiny calibration set (n=1) never throws and stays ordered", () => {
    const cal: IvapCalibrationPoint[] = [{ score: 0.5, label: 1 }];
    const pred = new InductiveVennAbers(cal).predict(0.5);
    expect(pred.p0).toBeLessThanOrEqual(pred.p1);
    expect(Number.isFinite(pred.p0)).toBe(true);
    expect(Number.isFinite(pred.p1)).toBe(true);
  });

  it("handles a test score tying an existing calibration score without throwing", () => {
    const cal = separableCalibration();
    expect(() => new InductiveVennAbers(cal).predict(cal[10]!.score)).not.toThrow();
  });

  it("handles a calibration set with duplicate scores and conflicting labels", () => {
    const cal: IvapCalibrationPoint[] = [
      { score: 0.5, label: 0 },
      { score: 0.5, label: 1 },
      { score: 0.5, label: 0 },
      { score: 0.5, label: 1 },
    ];
    const pred = new InductiveVennAbers(cal).predict(0.5);
    expect(pred.p0).toBeLessThanOrEqual(pred.p1);
    expect(Number.isFinite(pred.width)).toBe(true);
  });

  it("a well-separated calibration set with a boundary test score yields a narrower interval than a tiny one", () => {
    const big = new InductiveVennAbers(separableCalibration(200)).predict(0.5);
    const small = new InductiveVennAbers(separableCalibration(4)).predict(0.5);
    // More calibration evidence should not make the interval systematically wider.
    expect(big.width).toBeLessThanOrEqual(small.width + 1e-9);
  });
});

describe("fitIvap / ivapPredict convenience wrappers", () => {
  it("fitIvap returns a working InductiveVennAbers instance", () => {
    const cal = separableCalibration();
    const viaFactory = fitIvap(cal).predict(0.5);
    const viaClass = new InductiveVennAbers(cal).predict(0.5);
    expect(viaFactory).toEqual(viaClass);
  });

  it("ivapPredict is a one-shot equivalent of fitIvap(...).predict(...)", () => {
    const cal = separableCalibration();
    expect(ivapPredict(cal, 0.5)).toEqual(fitIvap(cal).predict(0.5));
  });
});
