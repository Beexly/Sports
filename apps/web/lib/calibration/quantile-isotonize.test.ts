import { describe, it, expect } from "vitest";
import { sortQuantiles, pavaIsotonic, isNonCrossing } from "@/lib/calibration/quantile-isotonize";

// ============================================================
// arXiv 2103.00083 — post-sort isotonization for quantile vectors.
// Additive only; no source edits.
// ============================================================

describe("quantile isotonization — 2103.00083", () => {
  it("sortQuantiles enforces non-crossing (Prop. 2)", () => {
    const crossed = [0.9, 0.3, 0.7, 0.1, 0.5];
    expect(isNonCrossing(crossed)).toBe(false);
    const fixed = sortQuantiles(crossed);
    expect(isNonCrossing(fixed)).toBe(true);
    expect(fixed).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
    // Input untouched.
    expect(crossed).toEqual([0.9, 0.3, 0.7, 0.1, 0.5]);
  });

  it("sortQuantiles is a no-op on already-sorted input", () => {
    expect(sortQuantiles([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("sortQuantiles handles empty input", () => {
    expect(sortQuantiles([])).toEqual([]);
  });

  it("pavaIsotonic pools adjacent violators by block averaging", () => {
    // Classic example: [3, 1, 2] -> blocks merge to [2, 2, 2].
    expect(pavaIsotonic([3, 1, 2])).toEqual([2, 2, 2]);
  });

  it("pavaIsotonic output is always non-decreasing", () => {
    const noisy = [5, 3, 4, 1, 2, 6, 0, 7];
    const out = pavaIsotonic(noisy);
    expect(isNonCrossing(out)).toBe(true);
    // Same length, mean preserved (isotonic regression preserves the mean).
    expect(out.length).toBe(noisy.length);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(out)).toBeCloseTo(mean(noisy), 10);
  });

  it("pavaIsotonic leaves monotone input unchanged", () => {
    expect(pavaIsotonic([1, 2, 2, 5])).toEqual([1, 2, 2, 5]);
  });

  it("pavaIsotonic handles empty and single-element input", () => {
    expect(pavaIsotonic([])).toEqual([]);
    expect(pavaIsotonic([4])).toEqual([4]);
  });
});
