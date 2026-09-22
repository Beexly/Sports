/**
 * Spline-based probability calibration — tests (arXiv 1809.07751).
 *
 * ACCEPTANCE GATE: spline calibration must reduce log-loss vs. the raw
 * (uncalibrated) scores on synthetic miscalibrated data, stay monotone, and
 * handle empty/degenerate inputs.
 */
import { describe, expect, it } from "vitest";
import {
  calibrateSpline,
  calibratedLogLoss,
  fitSplineCalibrator,
  naturalSplineBasis,
} from "./spline-calibration";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("naturalSplineBasis", () => {
  it("is linear beyond the boundary knots (natural constraint)", () => {
    const knots = [0, 0.25, 0.5, 0.75, 1];
    const b = (x: number): number =>
      naturalSplineBasis(x, knots).reduce((a, v) => a + v, 0);
    // Linearity: second differences are ~0 outside [0, 1].
    const d2 = (x: number): number => b(x - 0.1) - 2 * b(x) + b(x + 0.1);
    expect(Math.abs(d2(-2))).toBeLessThan(1e-9);
    expect(Math.abs(d2(3))).toBeLessThan(1e-9);
  });

  it("throws with fewer than 2 knots", () => {
    expect(() => naturalSplineBasis(0.5, [0.5])).toThrow();
  });
});

describe("fitSplineCalibrator", () => {
  it("repairs overconfident scores: reduces log-loss vs raw", () => {
    const rand = mulberry32(7);
    const scores: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 1200; i++) {
      const p = 0.05 + 0.9 * rand();
      scores.push(p);
      // True calibration curve is S-shaped (raw scores overconfident at extremes).
      const trueP = 1 / (1 + Math.exp(-2.2 * (p - 0.5) * 2));
      outcomes.push(rand() < trueP ? 1 : 0);
    }
    const model = fitSplineCalibrator(scores, outcomes, { nKnots: 5 })!;
    expect(model.lambda).toBeGreaterThan(0);
    expect(model.coef.length).toBe(model.knots.length - 1);
    const raw = (ss: number[], ys: number[]): number => {
      let s = 0;
      for (let i = 0; i < ss.length; i++) {
        const c = Math.min(1 - 1e-12, Math.max(1e-12, ss[i] as number));
        const yi = ys[i] as number;
        s -= yi * Math.log(c) + (1 - yi) * Math.log(1 - c);
      }
      return s / ss.length;
    };
    expect(calibratedLogLoss(model, scores, outcomes)).toBeLessThan(raw(scores, outcomes));
  });

  it("calibrated curve is monotone non-decreasing on clean monotone data", () => {
    const rand = mulberry32(11);
    const scores: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 800; i++) {
      const p = rand();
      scores.push(p);
      outcomes.push(rand() < p ? 1 : 0);
    }
    const model = fitSplineCalibrator(scores, outcomes)!;
    const grid = Array.from({ length: 21 }, (_, i) => i / 20);
    const cal = grid.map((p) => calibrateSpline(model, p));
    for (let i = 1; i < cal.length; i++) {
      expect(cal[i] as number).toBeGreaterThanOrEqual((cal[i - 1] as number) - 1e-6);
    }
  });

  it("compact-logit variant fits in logit space", () => {
    const rand = mulberry32(13);
    const scores: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 500; i++) {
      const p = 0.1 + 0.8 * rand();
      scores.push(p);
      const trueP = 1 / (1 + Math.exp(-3 * (p - 0.5)));
      outcomes.push(rand() < trueP ? 1 : 0);
    }
    const model = fitSplineCalibrator(scores, outcomes, { logitSpace: true })!;
    expect(model.logitSpace).toBe(true);
    const c = calibrateSpline(model, 0.9);
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(1);
    // Logit-space fit also repairs miscalibration on its training data.
    const raw = (ss: number[], ys: number[]): number => {
      let s = 0;
      for (let i = 0; i < ss.length; i++) {
        const cc = Math.min(1 - 1e-12, Math.max(1e-12, ss[i] as number));
        const yi = ys[i] as number;
        s -= yi * Math.log(cc) + (1 - yi) * Math.log(1 - cc);
      }
      return s / ss.length;
    };
    expect(calibratedLogLoss(model, scores, outcomes)).toBeLessThan(raw(scores, outcomes));
  });

  it("returns null on empty input and throws on length mismatch", () => {
    expect(fitSplineCalibrator([], [])).toBeNull();
    expect(() => fitSplineCalibrator([0.5], [1, 0])).toThrow();
    expect(() => calibratedLogLoss({ knots: [0, 1], coef: [0, 0], lambda: 1, logitSpace: false }, [0.5], [1, 0])).toThrow();
  });
});
