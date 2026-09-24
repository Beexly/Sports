/**
 * Calibration horse-race — tests (arXiv 2209.14594).
 *
 * ACCEPTANCE GATE: ECE is 0 on perfectly calibrated inputs and positive
 * on miscalibrated ones; Platt recalibration reduces log-loss on a
 * systematically overconfident forecaster; the horse-race declares the
 * better forecaster significant when the gap is real and null when the
 * forecast sets are identical; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  brier,
  ece,
  horserace,
  logLoss,
  plattRecalibrate,
} from "./calibration-horserace";

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

describe("ece", () => {
  it("is 0 when calibrated, positive when not", () => {
    // Perfectly calibrated: each bin's mean prob equals its event rate.
    const cal = ece(
      [0.25, 0.25, 0.25, 0.25, 0.75, 0.75, 0.75, 0.75],
      [0, 0, 1, 0, 1, 1, 1, 0],
    );
    expect(cal).toBeCloseTo(0, 12);
    // Miscalibrated: always says 0.9, events happen half the time.
    const mis = ece(
      [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
      [1, 0, 1, 0, 1, 0, 1, 0],
    );
    expect(mis).toBeCloseTo(0.4, 12);
    expect(() => ece([], [])).toThrow();
  });
});

describe("plattRecalibrate", () => {
  it("fixes a systematically overconfident forecaster", () => {
    const rand = mulberry32(251);
    const probs: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 500; i++) {
      const y = rand() < 0.5 ? 1 : 0;
      outcomes.push(y);
      // Overconfident: pushes toward extremes.
      probs.push(y === 1 ? 0.95 : 0.05);
    }
    const before = logLoss(probs, outcomes);
    const recal = plattRecalibrate(probs, outcomes);
    const after = logLoss(probs.map(recal), outcomes);
    expect(after).toBeLessThan(before);
    expect(() => plattRecalibrate([], [])).toThrow();
  });
});

describe("horserace", () => {
  it("declares a significant winner when the gap is real", () => {
    const rand = mulberry32(253);
    const aProbs: number[] = [];
    const bProbs: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 400; i++) {
      const y = rand() < 0.5 ? 1 : 0;
      outcomes.push(y);
      aProbs.push(y === 1 ? 0.7 : 0.3);
      bProbs.push(0.5);
    }
    const r = horserace(
      { name: "sharp", probs: aProbs, outcomes },
      { name: "flat", probs: bProbs, outcomes },
    );
    expect(r.a.logLoss).toBeLessThan(r.b.logLoss);
    expect(r.winner).toBe("a");
    expect(r.pValue).toBeLessThan(0.05);
  });

  it("is null on identical forecast sets", () => {
    const probs = [0.6, 0.4, 0.7, 0.3];
    const outcomes = [1, 0, 1, 0];
    const r = horserace(
      { name: "x", probs, outcomes },
      { name: "y", probs: [...probs], outcomes: [...outcomes] },
    );
    expect(r.winner).toBeNull();
    expect(r.pValue).toBeCloseTo(1, 6);
    expect(() => horserace({ name: "x", probs: [0.5], outcomes: [1] }, { name: "y", probs: [], outcomes: [] })).toThrow();
  });

  it("brier behaves", () => {
    expect(brier([1, 0], [1, 0])).toBe(0);
    expect(brier([0.5, 0.5], [1, 0])).toBeCloseTo(0.25, 12);
    expect(() => brier([], [])).toThrow();
  });
});
