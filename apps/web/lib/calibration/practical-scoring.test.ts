import { describe, it, expect } from "vitest";
import {
  PRACTICAL_SCORE_MIN,
  logScore,
  practicalScore,
  meanPracticalScore,
} from "@/lib/calibration/practical-scoring";

// ============================================================
// arXiv 1808.07501v2 — bounded ("practical") proper scoring rule.
// Additive only; no source edits.
// ============================================================

describe("practical scoring rule — 1808.07501v2", () => {
  it("caps the worst single-forecast loss at s_min = −57.27", () => {
    // Near-certain miss (forecast ~0, outcome 1): log score blows up toward −∞.
    expect(logScore(1e-300, 1)).toBeLessThan(-600);
    // Practical rule caps it.
    expect(practicalScore(1e-300, 1)).toBe(PRACTICAL_SCORE_MIN);
    expect(practicalScore(0, 1)).toBe(PRACTICAL_SCORE_MIN);
  });

  it("agrees with the log rule away from the cap", () => {
    expect(practicalScore(0.7, 1)).toBeCloseTo(Math.log(0.7), 12);
    expect(practicalScore(0.7, 0)).toBeCloseTo(Math.log(0.3), 12);
  });

  it("is proper: expected score is maximized by forecasting the true probability", () => {
    // Under true q = 0.7, E[score] is maximized at p = 0.7.
    const expected = (p: number, q: number) =>
      q * practicalScore(p, 1) + (1 - q) * practicalScore(p, 0);
    const atTruth = expected(0.7, 0.7);
    expect(expected(0.5, 0.7)).toBeLessThan(atTruth);
    expect(expected(0.9, 0.7)).toBeLessThan(atTruth);
    expect(expected(0.2, 0.7)).toBeLessThan(atTruth);
  });

  it("never rewards a confident miss more than a humble one", () => {
    // A 0.99 forecast that loses scores worse than a 0.51 forecast that loses.
    expect(practicalScore(0.99, 0)).toBeLessThan(practicalScore(0.51, 0));
  });

  it("meanPracticalScore averages and handles empty input", () => {
    const samples = [
      { probability: 0.8, outcome: 1 as const },
      { probability: 0.2, outcome: 0 as const },
    ];
    expect(meanPracticalScore(samples)).toBeCloseTo(
      (Math.log(0.8) + Math.log(0.8)) / 2,
      12,
    );
    expect(meanPracticalScore([])).toBe(0);
  });

  it("one disaster no longer dominates a season (the paper's point)", () => {
    const season = Array.from({ length: 100 }, () => ({
      probability: 0.6,
      outcome: 1 as const,
    }));
    const withDisaster = [
      ...season,
      { probability: 1e-300, outcome: 1 as const },
    ];
    const raw =
      withDisaster.reduce((s, x) => s + logScore(x.probability, x.outcome), 0) /
      withDisaster.length;
    const capped = meanPracticalScore(withDisaster);
    // Raw mean is destroyed by the single miss; capped mean stays sane.
    expect(raw).toBeLessThan(-6);
    expect(capped).toBeGreaterThan(-1.5);
  });
});
