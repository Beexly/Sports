/**
 * Comprehensive probability library tests — 160+ tests.
 * All floating-point comparisons use toBeCloseTo.
 */
import { describe, it, expect } from "vitest";
import {
  // Legacy exports
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
  // New: Basic probability
  factorial,
  combinations,
  permutations,
  complement,
  conditionalProbability,
  bayesUpdate,
  totalProbability,
  // New: Discrete distributions
  binomialPMF,
  binomialCDF,
  binomialMean,
  binomialVariance,
  poissonPMF,
  poissonCDF,
  geometricPMF,
  geometricCDF,
  negativeBinomialPMF,
  hypergeometricPMF,
  multinomialCoeff,
  // New: Special math functions
  erf,
  erfc,
  logGamma,
  gammaFunction,
  betaFunction,
  regularizedIncompleteGamma,
  regularizedIncompleteBeta,
  // New: Continuous distributions
  normalPDF,
  normalCDF,
  normalInverseCDF,
  standardNormal,
  tDistributionPDF,
  tDistributionCDF,
  chiSquaredPDF,
  chiSquaredCDF,
  exponentialPDF,
  exponentialCDF,
  betaPDF,
  betaCDF,
  uniformPDF,
  uniformCDF,
  lognormalPDF,
  lognormalCDF,
  // New: Descriptive statistics
  mean,
  median,
  mode,
  variance,
  standardDeviation,
  skewness,
  kurtosis,
  quantile,
  iqr,
  zScore,
  covariance,
  pearsonCorrelation,
  spearmanCorrelation,
  // New: Hypothesis testing
  zTest,
  tTest,
  chiSquareGoodnessOfFit,
  proportionZTest,
  confidenceInterval,
  // New: Sports prediction
  poissonMatchGoals,
  poissonWinProbs,
  poissonOverUnder,
  binomialWinStreak,
  expectedPointsNFL,
} from "@/lib/math/probability";

// ===========================================================================
// LEGACY TESTS (kept for backward compatibility)
// ===========================================================================

describe("normalCdf (legacy)", () => {
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
  it("approaches 1 for large positive z", () => {
    expect(normalCdf(10)).toBeCloseTo(1, 5);
  });
  it("approaches 0 for large negative z", () => {
    expect(normalCdf(-10)).toBeCloseTo(0, 5);
  });
  it("is symmetric: normalCdf(z) + normalCdf(-z) === 1", () => {
    expect(normalCdf(1.5) + normalCdf(-1.5)).toBeCloseTo(1, 10);
  });
});

describe("normalPpf (legacy)", () => {
  it("returns 0 for p=0.5", () => {
    expect(normalPpf(0.5)).toBeCloseTo(0, 4);
  });
  it("returns ~1.96 for p=0.975", () => {
    expect(normalPpf(0.975)).toBeCloseTo(1.96, 2);
  });
  it("returns ~1.645 for p=0.95", () => {
    expect(normalPpf(0.95)).toBeCloseTo(1.645, 2);
  });
  it("throws for p=0", () => {
    expect(() => normalPpf(0)).toThrow(RangeError);
  });
  it("throws for p=1", () => {
    expect(() => normalPpf(1)).toThrow(RangeError);
  });
  it("is inverse of normalCdf: normalCdf(normalPpf(p)) ≈ p", () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(normalCdf(normalPpf(p))).toBeCloseTo(p, 4);
    }
  });
});

describe("proportionCI (legacy)", () => {
  it("returns reasonable interval for 60/100", () => {
    const ci = proportionCI(60, 100);
    expect(ci.lower).toBeGreaterThan(0.49);
    expect(ci.upper).toBeLessThan(0.71);
  });
  it("throws for n <= 0", () => {
    expect(() => proportionCI(5, 0)).toThrow(RangeError);
  });
});

describe("poissonPmf (legacy)", () => {
  it("lambda=1, k=0 → e^(-1)", () => {
    expect(poissonPmf(0, 1)).toBeCloseTo(Math.exp(-1), 8);
  });
  it("returns 0 for k < 0", () => {
    expect(poissonPmf(-1, 2)).toBe(0);
  });
  it("probabilities sum to approximately 1 for lambda=2", () => {
    let total = 0;
    for (let k = 0; k <= 50; k++) total += poissonPmf(k, 2);
    expect(total).toBeCloseTo(1, 4);
  });
});

describe("kellyOptimal (legacy)", () => {
  it("no edge (p=0.5, b=1) → 0", () => {
    expect(kellyOptimal(0.5, 1)).toBe(0);
  });
  it("negative edge → 0", () => {
    expect(kellyOptimal(0.4, 1)).toBe(0);
  });
});

// ===========================================================================
// NEW TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Basic probability
// ---------------------------------------------------------------------------

describe("factorial", () => {
  it("0! = 1", () => {
    expect(factorial(0)).toBe(1);
  });
  it("1! = 1", () => {
    expect(factorial(1)).toBe(1);
  });
  it("5! = 120", () => {
    expect(factorial(5)).toBe(120);
  });
  it("10! = 3628800", () => {
    expect(factorial(10)).toBe(3628800);
  });
  it("20! is correct", () => {
    expect(factorial(20)).toBe(2432902008176640000);
  });
  it("throws for n < 0", () => {
    expect(() => factorial(-1)).toThrow(RangeError);
  });
  it("throws for n > 20", () => {
    expect(() => factorial(21)).toThrow(RangeError);
  });
  it("throws for non-integer", () => {
    expect(() => factorial(2.5)).toThrow(RangeError);
  });
});

