import { describe, expect, it } from "vitest";
import { calibrateWithTeacher, ebBackoff, fitTeacherMap, TEACHER_BACKOFF_M } from "./teacher-calibration";

describe("teacher-calibration", () => {
  it("ebBackoff shrinks small bins toward the base rate (M=25)", () => {
    expect(TEACHER_BACKOFF_M).toBe(25);
    // 1 hit in 2 trials, base 0.5 -> (1 + 25*0.5)/27 = 0.5
    expect(ebBackoff(1, 2, 0.5)).toBeCloseTo(0.5, 12);
    // Large bin trusts its empirical rate: 80/100, base 0.5 -> (80+12.5)/125
    expect(ebBackoff(80, 100, 0.5)).toBeCloseTo(92.5 / 125, 12);
    // Empty bin falls back exactly to base.
    expect(ebBackoff(0, 0, 0.3)).toBeCloseTo(0.3, 12);
  });
  it("fitTeacherMap recovers a known calibration curve", () => {
    const probs: number[] = [];
    const outs: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const p = (i % 10) / 10 + 0.05;
      probs.push(p);
      outs.push(i % 3 === 0 ? 1 : 0); // empirical rate ~1/3 regardless of p
    }
    const bins = fitTeacherMap(probs, outs, 10);
    expect(bins.length).toBe(10);
    for (const b of bins) expect(b.rate).toBeCloseTo(1 / 3, 1);
  });
  it("calibrateWithTeacher interpolates between bin centers", () => {
    const bins = [
      { center: 0.25, rate: 0.2, n: 100 },
      { center: 0.75, rate: 0.8, n: 100 },
    ];
    expect(calibrateWithTeacher(0.25, bins)).toBeCloseTo(0.2, 12);
    expect(calibrateWithTeacher(0.75, bins)).toBeCloseTo(0.8, 12);
    expect(calibrateWithTeacher(0.5, bins)).toBeCloseTo(0.5, 12);
    expect(calibrateWithTeacher(0, bins)).toBeCloseTo(0.2, 12);
    expect(calibrateWithTeacher(1, bins)).toBeCloseTo(0.8, 12);
  });
  it("throws on degenerate inputs", () => {
    expect(() => ebBackoff(1, 2, 2)).toThrow();
    expect(() => ebBackoff(-1, 2, 0.5)).toThrow();
    expect(() => fitTeacherMap([], [], 5)).toThrow();
    expect(() => fitTeacherMap([0.5], [2], 5)).toThrow();
    expect(() => calibrateWithTeacher(0.5, [])).toThrow();
  });
});
