import { describe, it, expect } from "vitest";
import { cvapPredict } from "../calibration/cvap.js";
import type { IvapCalibrationPoint } from "../calibration/ivap.js";

/**
 * CHARACTERIZATION (freeze) tests for calibration/cvap.ts — added 2026-10-15.
 *
 * Pins behavior the main suite (cvap.test.ts) does not: the n=1 honest
 * degradation (the fuzz-found leave-nothing-out fix described in the source),
 * negative/zero fold requests, exact seeded goldens on a noisy set, and the
 * non-integer folds quirk flagged as defect candidate D2 in the freeze report.
 */
const tiny: IvapCalibrationPoint[] = [
  { score: 0, label: 0 },
  { score: 1, label: 1 },
];

const four: IvapCalibrationPoint[] = [
  { score: 0.1, label: 0 },
  { score: 0.4, label: 0 },
  { score: 0.6, label: 1 },
  { score: 0.9, label: 1 },
];

const noisy12: IvapCalibrationPoint[] = [
  0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1,
].map((label, i) => ({ score: i / 11, label: label as 0 | 1 }));

describe("cvapPredict — n=1 honest degradation (goldens)", () => {
  it("the fuzz counterexample: [{score:0,label:0}] with folds=2 degrades to ONE inductive fit, foldsUsed=1", () => {
    const p = cvapPredict([{ score: 0, label: 0 }], 0.5, { folds: 2 });
    expect(p.foldsUsed).toBe(1);
    expect(p.foldPredictions).toEqual([{ p0: 0, p1: 1 }]);
    expect(p.p0).toBe(0);
    expect(p.p1).toBe(1);
    expect(p.midpoint).toBe(0.5);
    expect(p.width).toBe(1);
  });

  it("n=1 with label 1 under arithmetic aggregation: [0.5, 1], foldsUsed=1", () => {
    const p = cvapPredict([{ score: 0.3, label: 1 }], 0.5, {
      aggregation: "arithmetic",
    });
    expect(p.foldsUsed).toBe(1);
    expect(p.p0).toBeCloseTo(0.5, 12);
    expect(p.p1).toBe(1);
  });

  it("n=2 with folds=2 runs true leave-one-out: both folds are [0, 1]", () => {
    const p = cvapPredict(tiny, 0.5, { folds: 2, seed: 7 });
    expect(p.foldsUsed).toBe(2);
    expect(p.foldPredictions).toEqual([
      { p0: 0, p1: 1 },
      { p0: 0, p1: 1 },
    ]);
    // Geometric aggregation of [0,1] folds is eps-clamped, not exactly [0,1].
    expect(p.p0).toBeCloseTo(1e-12, 12);
    expect(p.p1).toBeCloseTo(1 - 1e-12, 12);
  });
});

describe("cvapPredict — folds option edges", () => {
  it("folds=0 clamps up to 2", () => {
    expect(cvapPredict(four, 0.5, { folds: 0 }).foldsUsed).toBe(2);
  });

  it("a negative folds request clamps up to 2", () => {
    expect(cvapPredict(noisy12, 0.45, { folds: -3 }).foldsUsed).toBe(2);
  });

  it("FLAG (defect candidate D2): folds=2.5 is not validated — 3 folds run but foldsUsed reports 2.5", () => {
    // Current behavior pinned deliberately. K flows into the fold loop and
    // the foldsUsed field without an integer check, so the reported count is
    // a non-integer that disagrees with foldPredictions.length. If D2 is
    // fixed (validate/coerce to an integer), this test should change on
    // purpose, with a report note.
    const p = cvapPredict(four, 0.5, { folds: 2.5 });
    expect(p.foldPredictions).toHaveLength(3);
    expect(p.foldsUsed).toBe(2.5);
  });
});

describe("cvapPredict — seeded goldens on a noisy 12-point set", () => {
  it("geometric aggregation, seed 123, folds 3, score 0.45", () => {
    const p = cvapPredict(noisy12, 0.45, { seed: 123, folds: 3 });
    expect(p.foldsUsed).toBe(3);
    expect(p.foldPredictions).toHaveLength(3);
    const expectedFolds = [
      { p0: 0, p1: 0.5 },
      { p0: 0.5, p1: 0.8 },
      { p0: 0.4, p1: 2 / 3 },
    ];
    p.foldPredictions.forEach((f, i) => {
      expect(f.p0).toBeCloseTo(expectedFolds[i]!.p0, 12);
      expect(f.p1).toBeCloseTo(expectedFolds[i]!.p1, 12);
    });
    expect(p.p0).toBeCloseTo(0.33056704991805363, 10);
    expect(p.p1).toBeCloseTo(0.6436595897370865, 10);
    expect(p.midpoint).toBeCloseTo(0.48711331982757006, 10);
    expect(p.width).toBeCloseTo(0.31309253981903284, 10);
  });

  it("arithmetic aggregation, seed 123, folds 3, score 0.45", () => {
    const p = cvapPredict(noisy12, 0.45, {
      seed: 123,
      folds: 3,
      aggregation: "arithmetic",
    });
    expect(p.p0).toBeCloseTo(0.3, 12);
    expect(p.p1).toBeCloseTo(0.6555555555555556, 10);
  });

  it("the default seed is deterministic across calls (full-object equality)", () => {
    expect(cvapPredict(noisy12, 0.45)).toEqual(cvapPredict(noisy12, 0.45));
  });
});
