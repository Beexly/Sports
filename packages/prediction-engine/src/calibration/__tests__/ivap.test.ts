import { describe, expect, it } from "vitest";
import {
  InductiveVennAbers,
  fitIvap,
  ivapPredict,
  type IvapCalibrationPoint,
} from "../ivap.js";
import { pavIsotonic } from "../pav.js";

/**
 * IVAP verification suite (handoff Task 1.2): empty calibration, extreme
 * scores, monotonicity of the isotonic fit, and coverage-style checks on
 * synthetic exchangeable data.
 *
 * These tests VERIFY the landed algorithm; they do not re-derive it. Where a
 * property is only guaranteed in expectation under exchangeability (coverage),
 * the assertion is written as a loose statistical band with a fixed seed, not
 * a point equality — a tight assertion there would be testing sampling noise.
 */

/** Deterministic LCG so the synthetic-coverage test never flakes. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** True generative model: P(label=1 | score) = logistic(score). */
function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function syntheticCalibration(n: number, seed: number): IvapCalibrationPoint[] {
  const rng = makeRng(seed);
  const pts: IvapCalibrationPoint[] = [];
  for (let i = 0; i < n; i++) {
    const score = (rng() - 0.5) * 8; // roughly [-4, 4]
    const label: 0 | 1 = rng() < logistic(score) ? 1 : 0;
    pts.push({ score, label });
  }
  return pts;
}

describe("IVAP — empty and degenerate calibration sets", () => {
  it("returns the maximally uninformative interval on an empty calibration set", () => {
    const prediction = ivapPredict([], 0.5);

    expect(prediction.p0).toBe(0.5);
    expect(prediction.p1).toBe(0.5);
    expect(prediction.pMid).toBe(0.5);
    expect(prediction.width).toBe(0);
  });

  it("does not throw on a single calibration point", () => {
    const single: IvapCalibrationPoint[] = [{ score: 0, label: 1 }];
    const prediction = ivapPredict(single, 0);

    expect(Number.isFinite(prediction.p0)).toBe(true);
    expect(Number.isFinite(prediction.p1)).toBe(true);
    expect(prediction.p0).toBeLessThanOrEqual(prediction.p1);
  });

  it("handles an all-one-label calibration set without producing NaN", () => {
    const allZero: IvapCalibrationPoint[] = [
      { score: -1, label: 0 },
      { score: 0, label: 0 },
      { score: 1, label: 0 },
    ];
    const allOne: IvapCalibrationPoint[] = allZero.map((p) => ({ ...p, label: 1 as const }));

    for (const set of [allZero, allOne]) {
      const prediction = ivapPredict(set, 0.5);
      expect(Number.isNaN(prediction.p0)).toBe(false);
      expect(Number.isNaN(prediction.p1)).toBe(false);
      expect(prediction.p0).toBeGreaterThanOrEqual(0);
      expect(prediction.p1).toBeLessThanOrEqual(1);
    }
  });
});

describe("IVAP — extreme scores and output invariants", () => {
  const calibration = syntheticCalibration(200, 12345);
  const predictor = fitIvap(calibration);

  it("keeps every output within [0, 1] across a wide score sweep, including far outside the calibration range", () => {
    const testScores = [
      Number.NEGATIVE_INFINITY,
      -1e12,
      -50,
      -4,
      0,
      4,
      50,
      1e12,
      Number.POSITIVE_INFINITY,
    ];

    for (const score of testScores) {
      const prediction = predictor.predict(score);
      expect(prediction.p0).toBeGreaterThanOrEqual(0);
      expect(prediction.p0).toBeLessThanOrEqual(1);
      expect(prediction.p1).toBeGreaterThanOrEqual(0);
      expect(prediction.p1).toBeLessThanOrEqual(1);
      expect(Number.isNaN(prediction.p0)).toBe(false);
      expect(Number.isNaN(prediction.p1)).toBe(false);
    }
  });

  it("always orders the interval p0 <= p1, with width and midpoint consistent with the endpoints", () => {
    for (const score of [-10, -2, 0, 2, 10]) {
      const { p0, p1, pMid, width } = predictor.predict(score);
      expect(p0).toBeLessThanOrEqual(p1);
      expect(width).toBeCloseTo(p1 - p0, 12);
      expect(pMid).toBeCloseTo((p0 + p1) / 2, 12);
    }
  });

  it("produces a NaN-free interval when the test score exactly ties existing calibration scores", () => {
    const tied: IvapCalibrationPoint[] = [
      { score: 1, label: 0 },
      { score: 1, label: 1 },
      { score: 1, label: 1 },
      { score: 2, label: 1 },
    ];
    const prediction = ivapPredict(tied, 1);

    expect(Number.isNaN(prediction.p0)).toBe(false);
    expect(Number.isNaN(prediction.p1)).toBe(false);
    expect(prediction.p0).toBeLessThanOrEqual(prediction.p1);
  });
});

describe("IVAP — monotonicity of the isotonic fit", () => {
  it("is non-decreasing in the test score (pMid never falls as the score rises)", () => {
    const predictor = fitIvap(syntheticCalibration(300, 777));
    const sweep = Array.from({ length: 40 }, (_, i) => -5 + (i * 10) / 39);

    let previous = -Infinity;
    for (const score of sweep) {
      const { pMid } = predictor.predict(score);
      // Isotonic ⇒ non-decreasing. Tolerance absorbs float noise only.
      expect(pMid).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = pMid;
    }
  });

  it("assigns a strictly higher midpoint to a clearly-positive score than a clearly-negative one", () => {
    const predictor = fitIvap(syntheticCalibration(300, 4242));

    const low = predictor.predict(-3.5).pMid;
    const high = predictor.predict(3.5).pMid;

    expect(high).toBeGreaterThan(low);
  });

  it("underlying PAV fit is itself non-decreasing for an arbitrary unsorted label sequence", () => {
    const fitted = pavIsotonic([1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    for (let i = 1; i < fitted.length; i++) {
      expect(fitted[i]!).toBeGreaterThanOrEqual(fitted[i - 1]! - 1e-12);
    }
  });
});

describe("IVAP — coverage on synthetic exchangeable data", () => {
  it("brackets the true generative probability for the large majority of test points", () => {
    const predictor = fitIvap(syntheticCalibration(600, 20260724));
    const rng = makeRng(99);

    let covered = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const score = (rng() - 0.5) * 8;
      const truth = logistic(score);
      const { p0, p1 } = predictor.predict(score);
      // Small tolerance: the multiprobability guarantee is in expectation
      // under exchangeability, not a per-point hard bracket.
      if (truth >= p0 - 0.15 && truth <= p1 + 0.15) covered += 1;
    }

    // Loose band on purpose — this pins "the interval tracks the truth",
    // not an exact coverage rate that would just encode sampling noise.
    expect(covered / trials).toBeGreaterThan(0.8);
  });

  it("narrows the interval as the calibration set grows", () => {
    const testScore = 1.0;
    const widthAt = (n: number) =>
      fitIvap(syntheticCalibration(n, 31337)).predict(testScore).width;

    const small = widthAt(25);
    const large = widthAt(800);

    // More calibration data ⇒ the forced-label perturbation moves the fit less.
    expect(large).toBeLessThan(small);
  });

  it("is deterministic — the same calibration set and score always yield the same interval", () => {
    const calibration = syntheticCalibration(150, 5150);
    const first = new InductiveVennAbers(calibration).predict(0.75);
    const second = new InductiveVennAbers(calibration).predict(0.75);

    expect(second).toEqual(first);
  });
});
