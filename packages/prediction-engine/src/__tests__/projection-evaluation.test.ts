import { describe, it, expect } from "vitest";
import { clarkWestTest, type ClarkWestSample } from "../projection-evaluation.js";

// ============================================================
// Fail-closed boundary coverage for clarkWestTest().
// tweedie-baseline.test.ts has one happy-path case via re-export but
// does NOT pin the gate edges. The honest gate is:
//   beatsMarket = n >= 30 && mean > 0 && tStatistic > 1.64 && modelMae < marketMae
// These tests prove the floor holds and no NaN/divide-by-zero leaks.
// ============================================================

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

// A sample where the model massively beats the market (model nails actual,
// market is far off) — used to confirm the n>=30 floor still gates it out.
function modelFavoringSample(actual: number): ClarkWestSample {
  return { actual, modelPrediction: actual, marketPrediction: actual + 12 };
}

describe("clarkWestTest — fail-closed boundaries", () => {
  it("returns all-zero, beatsMarket=false (no NaN) for empty samples", () => {
    const r = clarkWestTest([]);
    expect(r.sampleSize).toBe(0);
    expect(r.modelMae).toBe(0);
    expect(r.marketMae).toBe(0);
    expect(r.adjustedMean).toBe(0);
    expect(r.tStatistic).toBe(0);
    expect(r.beatsMarket).toBe(false);
    expect(Number.isNaN(r.tStatistic)).toBe(false);
    expect(Number.isNaN(r.adjustedMean)).toBe(false);
  });

  it("keeps beatsMarket=false below the n>=30 floor even with a strong model signal", () => {
    const samples = Array.from({ length: 20 }, (_, i) => modelFavoringSample(10 + i));
    const r = clarkWestTest(samples);
    expect(r.sampleSize).toBe(20);
    // Model genuinely beats market here, but the out-of-sample floor gates it.
    expect(r.modelMae).toBeLessThan(r.marketMae);
    expect(r.beatsMarket).toBe(false);
  });

  it("returns adjustedMean 0, tStatistic 0, beatsMarket false when model==market (gap 0) across >=30 samples", () => {
    const samples: ClarkWestSample[] = Array.from({ length: 30 }, (_, i) => ({
      actual: 10 + i,
      modelPrediction: 12 + i,
      marketPrediction: 12 + i,
    }));
    const r = clarkWestTest(samples);
    expect(r.sampleSize).toBe(30);
    expect(r.adjustedMean).toBe(0);
    expect(r.tStatistic).toBe(0);
    expect(r.beatsMarket).toBe(false);
  });

  it("yields tStatistic 0 (no divide-by-zero) and beatsMarket false for a single sample", () => {
    const r = clarkWestTest([modelFavoringSample(10)]);
    expect(r.sampleSize).toBe(1);
    expect(r.tStatistic).toBe(0);
    expect(Number.isFinite(r.tStatistic)).toBe(true);
    expect(r.beatsMarket).toBe(false);
  });

  it("rounds all numeric outputs to 4 decimal places", () => {
    const samples: ClarkWestSample[] = [
      { actual: 10, modelPrediction: 9.33333, marketPrediction: 7.11111 },
      { actual: 14, modelPrediction: 13.77777, marketPrediction: 11.22222 },
      { actual: 8, modelPrediction: 8.66666, marketPrediction: 6.55555 },
    ];
    const r = clarkWestTest(samples);
    for (const value of [r.modelMae, r.marketMae, r.adjustedMean, r.tStatistic]) {
      expect(value).toBe(round4(value));
    }
  });

  it("is deterministic for identical samples", () => {
    const samples = Array.from({ length: 12 }, (_, i) => ({
      actual: 10 + i,
      modelPrediction: 9.5 + i,
      marketPrediction: 8 + i,
    }));
    expect(clarkWestTest(samples)).toEqual(clarkWestTest(samples));
  });
});
