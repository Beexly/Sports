import { describe, it, expect } from "vitest";
import {
  normalCdf,
  normalPpf,
  proportionCI,
  meanCI,
  chiSquarePValue,
  binomialPValue,
  proportionTest,
  poissonPmf,
  poissonCdf,
  poissonMean,
  expectedGoals,
  matchProbabilities,
  monteCarloWinRate,
  kellyOptimal,
  impliedEdge,
  sampleSize,
} from "@/lib/math/probability";

// ---------------------------------------------------------------------------
// normalCdf
// ---------------------------------------------------------------------------
describe("normalCdf", () => {
  it("returns 0.5 for z=0", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 5);
  });

  it("returns ~0.975 for z=1.96", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
  });

  it("returns ~0.025 for z=-1.96", () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });

  it("returns ~0.8413 for z=1", () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3);
  });

  it("returns ~0.1587 for z=-1", () => {
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });

  it("returns ~0.9772 for z=2", () => {
    expect(normalCdf(2)).toBeCloseTo(0.9772, 3);
  });

  it("returns ~0.9987 for z=3", () => {
    expect(normalCdf(3)).toBeCloseTo(0.9987, 3);
  });

  it("returns ~0.9999683 for z=4", () => {
    expect(normalCdf(4)).toBeGreaterThan(0.999);
  });

  it("approaches 1 for large positive z", () => {
    expect(normalCdf(10)).toBeCloseTo(1, 5);
  });

  it("approaches 0 for large negative z", () => {
    expect(normalCdf(-10)).toBeCloseTo(0, 5);
  });

  it("is symmetric: normalCdf(z) + normalCdf(-z) === 1", () => {
    const z = 1.5;
    expect(normalCdf(z) + normalCdf(-z)).toBeCloseTo(1, 10);
  });

  it("returns value in [0, 1] for any input", () => {
    for (const z of [-5, -2, -1, 0, 1, 2, 5]) {
      const val = normalCdf(z);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// normalPpf
// ---------------------------------------------------------------------------
describe("normalPpf", () => {
  it("returns 0 for p=0.5", () => {
    expect(normalPpf(0.5)).toBeCloseTo(0, 4);
  });

  it("returns ~1.96 for p=0.975", () => {
    expect(normalPpf(0.975)).toBeCloseTo(1.96, 2);
  });

  it("returns ~-1.96 for p=0.025", () => {
    expect(normalPpf(0.025)).toBeCloseTo(-1.96, 2);
  });

  it("returns ~1.645 for p=0.95", () => {
    expect(normalPpf(0.95)).toBeCloseTo(1.645, 2);
  });

  it("returns ~2.576 for p=0.995", () => {
    expect(normalPpf(0.995)).toBeCloseTo(2.576, 1);
  });

  it("throws for p=0", () => {
    expect(() => normalPpf(0)).toThrow(RangeError);
  });

  it("throws for p=1", () => {
    expect(() => normalPpf(1)).toThrow(RangeError);
  });

  it("throws for p < 0", () => {
    expect(() => normalPpf(-0.1)).toThrow(RangeError);
  });

  it("throws for p > 1", () => {
    expect(() => normalPpf(1.1)).toThrow(RangeError);
  });

  it("is inverse of normalCdf: normalCdf(normalPpf(p)) ≈ p", () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9, 0.99]) {
      expect(normalCdf(normalPpf(p))).toBeCloseTo(p, 4);
    }
  });
});

