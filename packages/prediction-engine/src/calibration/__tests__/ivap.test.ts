import { describe, expect, it } from "vitest";
import {
  fitIvap,
  ivapPredict,
  InductiveVennAbers,
  type IvapCalibrationPoint,
} from "../ivap.js";

/** Deterministic PRNG (mulberry32) so property tests never flake. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic exchangeable set where the score IS the true generating probability. */
function makeWellSpecifiedCalibration(n: number, rng: () => number): IvapCalibrationPoint[] {
  const points: IvapCalibrationPoint[] = [];
  for (let i = 0; i < n; i++) {
    const score = (i + 0.5) / n; // spread evenly across (0, 1)
    const label = rng() < score ? 1 : 0;
    points.push({ score, label });
  }
  return points;
}

describe("IVAP — empty calibration set", () => {
  it("ivapPredict returns the uninformative (0.5, 0.5) default", () => {
    const pred = ivapPredict([], 0.7);
    expect(pred.p0).toBe(0.5);
    expect(pred.p1).toBe(0.5);
    expect(pred.pMid).toBe(0.5);
    expect(pred.width).toBe(0);
  });

  it("InductiveVennAbers constructed with [] behaves the same as ivapPredict", () => {
    const model = fitIvap([]);
    const pred = model.predict(-100);
    expect(pred).toEqual({ p0: 0.5, p1: 0.5, pMid: 0.5, width: 0 });
  });
});

describe("IVAP — extreme scores", () => {
  // Clean separation: low half of the calibration range is always label 0,
  // high half is always label 1.
  const calibration: IvapCalibrationPoint[] = Array.from({ length: 20 }, (_, i) => {
    const score = i / 19;
    return { score, label: score >= 0.5 ? 1 : 0 } as const;
  });
  const model = fitIvap(calibration);

  it("a score far below every calibration point produces an interval near 0", () => {
    const pred = model.predict(-5);
    expect(pred.p0).toBeLessThan(0.15);
    expect(pred.p1).toBeLessThan(0.15);
  });

  it("a score far above every calibration point produces an interval near 1", () => {
    const pred = model.predict(5);
    expect(pred.p0).toBeGreaterThan(0.85);
    expect(pred.p1).toBeGreaterThan(0.85);
  });

  it("always returns values clamped to [0, 1] regardless of input", () => {
    for (const testScore of [-1e9, -1, 0, 0.5, 1, 1e9, NaN]) {
      const pred = model.predict(testScore);
      expect(pred.p0).toBeGreaterThanOrEqual(0);
      expect(pred.p1).toBeLessThanOrEqual(1);
      expect(pred.p0).toBeLessThanOrEqual(pred.p1);
    }
  });
});

describe("IVAP — monotonicity of the isotonic fit", () => {
  it("pMid is non-decreasing as the test score increases, for a monotone-truth calibration set", () => {
    const rng = mulberry32(42);
    const calibration = makeWellSpecifiedCalibration(120, rng);
    const model = fitIvap(calibration);

    const testScores = Array.from({ length: 41 }, (_, i) => i / 40);
    const predictions = testScores.map((s) => model.predict(s));

    for (let i = 1; i < predictions.length; i++) {
      const prev = predictions[i - 1]!;
      const curr = predictions[i]!;
      // Isotonic regression is non-decreasing; allow tiny floating-point slack.
      expect(curr.pMid).toBeGreaterThanOrEqual(prev.pMid - 1e-9);
      expect(curr.p0).toBeGreaterThanOrEqual(prev.p0 - 1e-9);
      expect(curr.p1).toBeGreaterThanOrEqual(prev.p1 - 1e-9);
    }
  });

  it("p0 never exceeds p1 for any test score", () => {
    const rng = mulberry32(7);
    const calibration = makeWellSpecifiedCalibration(60, rng);
    const model = fitIvap(calibration);
    for (let i = 0; i <= 20; i++) {
      const pred = model.predict(i / 20);
      expect(pred.p0).toBeLessThanOrEqual(pred.p1);
      expect(pred.width).toBeCloseTo(pred.p1 - pred.p0, 9);
    }
  });
});

describe("IVAP — coverage properties on synthetic exchangeable data", () => {
  it("the [p0, p1] interval brackets the true generating probability for most test points", () => {
    const rng = mulberry32(1234);
    const calibration = makeWellSpecifiedCalibration(300, rng);
    const model = fitIvap(calibration);

    const trials = 200;
    let covered = 0;
    for (let i = 0; i < trials; i++) {
      const trueProb = rng();
      const pred = model.predict(trueProb);
      // Small slack for isotonic step discretization near the boundary.
      if (pred.p0 - 0.05 <= trueProb && trueProb <= pred.p1 + 0.05) {
        covered += 1;
      }
    }
    expect(covered / trials).toBeGreaterThan(0.8);
  });

  it("predictions track the monotone score->probability relationship on average", () => {
    const rng = mulberry32(99);
    const calibration = makeWellSpecifiedCalibration(400, rng);
    const model = fitIvap(calibration);

    const lowBand = model.predict(0.1);
    const midBand = model.predict(0.5);
    const highBand = model.predict(0.9);

    expect(lowBand.pMid).toBeLessThan(midBand.pMid);
    expect(midBand.pMid).toBeLessThan(highBand.pMid);
    expect(lowBand.pMid).toBeLessThan(0.35);
    expect(highBand.pMid).toBeGreaterThan(0.65);
  });
});

describe("IVAP — width behavior vs calibration set size", () => {
  it("average interval width shrinks as the calibration set grows", () => {
    const smallRng = mulberry32(2024);
    const largeRng = mulberry32(2024);
    const smallCal = makeWellSpecifiedCalibration(20, smallRng);
    const largeCal = makeWellSpecifiedCalibration(400, largeRng);

    const smallModel = fitIvap(smallCal);
    const largeModel = fitIvap(largeCal);

    const probes = Array.from({ length: 21 }, (_, i) => i / 20);
    const avgWidth = (model: InductiveVennAbers): number =>
      probes.reduce((sum, s) => sum + model.predict(s).width, 0) / probes.length;

    expect(avgWidth(largeModel)).toBeLessThan(avgWidth(smallModel));
  });

  it("width is zero-ish (fully determined) only in degenerate single-point calibration", () => {
    const single: IvapCalibrationPoint[] = [{ score: 0.5, label: 1 }];
    const model = fitIvap(single);
    const pred = model.predict(0.9);
    expect(pred.width).toBeGreaterThanOrEqual(0);
    expect(pred.p1).toBeGreaterThanOrEqual(pred.p0);
  });
});
