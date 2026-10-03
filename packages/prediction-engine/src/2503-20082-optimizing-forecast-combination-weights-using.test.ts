/**
 * Vitest suite for arXiv:2503.20082 (Optimizing Forecast Combination Weights Using Exponentially Weighted Hit and Win Rate Losses).
 * Gate: ADOPT if on the 2025 holdout the combiner achieves win rate vs. consensus ≥ 55% and beat-the-close rate ≥ 52.5% (the standard -110 breakeven is 52.38%) and Brier score no worse than +1% vs. simple average. REJECT if win rate ≤ 52% or beat-the-close < 52.38%.
 */
import { describe, it, expect } from "vitest";
import { cauchySurrogate, sourceScores, combinationWeights } from "./2503-20082-optimizing-forecast-combination-weights-using";

describe("2503-20082 EW Cauchy-weighted ensemble", () => {
  it("Cauchy surrogate saturates large magnitudes", () => {
    expect(cauchySurrogate(1)).toBeCloseTo(0.5, 10);
    expect(cauchySurrogate(100)).toBeLessThan(1);
    expect(cauchySurrogate(100)).toBeGreaterThan(0.9);
  });
  it("upweights the source that wins where CLV dollars are largest", () => {
    const sources = [
      { source: "a", hits: [1, 1, 1, 1], returns: [0.1, 0.1, 0.1, 0.1] },
      { source: "b", hits: [1, 1, 0, 0], returns: [2.0, 2.0, 0.1, 0.1] },
    ];
    const gaps = [[0.01, 0.01, 0.01, 0.01], [0.3, 0.3, 0.01, 0.01]];
    const scores = sourceScores(sources, gaps, 0.5);
    expect((scores.get("b") ?? 0)).toBeGreaterThan(scores.get("a") ?? 0);
    const w = combinationWeights(scores);
    const sum = [...w.values()].reduce((a, b2) => a + b2, 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(() => combinationWeights(new Map())).toThrow();
  });
});