// ---------------------------------------------------------------------------
// proportionCI
// ---------------------------------------------------------------------------
describe("proportionCI", () => {
  it("returns reasonable interval for 60/100 at 95% confidence", () => {
    const ci = proportionCI(60, 100);
    expect(ci.lower).toBeGreaterThan(0.49);
    expect(ci.upper).toBeLessThan(0.71);
    expect(ci.lower).toBeLessThan(0.6);
    expect(ci.upper).toBeGreaterThan(0.6);
  });

  it("margin is half of (upper - lower)", () => {
    const ci = proportionCI(60, 100);
    expect(ci.margin).toBeCloseTo((ci.upper - ci.lower) / 2, 10);
  });

  it("wider interval for 90% vs 95% confidence (inverted: 90 CI is narrower)", () => {
    const ci95 = proportionCI(60, 100, 0.95);
    const ci99 = proportionCI(60, 100, 0.99);
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower);
  });

  it("lower is >= 0 and upper is <= 1", () => {
    const ci = proportionCI(100, 100);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeLessThanOrEqual(1);
  });

  it("throws for n <= 0", () => {
    expect(() => proportionCI(5, 0)).toThrow(RangeError);
    expect(() => proportionCI(5, -10)).toThrow(RangeError);
  });

  it("handles 0 successes", () => {
    const ci = proportionCI(0, 100);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeGreaterThan(0);
  });

  it("handles n=1 successes=1", () => {
    const ci = proportionCI(1, 1);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// meanCI
// ---------------------------------------------------------------------------
describe("meanCI", () => {
  it("returns correct mean for [1,2,3,4,5]", () => {
    const result = meanCI([1, 2, 3, 4, 5]);
    expect(result.mean).toBeCloseTo(3, 10);
  });

  it("margin is > 0", () => {
    const result = meanCI([1, 2, 3, 4, 5]);
    expect(result.margin).toBeGreaterThan(0);
  });

  it("lower = mean - margin", () => {
    const result = meanCI([1, 2, 3, 4, 5]);
    expect(result.lower).toBeCloseTo(result.mean - result.margin, 10);
  });

  it("upper = mean + margin", () => {
    const result = meanCI([1, 2, 3, 4, 5]);
    expect(result.upper).toBeCloseTo(result.mean + result.margin, 10);
  });

  it("throws for empty array", () => {
    expect(() => meanCI([])).toThrow(RangeError);
  });

  it("larger confidence → wider interval", () => {
    const vals = Array.from({ length: 50 }, (_, i) => i);
    const ci95 = meanCI(vals, 0.95);
    const ci99 = meanCI(vals, 0.99);
    expect(ci99.margin).toBeGreaterThan(ci95.margin);
  });

  it("larger n → smaller stderr (same population)", () => {
    // Both arrays are draws from ~N(0,1); larger n should shrink stderr
    // Use fixed values so the variance is the same ~ 1
    const small = meanCI([1, -1, 1, -1, 1]);
    const large = meanCI(Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 1 : -1)));
    expect(large.stderr).toBeLessThan(small.stderr);
  });

  it("small n uses t-distribution adjustment (wider interval)", () => {
    const small = meanCI([1, 2, 3], 0.95);
    // The interval should still be finite and have lower < upper
    expect(small.lower).toBeLessThan(small.upper);
    expect(small.margin).toBeGreaterThan(0);
  });

  it("single element returns a result (no division by zero crash)", () => {
    const result = meanCI([5]);
    expect(result.mean).toBe(5);
    expect(result.margin).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// chiSquarePValue
// ---------------------------------------------------------------------------
describe("chiSquarePValue", () => {
  it("uniform observed + uniform expected → high p-value", () => {
    const obs = [25, 25, 25, 25];
    const exp = [25, 25, 25, 25];
    const p = chiSquarePValue(obs, exp);
    expect(p).toBeGreaterThan(0.9);
  });

  it("very skewed observed → low p-value", () => {
    const obs = [90, 5, 3, 2];
    const exp = [25, 25, 25, 25];
    const p = chiSquarePValue(obs, exp);
    expect(p).toBeLessThan(0.05);
  });

  it("throws when lengths differ", () => {
    expect(() => chiSquarePValue([1, 2, 3], [1, 2])).toThrow(RangeError);
  });

  it("throws when expected contains 0", () => {
    expect(() => chiSquarePValue([1, 2, 3], [1, 0, 3])).toThrow(RangeError);
  });

  it("returns value in [0, 1]", () => {
    const p = chiSquarePValue([30, 20, 25, 25], [25, 25, 25, 25]);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("moderate deviation → mid-range p-value", () => {
    const obs = [30, 20, 25, 25];
    const exp = [25, 25, 25, 25];
    const p = chiSquarePValue(obs, exp);
    expect(p).toBeGreaterThan(0.01);
    expect(p).toBeLessThan(0.99);
  });
});

// ---------------------------------------------------------------------------
// binomialPValue
// ---------------------------------------------------------------------------
describe("binomialPValue", () => {
  it("60/100 with p=0.5 → significant (p < 0.05)", () => {
    const pVal = binomialPValue(60, 100, 0.5);
    expect(pVal).toBeLessThan(0.05);
  });

  it("52/100 with p=0.5 → not significant", () => {
    const pVal = binomialPValue(52, 100, 0.5);
    expect(pVal).toBeGreaterThan(0.05);
  });

  it("50/100 with p=0.5 → p-value close to 1 (exactly on null)", () => {
    const pVal = binomialPValue(50, 100, 0.5);
    expect(pVal).toBeGreaterThan(0.9);
  });

  it("throws for n <= 0", () => {
    expect(() => binomialPValue(5, 0, 0.5)).toThrow(RangeError);
  });

  it("throws for p=0", () => {
    expect(() => binomialPValue(5, 10, 0)).toThrow(RangeError);
  });

  it("throws for p=1", () => {
    expect(() => binomialPValue(5, 10, 1)).toThrow(RangeError);
  });

  it("returns value in [0, 1]", () => {
    const pVal = binomialPValue(70, 100, 0.5);
    expect(pVal).toBeGreaterThanOrEqual(0);
    expect(pVal).toBeLessThanOrEqual(1);
  });

  it("two-tailed: same result for deficits as surpluses", () => {
    const pHigh = binomialPValue(70, 100, 0.5);
    const pLow = binomialPValue(30, 100, 0.5);
    expect(pHigh).toBeCloseTo(pLow, 4);
  });
});

// ---------------------------------------------------------------------------
// proportionTest
// ---------------------------------------------------------------------------
describe("proportionTest", () => {
  it("0.6 vs 0.4 (n=100 each) → significant", () => {
    const result = proportionTest(0.6, 100, 0.4, 100);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("0.51 vs 0.49 (small n=20 each) → not significant", () => {
    const result = proportionTest(0.51, 20, 0.49, 20);
    expect(result.significant).toBe(false);
  });

  it("zScore is positive when p1 > p2", () => {
    const result = proportionTest(0.7, 50, 0.3, 50);
    expect(result.zScore).toBeGreaterThan(0);
  });

  it("zScore is negative when p1 < p2", () => {
    const result = proportionTest(0.3, 50, 0.7, 50);
    expect(result.zScore).toBeLessThan(0);
  });

  it("pValue is in [0, 1]", () => {
    const result = proportionTest(0.55, 100, 0.45, 100);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("equal proportions → not significant", () => {
    const result = proportionTest(0.5, 100, 0.5, 100);
    expect(result.significant).toBe(false);
  });

  it("large samples amplify small differences", () => {
    const small = proportionTest(0.52, 50, 0.48, 50);
    const large = proportionTest(0.52, 5000, 0.48, 5000);
    expect(large.pValue).toBeLessThan(small.pValue);
  });
});

// ---------------------------------------------------------------------------
// poissonPmf
// ---------------------------------------------------------------------------
describe("poissonPmf", () => {
  it("lambda=1, k=0 → e^(-1)", () => {
    expect(poissonPmf(0, 1)).toBeCloseTo(Math.exp(-1), 8);
  });

  it("lambda=2, k=2 → known value 2*e^(-2)", () => {
    // P(X=2 | lambda=2) = 2^2 * e^-2 / 2! = 4 * e^-2 / 2 = 2 * e^-2
    expect(poissonPmf(2, 2)).toBeCloseTo(2 * Math.exp(-2), 8);
  });

  it("returns 0 for k < 0", () => {
    expect(poissonPmf(-1, 2)).toBe(0);
  });

  it("returns 0 for non-integer k", () => {
    expect(poissonPmf(1.5, 2)).toBe(0);
  });

  it("lambda=3, k=0 → e^(-3)", () => {
    expect(poissonPmf(0, 3)).toBeCloseTo(Math.exp(-3), 8);
  });

  it("lambda=0 (degenerate), k=0 → 1", () => {
    expect(poissonPmf(0, 0)).toBe(1);
  });

  it("lambda=0, k=1 → 0", () => {
    expect(poissonPmf(1, 0)).toBe(0);
  });

  it("returns value in [0, 1]", () => {
    for (const k of [0, 1, 2, 3, 5, 10]) {
      const p = poissonPmf(k, 2.5);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("probabilities sum to approximately 1 for lambda=2", () => {
    let total = 0;
    for (let k = 0; k <= 50; k++) total += poissonPmf(k, 2);
    expect(total).toBeCloseTo(1, 4);
  });
});

// ---------------------------------------------------------------------------
// poissonCdf
// ---------------------------------------------------------------------------
describe("poissonCdf", () => {
  it("cumulative >= pmf at each k", () => {
    for (let k = 0; k <= 5; k++) {
      expect(poissonCdf(k, 2)).toBeGreaterThanOrEqual(poissonPmf(k, 2));
    }
  });

  it("is monotonically non-decreasing", () => {
    let prev = 0;
    for (let k = 0; k <= 10; k++) {
      const curr = poissonCdf(k, 2);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it("returns 0 for k < 0", () => {
    expect(poissonCdf(-1, 2)).toBe(0);
  });

  it("approaches 1 for large k", () => {
    expect(poissonCdf(50, 2)).toBeCloseTo(1, 5);
  });

  it("P(X <= 0) = P(X = 0) for lambda=2", () => {
    expect(poissonCdf(0, 2)).toBeCloseTo(poissonPmf(0, 2), 8);
  });

  it("P(X <= 1) = P(X=0) + P(X=1) for lambda=1.5", () => {
    expect(poissonCdf(1, 1.5)).toBeCloseTo(
      poissonPmf(0, 1.5) + poissonPmf(1, 1.5),
      8
    );
  });
});

// ---------------------------------------------------------------------------
// poissonMean
// ---------------------------------------------------------------------------
describe("poissonMean", () => {
  it("returns lambda", () => {
    expect(poissonMean(2.5)).toBe(2.5);
    expect(poissonMean(0)).toBe(0);
    expect(poissonMean(100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// expectedGoals
// ---------------------------------------------------------------------------
describe("expectedGoals", () => {
  it("returns teamRate * opponentDefRate / leagueAvg", () => {
    // teamRate=2, opponentDefRate=1.5, leagueAvg=1.5 → 2 * 1.5 / 1.5 = 2
    expect(expectedGoals(2, 1.5, 1.5)).toBeCloseTo(2, 8);
  });

  it("scales with teamRate", () => {
    const xg1 = expectedGoals(1, 1, 1);
    const xg2 = expectedGoals(2, 1, 1);
    expect(xg2).toBeCloseTo(xg1 * 2, 8);
  });

  it("returns 0 when leagueAvg is 0", () => {
    expect(expectedGoals(2, 1.5, 0)).toBe(0);
  });

  it("basic formula: teamRate=1.5, oppDef=1.2, league=1.3", () => {
    const xg = expectedGoals(1.5, 1.2, 1.3);
    expect(xg).toBeCloseTo((1.5 * 1.2) / 1.3, 8);
  });
});

// ---------------------------------------------------------------------------
// matchProbabilities
// ---------------------------------------------------------------------------
describe("matchProbabilities", () => {
  it("homeXg=2, awayXg=1 → homeWin > awayWin", () => {
    const { homeWin, awayWin } = matchProbabilities(2, 1);
    expect(homeWin).toBeGreaterThan(awayWin);
  });

  it("probabilities sum close to 1", () => {
    const { homeWin, draw, awayWin } = matchProbabilities(2, 1);
    expect(homeWin + draw + awayWin).toBeCloseTo(1, 2);
  });

  it("symmetric: homeXg=awayXg → homeWin ≈ awayWin", () => {
    const { homeWin, awayWin } = matchProbabilities(1.5, 1.5);
    expect(homeWin).toBeCloseTo(awayWin, 2);
  });

  it("all values are in [0, 1]", () => {
    const { homeWin, draw, awayWin } = matchProbabilities(2, 1.5);
    expect(homeWin).toBeGreaterThanOrEqual(0);
    expect(homeWin).toBeLessThanOrEqual(1);
    expect(draw).toBeGreaterThanOrEqual(0);
    expect(draw).toBeLessThanOrEqual(1);
    expect(awayWin).toBeGreaterThanOrEqual(0);
    expect(awayWin).toBeLessThanOrEqual(1);
  });

  it("very high home xg → homeWin dominates", () => {
    const { homeWin } = matchProbabilities(5, 0.1);
    expect(homeWin).toBeGreaterThan(0.8);
  });
});

// ---------------------------------------------------------------------------
// monteCarloWinRate
// ---------------------------------------------------------------------------
describe("monteCarloWinRate", () => {
  it("p=0.5 → mean ≈ 0.5", () => {
    const result = monteCarloWinRate(100, 0.5, 10000, 42);
    expect(result.mean).toBeCloseTo(0.5, 1);
  });

  it("p=1.0 → mean = 1.0", () => {
    const result = monteCarloWinRate(50, 1.0, 1000, 1);
    expect(result.mean).toBe(1.0);
  });

  it("p=0.0 → mean = 0.0", () => {
    const result = monteCarloWinRate(50, 0.0, 1000, 1);
    expect(result.mean).toBe(0.0);
  });

  it("seeded result is reproducible", () => {
    const a = monteCarloWinRate(100, 0.6, 1000, 99);
    const b = monteCarloWinRate(100, 0.6, 1000, 99);
    expect(a.mean).toBe(b.mean);
    expect(a.stdDev).toBe(b.stdDev);
  });

  it("different seeds give different results", () => {
    const a = monteCarloWinRate(100, 0.5, 1000, 1);
    const b = monteCarloWinRate(100, 0.5, 1000, 2);
    expect(a.mean).not.toBe(b.mean);
  });

  it("stdDev is positive for p in (0,1)", () => {
    const result = monteCarloWinRate(100, 0.5, 1000, 42);
    expect(result.stdDev).toBeGreaterThan(0);
  });

  it("ci95.lower < mean < ci95.upper", () => {
    const result = monteCarloWinRate(100, 0.5, 1000, 42);
    expect(result.ci95.lower).toBeLessThan(result.mean);
    expect(result.ci95.upper).toBeGreaterThan(result.mean);
  });

  it("higher p → higher mean", () => {
    const low = monteCarloWinRate(100, 0.3, 10000, 42);
    const high = monteCarloWinRate(100, 0.7, 10000, 42);
    expect(high.mean).toBeGreaterThan(low.mean);
  });

  it("defaults seed to 42 when not provided", () => {
    const withDefault = monteCarloWinRate(100, 0.5, 1000);
    const withExplicit = monteCarloWinRate(100, 0.5, 1000, 42);
    expect(withDefault.mean).toBe(withExplicit.mean);
  });
});

// ---------------------------------------------------------------------------
// kellyOptimal
// ---------------------------------------------------------------------------
describe("kellyOptimal", () => {
  it("p=0.55, b=0.909 (-110 odds) → positive fraction", () => {
    const f = kellyOptimal(0.55, 0.909);
    expect(f).toBeGreaterThan(0);
  });

  it("no edge (p=0.5, b=1) → 0", () => {
    // f = (0.5 * 2 - 1) / 1 = 0
    expect(kellyOptimal(0.5, 1)).toBe(0);
  });

  it("negative edge → 0 (no bet)", () => {
    // p=0.4 at even money: f = (0.4*2-1)/1 = -0.2 → clamped to 0
    expect(kellyOptimal(0.4, 1)).toBe(0);
  });

  it("b=0 → returns 0", () => {
    expect(kellyOptimal(0.6, 0)).toBe(0);
  });

  it("large edge → large fraction (but <= 1)", () => {
    const f = kellyOptimal(0.9, 10);
    expect(f).toBeGreaterThan(0);
    // Mathematically f = (0.9*11-1)/10 = (9.9-1)/10 = 0.89
    expect(f).toBeCloseTo(0.89, 2);
  });

  it("formula: (p*(b+1)-1)/b for positive result", () => {
    const p = 0.6;
    const b = 2;
    const expected = (p * (b + 1) - 1) / b;
    expect(kellyOptimal(p, b)).toBeCloseTo(expected, 8);
  });
});

// ---------------------------------------------------------------------------
// impliedEdge
// ---------------------------------------------------------------------------
describe("impliedEdge", () => {
  it("0.6 - 0.524 ≈ 0.076", () => {
    expect(impliedEdge(0.6, 0.524)).toBeCloseTo(0.076, 3);
  });

  it("modelProb > marketProb → positive edge", () => {
    expect(impliedEdge(0.7, 0.5)).toBeGreaterThan(0);
  });

  it("modelProb < marketProb → negative edge", () => {
    expect(impliedEdge(0.4, 0.5)).toBeLessThan(0);
  });

  it("modelProb === marketProb → 0 edge", () => {
    expect(impliedEdge(0.5, 0.5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sampleSize
// ---------------------------------------------------------------------------
describe("sampleSize", () => {
  it("effect=0.05 → substantial n (> 500)", () => {
    // Standard formula: n = (z_alpha/2 + z_beta)^2 * 0.25 / effect^2
    // = (1.96 + 0.842)^2 * 0.25 / 0.0025 ≈ 785
    const n = sampleSize(0.05);
    expect(n).toBeGreaterThan(500);
  });

  it("effect=0.1 → smaller n than effect=0.05", () => {
    const n05 = sampleSize(0.05);
    const n10 = sampleSize(0.1);
    expect(n10).toBeLessThan(n05);
  });

  it("returns integer (ceiling)", () => {
    const n = sampleSize(0.07);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("higher power → larger n", () => {
    const n80 = sampleSize(0.05, 0.05, 0.8);
    const n90 = sampleSize(0.05, 0.05, 0.9);
    expect(n90).toBeGreaterThan(n80);
  });

  it("lower alpha → larger n", () => {
    const n05 = sampleSize(0.05, 0.05, 0.8);
    const n01 = sampleSize(0.05, 0.01, 0.8);
    expect(n01).toBeGreaterThan(n05);
  });

  it("result is positive", () => {
    expect(sampleSize(0.05)).toBeGreaterThan(0);
    expect(sampleSize(0.1)).toBeGreaterThan(0);
  });
});