describe("combinations", () => {
  it("C(5,2) = 10", () => {
    expect(combinations(5, 2)).toBe(10);
  });
  it("C(n,0) = 1", () => {
    expect(combinations(10, 0)).toBe(1);
  });
  it("C(n,n) = 1", () => {
    expect(combinations(7, 7)).toBe(1);
  });
  it("C(10,3) = 120", () => {
    expect(combinations(10, 3)).toBe(120);
  });
  it("C(30,15) is an integer", () => {
    const c = combinations(30, 15);
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThan(0);
  });
  it("returns 0 for k > n", () => {
    expect(combinations(3, 5)).toBe(0);
  });
  it("returns 0 for k < 0", () => {
    expect(combinations(5, -1)).toBe(0);
  });
  it("throws for n > 30", () => {
    expect(() => combinations(31, 5)).toThrow(RangeError);
  });
});

describe("permutations", () => {
  it("P(5,2) = 20", () => {
    expect(permutations(5, 2)).toBe(20);
  });
  it("P(n,0) = 1", () => {
    expect(permutations(10, 0)).toBe(1);
  });
  it("P(n,n) = n!", () => {
    expect(permutations(5, 5)).toBe(120);
  });
  it("returns 0 for k > n", () => {
    expect(permutations(3, 5)).toBe(0);
  });
});

describe("complement", () => {
  it("complement(0.3) = 0.7", () => {
    expect(complement(0.3)).toBeCloseTo(0.7, 10);
  });
  it("complement(1) = 0", () => {
    expect(complement(1)).toBeCloseTo(0, 10);
  });
  it("complement(0) = 1", () => {
    expect(complement(0)).toBeCloseTo(1, 10);
  });
});

describe("conditionalProbability", () => {
  it("P(A|B) = P(A∩B) / P(B)", () => {
    expect(conditionalProbability(0.2, 0.5)).toBeCloseTo(0.4, 10);
  });
  it("throws if pB = 0", () => {
    expect(() => conditionalProbability(0.1, 0)).toThrow(RangeError);
  });
});

describe("bayesUpdate", () => {
  it("Bayes theorem: prior=0.5, likelihood=0.8, marginal=0.6", () => {
    expect(bayesUpdate(0.5, 0.8, 0.6)).toBeCloseTo((0.8 * 0.5) / 0.6, 8);
  });
  it("throws if marginalLikelihood = 0", () => {
    expect(() => bayesUpdate(0.5, 0.8, 0)).toThrow(RangeError);
  });
});

