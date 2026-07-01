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

// ============================================================
// Load-bearing gate proofs for clarkWestTest().
//
// The earlier modelFavoringSample() helper yields a CONSTANT adjusted value
// (~288 for every row) → variance 0 → tStatistic 0 for ALL n, so it can NEVER
// open the gate. That makes the "n=20 floor" test above pass for the wrong
// reason (deleting `n >= 30` from source would not break it).
//
// These cases build NON-degenerate variance (actual/predicted vary per row) so
// the gate genuinely OPENS, then isolate each closing predicate by changing only
// one thing at a time:
//   - n>=30 floor          (beatGenerator @ 30 vs @ 29)
//   - tStatistic > 1.64    (nearMissTGenerator @ 30)
// ============================================================

// Model is consistently CLOSER to actual than the market, with VARYING gaps so
// the adjusted series has real variance. modelError cycles {-0.5, 0, 0.5};
// marketError cycles 3.0..6.2. Truncating n is the ONLY thing that flips the gate.
function beatGenerator(n: number): ClarkWestSample[] {
  return Array.from({ length: n }, (_, i) => {
    const actual = 20 + (i % 7);
    const modelErr = ((i % 3) - 1) * 0.5;
    const marketErr = 3 + (i % 5) * 0.8;
    return {
      actual,
      modelPrediction: actual - modelErr,
      marketPrediction: actual - marketErr,
    };
  });
}

// n>=30, mean>0, modelMae<marketMae, but ONE dominant outlier among otherwise
// tiny-edge rows holds tStatistic just BELOW 1.64 (~1.07) — isolates that clause.
function nearMissTGenerator(n: number): ClarkWestSample[] {
  return Array.from({ length: n }, (_, i) => {
    const actual = 20;
    const { m, d } = i === 0 ? { m: 10, d: 1 } : { m: 2, d: 1.9 };
    return {
      actual,
      modelPrediction: actual - d,
      marketPrediction: actual - m,
    };
  });
}

describe("clarkWestTest — gate predicates are individually load-bearing", () => {
  it("OPENS the gate (beatsMarket=true) when all four predicates hold at n>=30", () => {
    const r = clarkWestTest(beatGenerator(30));
    // The suite's first true case — proves a regression hardcoding `false`
    // would be caught.
    expect(r.sampleSize).toBe(30);
    expect(r.adjustedMean).toBeGreaterThan(0);
    expect(r.tStatistic).toBeGreaterThan(1.64);
    expect(r.modelMae).toBeLessThan(r.marketMae);
    expect(r.beatsMarket).toBe(true);
  });

  it("n>=30 floor is load-bearing: the SAME generator at n=29 closes the gate", () => {
    const r = clarkWestTest(beatGenerator(29));
    expect(r.sampleSize).toBe(29);
    // Every OTHER predicate still passes at 29 — only the n floor differs, so a
    // dropped `n >= 30` in source would let this through and break the test.
    expect(r.adjustedMean).toBeGreaterThan(0);
    expect(r.tStatistic).toBeGreaterThan(1.64);
    expect(r.modelMae).toBeLessThan(r.marketMae);
    expect(r.beatsMarket).toBe(false);
  });

  it("tStatistic>1.64 clause is load-bearing: n>=30, mean>0, modelMae<marketMae, but tStat just below 1.64 closes the gate", () => {
    const r = clarkWestTest(nearMissTGenerator(30));
    expect(r.sampleSize).toBe(30);
    expect(r.adjustedMean).toBeGreaterThan(0);
    expect(r.modelMae).toBeLessThan(r.marketMae);
    // The ONLY failing predicate is the t-statistic threshold.
    expect(r.tStatistic).toBeLessThan(1.64);
    expect(r.tStatistic).toBeGreaterThan(0);
    expect(r.beatsMarket).toBe(false);
  });
});
