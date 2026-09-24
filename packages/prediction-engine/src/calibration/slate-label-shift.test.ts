import { describe, expect, it } from "vitest";
import { archetypeBaseRate, calibrationDrift, correctSlate, labelShiftCorrect } from "./slate-label-shift";

describe("slate-label-shift", () => {
  it("labelShiftCorrect is identity when pi1 == pi0", () => {
    expect(labelShiftCorrect(0.7, 0.5, 0.5)).toBeCloseTo(0.7, 12);
    expect(labelShiftCorrect(0, 0.5, 0.6)).toBeCloseTo(0, 12);
    expect(labelShiftCorrect(1, 0.5, 0.6)).toBeCloseTo(1, 12);
  });
  it("shifts toward the archetype base rate", () => {
    // Archetype runs hotter (0.6 vs 0.5): probabilities move up.
    expect(labelShiftCorrect(0.5, 0.5, 0.6)).toBeCloseTo(0.6, 12);
    expect(labelShiftCorrect(0.7, 0.5, 0.6)).toBeGreaterThan(0.7);
    expect(labelShiftCorrect(0.7, 0.5, 0.4)).toBeLessThan(0.7);
  });
  it("correctSlate reduces calibration drift on a shifted slate", () => {
    const probs = [0.55, 0.6, 0.5, 0.65, 0.58];
    const before = calibrationDrift(probs, 0.68);
    const after = calibrationDrift(correctSlate(probs, 0.5, 0.68), 0.68);
    expect(after).toBeLessThan(before);
  });
  it("archetypeBaseRate smooths small samples toward the prior", () => {
    expect(archetypeBaseRate([1, 1, 1], 0.5, 10)).toBeCloseTo(8 / 13, 12);
    expect(archetypeBaseRate([], 0.5, 10)).toBeCloseTo(0.5, 12);
    expect(archetypeBaseRate([1], 0.5, 100)).toBeLessThan(0.6);
  });
  it("throws on degenerate inputs", () => {
    expect(() => labelShiftCorrect(1.5, 0.5, 0.5)).toThrow();
    expect(() => labelShiftCorrect(0.5, 0, 0.5)).toThrow();
    expect(() => calibrationDrift([], 0.5)).toThrow();
  });
});