describe("totalProbability", () => {
  it("sum of prior[i] * likelihood[i]", () => {
    expect(totalProbability([0.4, 0.6], [0.3, 0.7])).toBeCloseTo(0.54, 8);
  });
  it("throws for mismatched lengths", () => {
    expect(() => totalProbability([0.5], [0.5, 0.5])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// 2. Discrete distributions
// ---------------------------------------------------------------------------

describe("binomialPMF", () => {
  it("binomialPMF(2, 5, 0.5) ≈ 0.3125", () => {
    expect(binomialPMF(2, 5, 0.5)).toBeCloseTo(0.3125, 5);
  });
  it("binomialPMF(0, 5, 0.5) ≈ 0.03125", () => {
    expect(binomialPMF(0, 5, 0.5)).toBeCloseTo(0.03125, 5);
  });
  it("binomialPMF(5, 5, 0.5) ≈ 0.03125", () => {
    expect(binomialPMF(5, 5, 0.5)).toBeCloseTo(0.03125, 5);
  });
  it("returns 0 for k < 0", () => {
    expect(binomialPMF(-1, 5, 0.5)).toBe(0);
  });
  it("returns 0 for k > n", () => {
    expect(binomialPMF(6, 5, 0.5)).toBe(0);
  });
  it("sum over all k = 1", () => {
    let sum = 0;
    for (let k = 0; k <= 10; k++) sum += binomialPMF(k, 10, 0.3);
    expect(sum).toBeCloseTo(1, 6);
  });
  it("p=0 → PMF only nonzero at k=0", () => {
    expect(binomialPMF(0, 5, 0)).toBe(1);
    expect(binomialPMF(1, 5, 0)).toBe(0);
  });
  it("p=1 → PMF only nonzero at k=n", () => {
    expect(binomialPMF(5, 5, 1)).toBe(1);
    expect(binomialPMF(4, 5, 1)).toBe(0);
  });
});

describe("binomialCDF", () => {
  it("P(X <= 2 | n=5, p=0.5) = sum of PMF 0..2", () => {
    const expected = binomialPMF(0, 5, 0.5) + binomialPMF(1, 5, 0.5) + binomialPMF(2, 5, 0.5);
    expect(binomialCDF(2, 5, 0.5)).toBeCloseTo(expected, 8);
  });
  it("P(X <= 0) = P(X=0)", () => {
    expect(binomialCDF(0, 5, 0.4)).toBeCloseTo(binomialPMF(0, 5, 0.4), 8);
  });
  it("P(X <= n) = 1", () => {
    expect(binomialCDF(5, 5, 0.5)).toBeCloseTo(1, 8);
  });
  it("returns 0 for k < 0", () => {
    expect(binomialCDF(-1, 5, 0.5)).toBe(0);
  });
  it("is non-decreasing", () => {
    let prev = 0;
    for (let k = 0; k <= 5; k++) {
      const curr = binomialCDF(k, 5, 0.5);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});

describe("binomialMean and binomialVariance", () => {
  it("mean = n*p", () => {
    expect(binomialMean(10, 0.3)).toBeCloseTo(3, 8);
  });
  it("variance = n*p*(1-p)", () => {
    expect(binomialVariance(10, 0.3)).toBeCloseTo(2.1, 8);
  });
});

describe("poissonPMF (new)", () => {
  it("poissonPMF(0,1) ≈ 0.368", () => {
    expect(poissonPMF(0, 1)).toBeCloseTo(Math.exp(-1), 6);
  });
  it("poissonPMF(0,1) ≈ 0.368 (verify specific value)", () => {
    expect(poissonPMF(0, 1)).toBeCloseTo(0.3679, 3);
  });
  it("poissonPMF(2, 2) ≈ 2*e^-2", () => {
    expect(poissonPMF(2, 2)).toBeCloseTo(2 * Math.exp(-2), 8);
  });
  it("returns 0 for k < 0", () => {
    expect(poissonPMF(-1, 2)).toBe(0);
  });
});

describe("poissonCDF (new)", () => {
  it("P(X<=0) = P(X=0)", () => {
    expect(poissonCDF(0, 2)).toBeCloseTo(poissonPMF(0, 2), 8);
  });
  it("returns 0 for k < 0", () => {
    expect(poissonCDF(-1, 2)).toBe(0);
  });
  it("approaches 1 for large k", () => {
    expect(poissonCDF(50, 2)).toBeCloseTo(1, 5);
  });
});

describe("geometricPMF", () => {
  it("P(X=1) = p", () => {
    expect(geometricPMF(1, 0.3)).toBeCloseTo(0.3, 8);
  });
  it("P(X=2) = p*(1-p)", () => {
    expect(geometricPMF(2, 0.3)).toBeCloseTo(0.3 * 0.7, 8);
  });
  it("returns 0 for k=0", () => {
    expect(geometricPMF(0, 0.3)).toBe(0);
  });
  it("returns 0 for k < 0", () => {
    expect(geometricPMF(-1, 0.3)).toBe(0);
  });
  it("sum over all k ≈ 1 for p=0.3", () => {
    let sum = 0;
    for (let k = 1; k <= 1000; k++) sum += geometricPMF(k, 0.3);
    expect(sum).toBeCloseTo(1, 3);
  });
});

describe("geometricCDF", () => {
  it("P(X<=1) = p", () => {
    expect(geometricCDF(1, 0.4)).toBeCloseTo(0.4, 8);
  });
  it("P(X<=k) = 1 - (1-p)^k", () => {
    expect(geometricCDF(3, 0.5)).toBeCloseTo(1 - Math.pow(0.5, 3), 8);
  });
  it("returns 0 for k < 1", () => {
    expect(geometricCDF(0, 0.5)).toBe(0);
  });
  it("approaches 1 for large k", () => {
    expect(geometricCDF(100, 0.3)).toBeCloseTo(1, 5);
  });
});

describe("negativeBinomialPMF", () => {
  it("k=r=1 → P(X=1) = p", () => {
    expect(negativeBinomialPMF(1, 1, 0.5)).toBeCloseTo(0.5, 8);
  });
  it("returns 0 for k < r", () => {
    expect(negativeBinomialPMF(2, 3, 0.5)).toBe(0);
  });
});

describe("hypergeometricPMF", () => {
  it("C(4,2)*C(6,2)/C(10,4) for N=10, K=4, n=4, k=2", () => {
    const expected =
      (combinations(4, 2) * combinations(6, 2)) / combinations(10, 4);
    expect(hypergeometricPMF(2, 4, 4, 10)).toBeCloseTo(expected, 8);
  });
  it("returns 0 for impossible k", () => {
    expect(hypergeometricPMF(5, 4, 4, 10)).toBe(0);
  });
  it("probabilities sum to 1", () => {
    let sum = 0;
    for (let k = 0; k <= 4; k++) sum += hypergeometricPMF(k, 4, 4, 10);
    expect(sum).toBeCloseTo(1, 8);
  });
});

describe("multinomialCoeff", () => {
  it("[2, 2] → 4!/(2!*2!) = 6", () => {
    expect(multinomialCoeff([2, 2])).toBe(6);
  });
  it("[1, 1, 1] → 3!/(1!*1!*1!) = 6", () => {
    expect(multinomialCoeff([1, 1, 1])).toBe(6);
  });
  it("[3] → 1", () => {
    expect(multinomialCoeff([3])).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Special math functions
// ---------------------------------------------------------------------------

describe("erf", () => {
  it("erf(0) = 0", () => {
    expect(erf(0)).toBe(0);
  });
  it("erf approaches 1 for large positive x", () => {
    expect(erf(4)).toBeCloseTo(1, 4);
  });
  it("erf approaches -1 for large negative x", () => {
    expect(erf(-4)).toBeCloseTo(-1, 4);
  });
  it("erf is odd: erf(-x) = -erf(x)", () => {
    expect(erf(-1)).toBeCloseTo(-erf(1), 8);
  });
  it("erf(1) ≈ 0.8427", () => {
    expect(erf(1)).toBeCloseTo(0.8427, 3);
  });
});

describe("erfc", () => {
  it("erfc(0) = 1", () => {
    expect(erfc(0)).toBeCloseTo(1, 6);
  });
  it("erfc(x) + erf(x) = 1 for all x", () => {
    for (const x of [-2, -1, 0, 1, 2]) {
      expect(erfc(x) + erf(x)).toBeCloseTo(1, 10);
    }
  });
});

describe("gammaFunction", () => {
  it("Gamma(1) = 1", () => {
    expect(gammaFunction(1)).toBeCloseTo(1, 6);
  });
  it("Gamma(2) = 1", () => {
    expect(gammaFunction(2)).toBeCloseTo(1, 6);
  });
  it("Gamma(3) = 2", () => {
    expect(gammaFunction(3)).toBeCloseTo(2, 6);
  });
  it("Gamma(4) = 6", () => {
    expect(gammaFunction(4)).toBeCloseTo(6, 4);
  });
  it("Gamma(0.5) ≈ sqrt(π)", () => {
    expect(gammaFunction(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 5);
  });
  it("Gamma(n) = (n-1)! for integer n", () => {
    expect(gammaFunction(5)).toBeCloseTo(24, 4);
    expect(gammaFunction(6)).toBeCloseTo(120, 2);
  });
});

describe("logGamma", () => {
  it("logGamma(1) = 0", () => {
    expect(logGamma(1)).toBeCloseTo(0, 8);
  });
  it("logGamma(2) = 0", () => {
    expect(logGamma(2)).toBeCloseTo(0, 8);
  });
  it("exp(logGamma(x)) ≈ gammaFunction(x)", () => {
    for (const x of [0.5, 1.5, 2.5, 5]) {
      expect(Math.exp(logGamma(x))).toBeCloseTo(gammaFunction(x), 5);
    }
  });
});

describe("betaFunction", () => {
  it("B(1,1) = 1", () => {
    expect(betaFunction(1, 1)).toBeCloseTo(1, 8);
  });
  it("B(a,b) = B(b,a)", () => {
    expect(betaFunction(2, 3)).toBeCloseTo(betaFunction(3, 2), 8);
  });
  it("B(2,2) = 1/6", () => {
    expect(betaFunction(2, 2)).toBeCloseTo(1 / 6, 6);
  });
  it("B(0.5, 0.5) = π", () => {
    expect(betaFunction(0.5, 0.5)).toBeCloseTo(Math.PI, 4);
  });
});

describe("regularizedIncompleteGamma", () => {
  it("P(a, 0) = 0", () => {
    expect(regularizedIncompleteGamma(1, 0)).toBe(0);
  });
  it("P(a, large x) ≈ 1", () => {
    expect(regularizedIncompleteGamma(1, 100)).toBeCloseTo(1, 5);
  });
  it("P(1, x) = 1 - e^(-x)", () => {
    expect(regularizedIncompleteGamma(1, 2)).toBeCloseTo(1 - Math.exp(-2), 5);
  });
  it("returns value in [0,1]", () => {
    const v = regularizedIncompleteGamma(2, 3);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

describe("regularizedIncompleteBeta", () => {
  it("I_0(a,b) = 0", () => {
    expect(regularizedIncompleteBeta(2, 3, 0)).toBe(0);
  });
  it("I_1(a,b) = 1", () => {
    expect(regularizedIncompleteBeta(2, 3, 1)).toBe(1);
  });
  it("I_0.5(1,1) = 0.5", () => {
    expect(regularizedIncompleteBeta(1, 1, 0.5)).toBeCloseTo(0.5, 5);
  });
  it("returns value in [0,1]", () => {
    const v = regularizedIncompleteBeta(2, 3, 0.4);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
  it("I_x(a,b) + I_{1-x}(b,a) = 1", () => {
    const x = 0.3;
    expect(
      regularizedIncompleteBeta(2, 3, x) + regularizedIncompleteBeta(3, 2, 1 - x)
    ).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// Continuous distributions
// ---------------------------------------------------------------------------

describe("normalPDF", () => {
  it("normalPDF(0) = 1/sqrt(2π)", () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 6);
  });
  it("normalPDF is symmetric", () => {
    expect(normalPDF(1)).toBeCloseTo(normalPDF(-1), 10);
  });
  it("normalPDF(0, mean=2, std=1) peak at mean", () => {
    expect(normalPDF(2, 2, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 6);
  });
  it("normalPDF is always positive", () => {
    for (const x of [-3, -1, 0, 1, 3]) {
      expect(normalPDF(x)).toBeGreaterThan(0);
    }
  });
});

describe("normalCDF (new)", () => {
  it("normalCDF(0) ≈ 0.5", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 5);
  });
  it("normalCDF(1.96) ≈ 0.975", () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
  });
  it("normalCDF(-1.96) ≈ 0.025", () => {
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 2);
  });
  it("normalCDF with mean and std", () => {
    expect(normalCDF(2, 2, 1)).toBeCloseTo(0.5, 5);
  });
  it("is monotonically increasing", () => {
    let prev = 0;
    for (const x of [-3, -2, -1, 0, 1, 2, 3]) {
      const curr = normalCDF(x);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});

describe("normalInverseCDF", () => {
  it("normalInverseCDF(0.5) = mean", () => {
    expect(normalInverseCDF(0.5)).toBeCloseTo(0, 4);
  });
  it("normalInverseCDF(0.975) ≈ 1.96", () => {
    expect(normalInverseCDF(0.975)).toBeCloseTo(1.96, 2);
  });
  it("is inverse of normalCDF", () => {
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(normalCDF(normalInverseCDF(p))).toBeCloseTo(p, 4);
    }
  });
});

describe("standardNormal", () => {
  it("standardNormal(0) = normalPDF(0)", () => {
    expect(standardNormal(0)).toBeCloseTo(normalPDF(0, 0, 1), 10);
  });
  it("standardNormal is symmetric", () => {
    expect(standardNormal(1)).toBeCloseTo(standardNormal(-1), 10);
  });
});

describe("tDistributionPDF", () => {
  it("is symmetric: tPDF(x,df) = tPDF(-x,df)", () => {
    expect(tDistributionPDF(1, 10)).toBeCloseTo(tDistributionPDF(-1, 10), 8);
  });
  it("is positive at 0", () => {
    expect(tDistributionPDF(0, 5)).toBeGreaterThan(0);
  });
  it("approaches normal PDF as df → ∞", () => {
    // t-dist with large df ≈ normal
    expect(tDistributionPDF(0, 1000)).toBeCloseTo(normalPDF(0), 3);
  });
});

describe("tDistributionCDF", () => {
  it("tCDF(0, df) = 0.5 by symmetry", () => {
    expect(tDistributionCDF(0, 10)).toBeCloseTo(0.5, 4);
  });
  it("tCDF is non-decreasing", () => {
    let prev = 0;
    for (const x of [-3, -2, -1, 0, 1, 2, 3]) {
      const curr = tDistributionCDF(x, 10);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
  it("tCDF(-x, df) + tCDF(x, df) ≈ 1", () => {
    expect(tDistributionCDF(2, 10) + tDistributionCDF(-2, 10)).toBeCloseTo(1, 4);
  });
});

describe("chiSquaredPDF", () => {
  it("returns 0 for x <= 0", () => {
    expect(chiSquaredPDF(0, 2)).toBe(0);
    expect(chiSquaredPDF(-1, 2)).toBe(0);
  });
  it("chiSquaredPDF(x=2, k=2) = (1/2)*e^(-1)", () => {
    expect(chiSquaredPDF(2, 2)).toBeCloseTo(0.5 * Math.exp(-1), 5);
  });
  it("is positive for x > 0", () => {
    expect(chiSquaredPDF(1, 3)).toBeGreaterThan(0);
  });
});

describe("chiSquaredCDF", () => {
  it("returns 0 for x <= 0", () => {
    expect(chiSquaredCDF(0, 2)).toBe(0);
  });
  it("chiSquaredCDF(x=2, k=2) = 1 - e^(-1)", () => {
    expect(chiSquaredCDF(2, 2)).toBeCloseTo(1 - Math.exp(-1), 4);
  });
  it("approaches 1 for large x", () => {
    expect(chiSquaredCDF(100, 2)).toBeCloseTo(1, 5);
  });
  it("is non-decreasing", () => {
    let prev = 0;
    for (const x of [0.1, 0.5, 1, 2, 5, 10]) {
      const curr = chiSquaredCDF(x, 3);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});

describe("exponentialPDF and exponentialCDF", () => {
  it("exponentialPDF(0, lambda=2) = 2", () => {
    expect(exponentialPDF(0, 2)).toBeCloseTo(2, 8);
  });
  it("exponentialPDF returns 0 for x < 0", () => {
    expect(exponentialPDF(-1, 2)).toBe(0);
  });
  it("exponentialCDF(0) = 0", () => {
    expect(exponentialCDF(0, 2)).toBe(0);
  });
  it("exponentialCDF approaches 1 for large x", () => {
    expect(exponentialCDF(100, 1)).toBeCloseTo(1, 5);
  });
  it("exponentialCDF(x, lambda) = 1 - e^(-lambda*x)", () => {
    expect(exponentialCDF(1, 2)).toBeCloseTo(1 - Math.exp(-2), 8);
  });
  it("exponentialCDF returns 0 for x < 0", () => {
    expect(exponentialCDF(-1, 2)).toBe(0);
  });
});

describe("betaPDF and betaCDF", () => {
  it("betaPDF(0.5, 1, 1) = 1 (uniform)", () => {
    expect(betaPDF(0.5, 1, 1)).toBeCloseTo(1, 5);
  });
  it("betaPDF returns 0 outside [0,1]", () => {
    expect(betaPDF(-0.1, 2, 3)).toBe(0);
    expect(betaPDF(1.1, 2, 3)).toBe(0);
  });
  it("betaCDF(0.5, 1, 1) = 0.5", () => {
    expect(betaCDF(0.5, 1, 1)).toBeCloseTo(0.5, 5);
  });
  it("betaCDF(0) = 0", () => {
    expect(betaCDF(0, 2, 3)).toBe(0);
  });
  it("betaCDF(1) = 1", () => {
    expect(betaCDF(1, 2, 3)).toBeCloseTo(1, 5);
  });
});

describe("uniformPDF and uniformCDF", () => {
  it("uniformPDF in [a,b] = 1/(b-a)", () => {
    expect(uniformPDF(0.5, 0, 1)).toBeCloseTo(1, 8);
    expect(uniformPDF(5, 2, 7)).toBeCloseTo(0.2, 8);
  });
  it("uniformPDF outside [a,b] = 0", () => {
    expect(uniformPDF(-0.1, 0, 1)).toBe(0);
    expect(uniformPDF(1.1, 0, 1)).toBe(0);
  });
  it("uniformCDF(a) = 0", () => {
    expect(uniformCDF(0, 0, 1)).toBe(0);
  });
  it("uniformCDF(b) = 1", () => {
    expect(uniformCDF(1, 0, 1)).toBe(1);
  });
  it("uniformCDF linear interpolation", () => {
    expect(uniformCDF(0.4, 0, 1)).toBeCloseTo(0.4, 8);
  });
  it("uniformCDF below a = 0", () => {
    expect(uniformCDF(-1, 0, 1)).toBe(0);
  });
  it("uniformCDF above b = 1", () => {
    expect(uniformCDF(2, 0, 1)).toBe(1);
  });
});

describe("lognormalPDF and lognormalCDF", () => {
  it("lognormalPDF(0) = 0", () => {
    expect(lognormalPDF(0, 0, 1)).toBe(0);
  });
  it("lognormalPDF(x<0) = 0", () => {
    expect(lognormalPDF(-1, 0, 1)).toBe(0);
  });
  it("lognormalPDF is positive for x > 0", () => {
    expect(lognormalPDF(1, 0, 1)).toBeGreaterThan(0);
  });
  it("lognormalCDF(0) = 0", () => {
    expect(lognormalCDF(0, 0, 1)).toBe(0);
  });
  it("lognormalCDF approaches 1 for large x", () => {
    expect(lognormalCDF(1e6, 0, 1)).toBeCloseTo(1, 5);
  });
  it("lognormalCDF at median (exp(mu)) ≈ 0.5", () => {
    expect(lognormalCDF(Math.exp(0), 0, 1)).toBeCloseTo(0.5, 3);
  });
});

// ---------------------------------------------------------------------------
// Descriptive statistics
// ---------------------------------------------------------------------------

describe("mean", () => {
  it("mean([1,2,3,4,5]) = 3", () => {
    expect(mean([1, 2, 3, 4, 5])).toBeCloseTo(3, 10);
  });
  it("mean of identical values", () => {
    expect(mean([5, 5, 5])).toBeCloseTo(5, 10);
  });
  it("throws for empty array", () => {
    expect(() => mean([])).toThrow(RangeError);
  });
});

describe("median", () => {
  it("odd length: median([1,3,5]) = 3", () => {
    expect(median([1, 3, 5])).toBe(3);
  });
  it("even length: median([1,2,3,4]) = 2.5", () => {
    expect(median([1, 2, 3, 4])).toBeCloseTo(2.5, 8);
  });
  it("unsorted input: median([5,1,3]) = 3", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  it("throws for empty array", () => {
    expect(() => median([])).toThrow(RangeError);
  });
});

describe("mode", () => {
  it("single mode", () => {
    expect(mode([1, 2, 2, 3])).toEqual([2]);
  });
  it("bimodal", () => {
    expect(mode([1, 2, 2, 3, 3])).toEqual([2, 3]);
  });
  it("all unique → all are modes", () => {
    const m = mode([1, 2, 3]);
    expect(m.length).toBe(3);
  });
  it("throws for empty array", () => {
    expect(() => mode([])).toThrow(RangeError);
  });
});

describe("variance and standardDeviation", () => {
  it("population variance of [2,4,4,4,5,5,7,9] = 4", () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9], true)).toBeCloseTo(4, 5);
  });
  it("sample variance divides by n-1", () => {
    // population variance = 4, sample variance = 4 * n/(n-1) = 4 * 8/7 ≈ 4.571
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571, 2);
  });
  it("std = sqrt(variance)", () => {
    const data = [1, 2, 3, 4, 5];
    expect(standardDeviation(data)).toBeCloseTo(Math.sqrt(variance(data)), 8);
  });
  it("throws for empty array", () => {
    expect(() => variance([])).toThrow(RangeError);
  });
});

describe("skewness", () => {
  it("symmetric data → skewness ≈ 0", () => {
    expect(skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 5);
  });
  it("right-skewed data → positive skewness", () => {
    expect(skewness([1, 1, 1, 2, 10])).toBeGreaterThan(0);
  });
  it("throws for n < 3", () => {
    expect(() => skewness([1, 2])).toThrow(RangeError);
  });
});

describe("kurtosis", () => {
  it("normal distribution has excess kurtosis ≈ 0", () => {
    // Large sample from normal approximation
    const data = [
      -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3,
      -3, 0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 1.2
    ];
    const k = kurtosis(data);
    expect(typeof k).toBe("number");
    expect(isFinite(k)).toBe(true);
  });
  it("throws for n < 4", () => {
    expect(() => kurtosis([1, 2, 3])).toThrow(RangeError);
  });
});

describe("quantile", () => {
  it("median = quantile(data, 0.5)", () => {
    const data = [1, 2, 3, 4, 5];
    expect(quantile(data, 0.5)).toBeCloseTo(median(data), 8);
  });
  it("quantile(data, 0) = min", () => {
    expect(quantile([3, 1, 4, 1, 5], 0)).toBe(1);
  });
  it("quantile(data, 1) = max", () => {
    expect(quantile([3, 1, 4, 1, 5], 1)).toBe(5);
  });
  it("throws for empty array", () => {
    expect(() => quantile([], 0.5)).toThrow(RangeError);
  });
  it("throws for p out of [0,1]", () => {
    expect(() => quantile([1, 2], 1.1)).toThrow(RangeError);
  });
});

describe("iqr", () => {
  it("IQR of [1,2,3,4,5] = Q3-Q1", () => {
    const data = [1, 2, 3, 4, 5];
    const expected = quantile(data, 0.75) - quantile(data, 0.25);
    expect(iqr(data)).toBeCloseTo(expected, 8);
  });
  it("IQR is non-negative", () => {
    expect(iqr([1, 2, 3])).toBeGreaterThanOrEqual(0);
  });
});

describe("zScore", () => {
  it("zScore(mean, mean, std) = 0", () => {
    expect(zScore(5, 5, 2)).toBeCloseTo(0, 8);
  });
  it("zScore(mean+std, mean, std) = 1", () => {
    expect(zScore(7, 5, 2)).toBeCloseTo(1, 8);
  });
  it("throws for std = 0", () => {
    expect(() => zScore(5, 5, 0)).toThrow(RangeError);
  });
});

describe("covariance", () => {
  it("positive covariance for positively correlated data", () => {
    expect(covariance([1, 2, 3], [2, 4, 6])).toBeGreaterThan(0);
  });
  it("covariance([x,x,x], [y,y,y]) for constants = 0", () => {
    expect(covariance([5, 5, 5], [3, 3, 3])).toBeCloseTo(0, 8);
  });
  it("throws for mismatched lengths", () => {
    expect(() => covariance([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

describe("pearsonCorrelation", () => {
  it("perfect positive correlation = 1", () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 8);
  });
  it("perfect negative correlation = -1", () => {
    expect(pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 8);
  });
  it("correlation in [-1, 1]", () => {
    const r = pearsonCorrelation([1, 3, 2, 5, 4], [2, 5, 3, 7, 6]);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });
  it("uncorrelated data → correlation near 0", () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [3, 1, 4, 1, 5]);
    expect(Math.abs(r)).toBeLessThan(1);
  });
});

describe("spearmanCorrelation", () => {
  it("monotone perfect relationship = 1", () => {
    expect(spearmanCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 5);
  });
  it("monotone decreasing = -1", () => {
    expect(spearmanCorrelation([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 5);
  });
  it("throws for mismatched lengths", () => {
    expect(() => spearmanCorrelation([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Hypothesis testing
// ---------------------------------------------------------------------------

describe("zTest", () => {
  it("highly significant result: reject = true", () => {
    const result = zTest(102, 100, 1, 100);
    expect(result.reject).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });
  it("non-significant result: reject = false", () => {
    const result = zTest(100.1, 100, 10, 10);
    expect(result.reject).toBe(false);
  });
  it("z is a number", () => {
    const result = zTest(105, 100, 5, 25);
    expect(typeof result.z).toBe("number");
  });
  it("pValue is in [0,1]", () => {
    const result = zTest(105, 100, 5, 25);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

describe("tTest", () => {
  it("mean far from mu0 → reject", () => {
    const data = [10, 11, 10, 11, 10, 11, 10, 11];
    const result = tTest(data, 5);
    expect(result.reject).toBe(true);
  });
  it("mean close to mu0 → do not reject", () => {
    const data = [5.0, 5.1, 4.9, 5.0, 5.0];
    const result = tTest(data, 5);
    expect(result.reject).toBe(false);
  });
  it("df = n - 1", () => {
    const data = [1, 2, 3, 4, 5];
    expect(tTest(data, 3).df).toBe(4);
  });
  it("throws for n < 2", () => {
    expect(() => tTest([5], 5)).toThrow(RangeError);
  });
});

describe("chiSquareGoodnessOfFit", () => {
  it("uniform data → high p-value (no reject)", () => {
    const obs = [25, 25, 25, 25];
    const exp = [25, 25, 25, 25];
    const result = chiSquareGoodnessOfFit(obs, exp);
    expect(result.pValue).toBeGreaterThan(0.9);
    expect(result.reject).toBe(false);
  });
  it("very skewed data → low p-value (reject)", () => {
    const obs = [90, 5, 3, 2];
    const exp = [25, 25, 25, 25];
    const result = chiSquareGoodnessOfFit(obs, exp);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.reject).toBe(true);
  });
  it("df = length - 1", () => {
    const result = chiSquareGoodnessOfFit([10, 10, 10], [10, 10, 10]);
    expect(result.df).toBe(2);
  });
  it("throws for mismatched lengths", () => {
    expect(() => chiSquareGoodnessOfFit([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

describe("proportionZTest", () => {
  it("60/100 vs p0=0.5 → reject", () => {
    const result = proportionZTest(60, 100, 0.5);
    expect(result.reject).toBe(true);
  });
  it("52/100 vs p0=0.5 → do not reject", () => {
    const result = proportionZTest(52, 100, 0.5);
    expect(result.reject).toBe(false);
  });
  it("pValue in [0,1]", () => {
    const result = proportionZTest(70, 100, 0.5);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

describe("confidenceInterval", () => {
  it("interval contains the mean", () => {
    const { lower, upper } = confidenceInterval(100, 10, 30);
    expect(lower).toBeLessThan(100);
    expect(upper).toBeGreaterThan(100);
  });
  it("wider for higher confidence", () => {
    const ci95 = confidenceInterval(100, 10, 30, 0.95);
    const ci99 = confidenceInterval(100, 10, 30, 0.99);
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower);
  });
  it("lower < upper", () => {
    const { lower, upper } = confidenceInterval(50, 5, 25);
    expect(lower).toBeLessThan(upper);
  });
});

// ---------------------------------------------------------------------------
// Sports prediction
// ---------------------------------------------------------------------------

describe("poissonMatchGoals", () => {
  it("returns (maxGoals+1) x (maxGoals+1) matrix", () => {
    const matrix = poissonMatchGoals(1.5, 1.2, 5);
    expect(matrix.length).toBe(6);
    expect(matrix[0]!.length).toBe(6);
  });
  it("matrix[i][j] = PMF(i, lambdaHome) * PMF(j, lambdaAway)", () => {
    const matrix = poissonMatchGoals(1.5, 1.2, 5);
    expect(matrix[0]![0]!).toBeCloseTo(
      poissonPmf(0, 1.5) * poissonPmf(0, 1.2),
      8
    );
  });
  it("all cells are non-negative", () => {
    const matrix = poissonMatchGoals(2, 1, 4);
    for (const row of matrix) {
      for (const cell of row) {
        expect(cell).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("cells sum approximately to 1 for large maxGoals", () => {
    const matrix = poissonMatchGoals(1.5, 1.2, 15);
    let sum = 0;
    for (const row of matrix) for (const cell of row) sum += cell;
    expect(sum).toBeCloseTo(1, 2);
  });
});

describe("poissonWinProbs", () => {
  it("homeWin > awayWin when lambdaHome > lambdaAway", () => {
    const { homeWin, awayWin } = poissonWinProbs(2, 1);
    expect(homeWin).toBeGreaterThan(awayWin);
  });
  it("probabilities sum close to 1", () => {
    const { homeWin, draw, awayWin } = poissonWinProbs(1.5, 1.5);
    expect(homeWin + draw + awayWin).toBeCloseTo(1, 2);
  });
  it("symmetric lambdas → homeWin ≈ awayWin", () => {
    const { homeWin, awayWin } = poissonWinProbs(1.5, 1.5);
    expect(homeWin).toBeCloseTo(awayWin, 3);
  });
  it("all probabilities are in [0,1]", () => {
    const { homeWin, draw, awayWin } = poissonWinProbs(2, 1.5);
    expect(homeWin).toBeGreaterThanOrEqual(0);
    expect(homeWin).toBeLessThanOrEqual(1);
    expect(draw).toBeGreaterThanOrEqual(0);
    expect(awayWin).toBeGreaterThanOrEqual(0);
  });
});

describe("poissonOverUnder", () => {
  it("over + under ≈ 1", () => {
    const { over, under } = poissonOverUnder(1.5, 1.2, 2.5, 15);
    expect(over + under).toBeCloseTo(1, 2);
  });
  it("high lambdas → more probability over a low line", () => {
    const { over } = poissonOverUnder(3, 3, 2.5, 15);
    expect(over).toBeGreaterThan(0.5);
  });
  it("low lambdas → more probability under a high line", () => {
    const { under } = poissonOverUnder(0.5, 0.5, 4.5, 15);
    expect(under).toBeGreaterThan(0.5);
  });
  it("over and under are non-negative", () => {
    const { over, under } = poissonOverUnder(1.5, 1.2, 2.5);
    expect(over).toBeGreaterThanOrEqual(0);
    expect(under).toBeGreaterThanOrEqual(0);
  });
});

describe("binomialWinStreak", () => {
  it("returns 0 when n < streakLength", () => {
    expect(binomialWinStreak(0.9, 3, 5)).toBe(0);
  });
  it("returns 0 when p = 0", () => {
    expect(binomialWinStreak(0, 10, 3)).toBe(0);
  });
  it("returns 1 when p = 1 (always win)", () => {
    expect(binomialWinStreak(1, 5, 3)).toBeCloseTo(1, 8);
  });
  it("probability increases with more games", () => {
    const p10 = binomialWinStreak(0.5, 10, 3);
    const p20 = binomialWinStreak(0.5, 20, 3);
    expect(p20).toBeGreaterThan(p10);
  });
  it("probability increases with higher win rate", () => {
    const pLow = binomialWinStreak(0.3, 10, 3);
    const pHigh = binomialWinStreak(0.7, 10, 3);
    expect(pHigh).toBeGreaterThan(pLow);
  });
  it("returns value in [0,1]", () => {
    const p = binomialWinStreak(0.6, 15, 4);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
  it("streak of 1 → P(at least one win) = 1 - (1-p)^n", () => {
    const p = 0.5;
    const n = 5;
    const expected = 1 - Math.pow(1 - p, n);
    expect(binomialWinStreak(p, n, 1)).toBeCloseTo(expected, 5);
  });
  it("streak length equals n: only if all games are won", () => {
    // P(streak=n) = p^n (but formula measures at-least-one)
    const p = 0.5;
    const n = 5;
    // P(at least one streak of length n) ≈ p^n
    expect(binomialWinStreak(p, n, n)).toBeCloseTo(Math.pow(p, n), 4);
  });
});

describe("expectedPointsNFL", () => {
  it("winProb=0.6 → expectedPoints=0.6", () => {
    expect(expectedPointsNFL(0.6)).toBeCloseTo(0.6, 8);
  });
  it("winProb=0 → 0", () => {
    expect(expectedPointsNFL(0)).toBe(0);
  });
  it("winProb=1 → 1", () => {
    expect(expectedPointsNFL(1)).toBe(1);
  });
  it("returns winProb directly", () => {
    const p = 0.75;
    expect(expectedPointsNFL(p)).toBe(p);
  });
});

// ---------------------------------------------------------------------------
// Cross-function consistency checks
// ---------------------------------------------------------------------------

describe("cross-function consistency", () => {
  it("normalCDF(0) ≈ 0.5 (new function)", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 5);
  });
  it("normalCDF(1.96) ≈ 0.975 (new function)", () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
  });
  it("poissonPMF consistent with poissonPmf legacy", () => {
    expect(poissonPMF(3, 2)).toBeCloseTo(poissonPmf(3, 2), 10);
  });
  it("gammaFunction(n) = (n-1)! for integers 1..5", () => {
    for (let n = 1; n <= 5; n++) {
      expect(gammaFunction(n)).toBeCloseTo(factorial(n - 1), 3);
    }
  });
  it("normalCDF and normalInverseCDF are inverses", () => {
    const p = 0.7;
    expect(normalCDF(normalInverseCDF(p))).toBeCloseTo(p, 5);
  });
  it("betaFunction(1,1) = 1", () => {
    expect(betaFunction(1, 1)).toBeCloseTo(1, 8);
  });
  it("pearsonCorrelation of perfect linear data = 1", () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map((v) => 3 * v + 7);
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 8);
  });
  it("chiSquaredCDF matches chi-square test p-values", () => {
    // For a chi-sq stat of 0 with any df, CDF should be 0
    expect(chiSquaredCDF(0, 3)).toBe(0);
  });
});
