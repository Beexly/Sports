import { describe, it, expect } from "vitest";
import {
  InductiveVennAbers,
  ivapPredict,
  type IvapCalibrationPoint,
} from "../calibration/ivap.js";

/**
 * CHARACTERIZATION (freeze) tests for calibration/ivap.ts — added 2026-10-15.
 *
 * The main suite (ivap.test.ts) asserts only inequalities. These tests pin
 * EXACT golden intervals on hand-verifiable calibration sets, plus
 * monotonicity of pMid, input immutability, and the current (unsafe) handling
 * of non-finite scores — flagged as defect candidate D1 in the freeze report.
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

describe("InductiveVennAbers — golden intervals on a two-point calibration set", () => {
  it("below the range: [0, 0.5]", () => {
    expect(ivapPredict(tiny, -1)).toEqual({ p0: 0, p1: 0.5, pMid: 0.25, width: 0.5 });
  });

  it("at the low calibration score: [0, 1]", () => {
    expect(ivapPredict(tiny, 0)).toEqual({ p0: 0, p1: 1, pMid: 0.5, width: 1 });
  });

  it("mid-range: [0, 1] (two points carry no interior resolution)", () => {
    expect(ivapPredict(tiny, 0.5)).toEqual({ p0: 0, p1: 1, pMid: 0.5, width: 1 });
  });

  it("at the high calibration score: [0.5, 1]", () => {
    expect(ivapPredict(tiny, 1)).toEqual({ p0: 0.5, p1: 1, pMid: 0.75, width: 0.5 });
  });

  it("above the range stays [0.5, 1]", () => {
    expect(ivapPredict(tiny, 2)).toEqual({ p0: 0.5, p1: 1, pMid: 0.75, width: 0.5 });
  });
});

describe("InductiveVennAbers — golden intervals on a four-point set", () => {
  it("predict(0.05) = [0, 1/3]", () => {
    const p = ivapPredict(four, 0.05);
    expect(p.p0).toBe(0);
    expect(p.p1).toBeCloseTo(1 / 3, 12);
  });

  it("predict(0.25) = [0, 0.5]", () => {
    const p = ivapPredict(four, 0.25);
    expect(p.p0).toBe(0);
    expect(p.p1).toBeCloseTo(0.5, 12);
  });

  it("predict(0.75) = [0.5, 1]", () => {
    const p = ivapPredict(four, 0.75);
    expect(p.p0).toBeCloseTo(0.5, 12);
    expect(p.p1).toBe(1);
  });

  it("predict(0.95) = [2/3, 1]", () => {
    const p = ivapPredict(four, 0.95);
    expect(p.p0).toBeCloseTo(2 / 3, 12);
    expect(p.p1).toBe(1);
  });

  it("an all-ones calibration set yields [0.5, 1] at mid-range", () => {
    const p = ivapPredict(
      [
        { score: 0.2, label: 1 },
        { score: 0.8, label: 1 },
      ],
      0.5,
    );
    expect(p).toEqual({ p0: 0.5, p1: 1, pMid: 0.75, width: 0.5 });
  });

  it("an all-zeros calibration set yields [0, 0.5] at mid-range", () => {
    const p = ivapPredict(
      [
        { score: 0.2, label: 0 },
        { score: 0.8, label: 0 },
      ],
      0.5,
    );
    expect(p).toEqual({ p0: 0, p1: 0.5, pMid: 0.25, width: 0.5 });
  });
});

describe("InductiveVennAbers — structural pins", () => {
  it("pMid is non-decreasing in the test score on a fixed noisy calibration set", () => {
    const noisy: IvapCalibrationPoint[] = Array.from({ length: 25 }, (_, i) => ({
      score: i / 24,
      label: (i * 7) % 5 < 2 ? 0 : 1,
    })) as IvapCalibrationPoint[];
    const ivap = new InductiveVennAbers(noisy);
    const grid = [-0.2, 0, 0.2, 0.4, 0.5, 0.6, 0.8, 1, 1.2];
    const mids = grid.map((s) => ivap.predict(s).pMid);
    for (let i = 1; i < mids.length; i++) {
      expect(mids[i]!).toBeGreaterThanOrEqual(mids[i - 1]! - 1e-12);
    }
  });

  it("does not mutate or reorder the caller's calibration array", () => {
    const cal: IvapCalibrationPoint[] = [
      { score: 0.9, label: 1 },
      { score: 0.1, label: 0 },
      { score: 0.5, label: 1 },
    ];
    const before = JSON.stringify(cal);
    new InductiveVennAbers(cal).predict(0.5);
    expect(JSON.stringify(cal)).toBe(before);
  });

  it("repeated predict calls on one instance are deterministic", () => {
    const ivap = new InductiveVennAbers(four);
    expect(ivap.predict(0.5)).toEqual(ivap.predict(0.5));
  });
});

describe("InductiveVennAbers — non-finite inputs (defect candidate D1, pinned as-is)", () => {
  it("FLAG: a NaN test score silently returns the top-of-range interval [2/3, 1] on the four-point set", () => {
    // Current behavior pinned deliberately. NaN fails every `s > testScore`
    // comparison, so the test point is inserted at the end and the sort treats
    // NaN as equal-to-everything; the result is a confident interval rather
    // than the uninformative [0.5, 0.5] or a throw. If D1 is fixed, this test
    // is the one that should change — on purpose, with a report note.
    const p = ivapPredict(four, NaN);
    expect(p.p0).toBeCloseTo(2 / 3, 12);
    expect(p.p1).toBe(1);
  });

  it("FLAG: a NaN calibration score does not throw and shifts the interval", () => {
    const p = ivapPredict(
      [
        { score: NaN, label: 1 },
        { score: 0.5, label: 0 },
      ],
      0.5,
    );
    expect(p.p0).toBeCloseTo(0.5, 12);
    expect(p.p1).toBe(1);
  });
});
