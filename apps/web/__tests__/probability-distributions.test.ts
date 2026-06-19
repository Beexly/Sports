import { describe, it, expect } from "vitest";
import {
  // Log-gamma helpers
  logGamma,
  logBeta,
  logBinomialCoeff,
  // Normal distribution
  normalPdf,
  normalCdf,
  normalQuantile,
  normalRandom,
  zScore,
  pValueOneSided,
  pValueTwoSided,
  // Beta distribution
  betaPdf,
  betaCdf,
  betaMean,
  betaVariance,
  betaMode,
  betaQuantile,
  betaRandom,
  // Bayesian
  bayesianProportion,
  bayesianABComparison,
  // Poisson
  poissonPmf,
  poissonCdf,
  poissonMean,
  poissonVariance,
  poissonQuantile,
  // Binomial
  binomialPmf,
  binomialCdf,
  binomialMean,
  binomialVariance,
  binomialQuantile,
  // Confidence intervals
  proportionConfidenceInterval,
  meanConfidenceInterval,
  differenceInProportionsCI,
  predictionInterval,
  // Entropy
  shannonEntropy,
  klDivergence,
  jensenShannonDivergence,
  relativeEntropy,
  // Sports
  winProbabilityFromOdds,
  devig,
  poissonGoalModel,
  sportsBettingEv,
  kellyCriterion,
} from "@/lib/math/probability-distributions";

// ---------------------------------------------------------------------------
// logGamma
// ---------------------------------------------------------------------------

describe("logGamma", () => {
  it("logGamma(1) = 0 (Gamma(1) = 1)", () => {
    expect(logGamma(1)).toBeCloseTo(0, 10);
  });

  it("logGamma(2) = 0 (Gamma(2) = 1)", () => {
    expect(logGamma(2)).toBeCloseTo(0, 10);
  });

  it("logGamma(0.5) = log(sqrt(pi))", () => {
    const expected = 0.5 * Math.log(Math.PI);
    expect(logGamma(0.5)).toBeCloseTo(expected, 5);
  });

  it("logGamma(5) = log(24) = log(4!)", () => {
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 8);
  });

  it("logGamma(3) = log(2)", () => {
    expect(logGamma(3)).toBeCloseTo(Math.log(2), 8);
  });

  it("returns Infinity for x <= 0", () => {
    expect(logGamma(0)).toBe(Infinity);
    expect(logGamma(-1)).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// logBeta
// ---------------------------------------------------------------------------

describe("logBeta", () => {
  it("logBeta(a,b) = logGamma(a) + logGamma(b) - logGamma(a+b)", () => {
    const a = 3;
    const b = 5;
    const expected = logGamma(a) + logGamma(b) - logGamma(a + b);
    expect(logBeta(a, b)).toBeCloseTo(expected, 10);
  });

  it("logBeta(1,1) = 0 (Beta(1,1) = 1)", () => {
    expect(logBeta(1, 1)).toBeCloseTo(0, 10);
  });

  it("logBeta is symmetric: logBeta(a,b) == logBeta(b,a)", () => {
    expect(logBeta(2, 7)).toBeCloseTo(logBeta(7, 2), 10);
  });
});

// ---------------------------------------------------------------------------
// logBinomialCoeff
// ---------------------------------------------------------------------------

describe("logBinomialCoeff", () => {
  it("log C(5,2) = log(10)", () => {
    expect(logBinomialCoeff(5, 2)).toBeCloseTo(Math.log(10), 8);
  });

  it("log C(n,0) = 0", () => {
    expect(logBinomialCoeff(10, 0)).toBeCloseTo(0, 10);
  });

  it("log C(n,n) = 0", () => {
    expect(logBinomialCoeff(7, 7)).toBeCloseTo(0, 10);
  });

  it("returns -Infinity for k > n", () => {
    expect(logBinomialCoeff(3, 5)).toBe(-Infinity);
  });
});

// ---------------------------------------------------------------------------
// normalPdf
// ---------------------------------------------------------------------------

describe("normalPdf", () => {
  it("N(0,1) at x=0 ≈ 0.3989", () => {
    expect(normalPdf(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 6);
  });

  it("is symmetric around mean=0", () => {
    expect(normalPdf(1)).toBeCloseTo(normalPdf(-1), 10);
  });

  it("N(5, 2) peaks at x=mean", () => {
    const atMean = normalPdf(5, 5, 2);
    expect(normalPdf(3, 5, 2)).toBeLessThan(atMean);
    expect(normalPdf(7, 5, 2)).toBeLessThan(atMean);
  });

  it("larger std → lower peak", () => {
    expect(normalPdf(0, 0, 2)).toBeLessThan(normalPdf(0, 0, 1));
  });

  it("is always non-negative", () => {
    expect(normalPdf(-100)).toBeGreaterThanOrEqual(0);
    expect(normalPdf(100)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// normalCdf
// ---------------------------------------------------------------------------

describe("normalCdf", () => {
  it("Phi(0) = 0.5", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it("Phi(1.96) ≈ 0.975", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });

  it("Phi(-1.96) ≈ 0.025", () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it("Phi(-inf) = 0, Phi(+inf) = 1", () => {
    expect(normalCdf(-100)).toBeCloseTo(0, 8);
    expect(normalCdf(100)).toBeCloseTo(1, 8);
  });

  it("is monotonically increasing", () => {
    expect(normalCdf(0)).toBeLessThan(normalCdf(1));
    expect(normalCdf(-2)).toBeLessThan(normalCdf(-1));
  });

  it("N(5, 2): CDF at mean = 0.5", () => {
    expect(normalCdf(5, 5, 2)).toBeCloseTo(0.5, 6);
  });

  it("Phi(1) ≈ 0.8413", () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3);
  });
});

// ---------------------------------------------------------------------------
// normalQuantile
// ---------------------------------------------------------------------------

describe("normalQuantile", () => {
  it("normalQuantile(0.5) = 0", () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 5);
  });

  it("normalQuantile(0.975) ≈ 1.96", () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.96, 2);
  });

  it("normalQuantile(0.025) ≈ -1.96", () => {
    expect(normalQuantile(0.025)).toBeCloseTo(-1.96, 2);
  });

  it("roundtrip: normalCdf(normalQuantile(p)) ≈ p", () => {
    for (const p of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 6);
    }
  });

  it("normalQuantile(0) = -Infinity, normalQuantile(1) = Infinity", () => {
    expect(normalQuantile(0)).toBe(-Infinity);
    expect(normalQuantile(1)).toBe(Infinity);
  });

  it("non-standard: normalQuantile(0.5, 10, 3) = 10", () => {
    expect(normalQuantile(0.5, 10, 3)).toBeCloseTo(10, 4);
  });
});

// ---------------------------------------------------------------------------
// normalRandom
// ---------------------------------------------------------------------------

describe("normalRandom", () => {
  it("returns a finite number", () => {
    const v = normalRandom(0, 1, 42);
    expect(isFinite(v)).toBe(true);
  });

  it("different seeds produce different values", () => {
    const v1 = normalRandom(0, 1, 1);
    const v2 = normalRandom(0, 1, 2);
    expect(v1).not.toBe(v2);
  });
});

// ---------------------------------------------------------------------------
// zScore, pValueOneSided, pValueTwoSided
// ---------------------------------------------------------------------------

describe("zScore", () => {
  it("(10 - 5) / 2 = 2.5", () => {
    expect(zScore(10, 5, 2)).toBeCloseTo(2.5, 10);
  });

  it("zScore(mean, mean, std) = 0", () => {
    expect(zScore(7, 7, 3)).toBeCloseTo(0, 10);
  });
});

describe("pValueOneSided", () => {
  it("z=0 → 0.5", () => {
    expect(pValueOneSided(0)).toBeCloseTo(0.5, 6);
  });

  it("z=1.645 → ≈ 0.05", () => {
    expect(pValueOneSided(1.645)).toBeCloseTo(0.05, 2);
  });

  it("z=1.96 → ≈ 0.025", () => {
    expect(pValueOneSided(1.96)).toBeCloseTo(0.025, 3);
  });
});

describe("pValueTwoSided", () => {
  it("z=0 → 1.0", () => {
    expect(pValueTwoSided(0)).toBeCloseTo(1, 6);
  });

  it("z=1.96 → ≈ 0.05", () => {
    expect(pValueTwoSided(1.96)).toBeCloseTo(0.05, 2);
  });

  it("symmetric: pValueTwoSided(-z) == pValueTwoSided(z)", () => {
    expect(pValueTwoSided(-1.96)).toBeCloseTo(pValueTwoSided(1.96), 10);
  });
});

// ---------------------------------------------------------------------------
// betaPdf
// ---------------------------------------------------------------------------

describe("betaPdf", () => {
  it("Beta(1,1) = 1 everywhere in (0,1)", () => {
    expect(betaPdf(0.1, 1, 1)).toBeCloseTo(1, 6);
    expect(betaPdf(0.5, 1, 1)).toBeCloseTo(1, 6);
    expect(betaPdf(0.9, 1, 1)).toBeCloseTo(1, 6);
  });

  it("Beta(2,2) at x=0.5 = 1.5", () => {
    expect(betaPdf(0.5, 2, 2)).toBeCloseTo(1.5, 5);
  });

  it("returns 0 outside [0,1]", () => {
    expect(betaPdf(-0.1, 2, 2)).toBe(0);
    expect(betaPdf(1.1, 2, 2)).toBe(0);
  });

  it("Beta(a,b) is symmetric when a=b: pdf(x) = pdf(1-x)", () => {
    expect(betaPdf(0.3, 3, 3)).toBeCloseTo(betaPdf(0.7, 3, 3), 8);
  });

  it("Beta(0.5, 0.5) goes to infinity at boundaries", () => {
    expect(betaPdf(0, 0.5, 0.5)).toBe(Infinity);
    expect(betaPdf(1, 0.5, 0.5)).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// betaCdf
// ---------------------------------------------------------------------------

describe("betaCdf", () => {
  it("Beta(1,1) CDF is x", () => {
    expect(betaCdf(0.3, 1, 1)).toBeCloseTo(0.3, 5);
    expect(betaCdf(0.7, 1, 1)).toBeCloseTo(0.7, 5);
  });

  it("Beta(2,2) CDF at 0.5 = 0.5 (symmetric)", () => {
    expect(betaCdf(0.5, 2, 2)).toBeCloseTo(0.5, 5);
  });

  it("betaCdf(0, ...) = 0", () => {
    expect(betaCdf(0, 2, 3)).toBe(0);
  });

  it("betaCdf(1, ...) = 1", () => {
    expect(betaCdf(1, 2, 3)).toBe(1);
  });

  it("is monotonically increasing", () => {
    const a = 2;
    const b = 5;
    expect(betaCdf(0.2, a, b)).toBeLessThan(betaCdf(0.5, a, b));
    expect(betaCdf(0.5, a, b)).toBeLessThan(betaCdf(0.8, a, b));
  });

  it("Beta(2,5) at 0.25 ≈ known value", () => {
    // P(X<=0.25) for Beta(2,5):
    // = 30 * integral_0^0.25 x*(1-x)^4 dx
    // = 30 * [u^5/5 - u^6/6]_{0.75}^{1}  (substituting u=1-x)
    // = 30 * [(1/5 - 1/6) - (0.75^5/5 - 0.75^6/6)]
    // ≈ 0.46606
    expect(betaCdf(0.25, 2, 5)).toBeCloseTo(0.46606, 3);
  });
});

// ---------------------------------------------------------------------------
// betaMean, betaVariance, betaMode
// ---------------------------------------------------------------------------

describe("betaMean", () => {
  it("Beta(2,8) mean = 0.2", () => {
    expect(betaMean(2, 8)).toBeCloseTo(0.2, 10);
  });

  it("Beta(1,1) mean = 0.5", () => {
    expect(betaMean(1, 1)).toBeCloseTo(0.5, 10);
  });
});

describe("betaVariance", () => {
  it("Beta(2,8): variance = 2*8/(10^2 * 11) = 16/1100", () => {
    expect(betaVariance(2, 8)).toBeCloseTo((2 * 8) / (100 * 11), 10);
  });

  it("Beta(1,1): variance = 1/12", () => {
    expect(betaVariance(1, 1)).toBeCloseTo(1 / 12, 10);
  });
});

describe("betaMode", () => {
  it("Beta(2,8) mode = 1/8 = 0.125", () => {
    expect(betaMode(2, 8)).toBeCloseTo(1 / 8, 10);
  });

  it("Beta(1,1) mode = null (not unique interior point)", () => {
    expect(betaMode(1, 1)).toBeNull();
  });

  it("Beta(0.5, 2) mode = null (alpha <= 1)", () => {
    expect(betaMode(0.5, 2)).toBeNull();
  });

  it("Beta(3,3) mode = 0.5 (symmetric)", () => {
    expect(betaMode(3, 3)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// betaQuantile
// ---------------------------------------------------------------------------

describe("betaQuantile", () => {
  it("betaQuantile(0.5, 1, 1) = 0.5 (uniform median)", () => {
    expect(betaQuantile(0.5, 1, 1)).toBeCloseTo(0.5, 4);
  });

  it("betaQuantile(0, ...) = 0", () => {
    expect(betaQuantile(0, 2, 3)).toBe(0);
  });

  it("betaQuantile(1, ...) = 1", () => {
    expect(betaQuantile(1, 2, 3)).toBe(1);
  });

  it("roundtrip: betaCdf(betaQuantile(p, a, b), a, b) ≈ p", () => {
    const a = 2;
    const b = 5;
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const q = betaQuantile(p, a, b);
      expect(betaCdf(q, a, b)).toBeCloseTo(p, 4);
    }
  });
});

// ---------------------------------------------------------------------------
// betaRandom
// ---------------------------------------------------------------------------

describe("betaRandom", () => {
  it("returns a value in [0, 1]", () => {
    const v = betaRandom(2, 5, 99);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it("different seeds produce different values", () => {
    const v1 = betaRandom(2, 5, 1);
    const v2 = betaRandom(2, 5, 2);
    expect(v1).not.toBe(v2);
  });

  it("Beta(1, 1) samples should be roughly uniform (basic sanity)", () => {
    // Generate 1000 samples, mean should be close to 0.5
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(betaRandom(1, 1, i + 1));
    }
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });
});

// ---------------------------------------------------------------------------
// bayesianProportion
// ---------------------------------------------------------------------------

describe("bayesianProportion", () => {
  it("10/100 with uniform prior → mean ≈ 0.1 (posterior mean = (s+1)/(n+2))", () => {
    // With Beta(1,1) prior + 10 successes / 100 trials → posterior Beta(11,91)
    // mean = 11/102 ≈ 0.1078
    const result = bayesianProportion(10, 100);
    expect(result.mean).toBeCloseTo(11 / 102, 6);
  });

  it("posteriorAlpha = priorAlpha + successes", () => {
    const result = bayesianProportion(10, 100, 2, 2);
    expect(result.posteriorAlpha).toBe(12);
    expect(result.posteriorBeta).toBe(92);
  });

  it("95% credible interval contains 0.1", () => {
    const result = bayesianProportion(10, 100);
    expect(result.credibleInterval[0]).toBeLessThan(0.1);
    expect(result.credibleInterval[1]).toBeGreaterThan(0.1);
  });

  it("uniform prior yields posterior mean = (s+1)/(n+2) for Beta(1,1)", () => {
    const s = 30;
    const n = 100;
    const result = bayesianProportion(s, n, 1, 1);
    expect(result.mean).toBeCloseTo((s + 1) / (n + 2), 8);
  });

  it("mode is null for low counts (alpha<=1)", () => {
    const result = bayesianProportion(0, 5, 1, 1);
    // posteriorAlpha=1, posteriorBeta=6 → mode null
    expect(result.mode).toBeNull();
  });

  it("high success rate → credible interval above 0.5", () => {
    const result = bayesianProportion(90, 100);
    expect(result.credibleInterval[0]).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// bayesianABComparison
// ---------------------------------------------------------------------------

describe("bayesianABComparison", () => {
  it("B=90/100 vs A=50/100 → probBBeatsA > 0.99", () => {
    const result = bayesianABComparison(50, 100, 90, 100);
    expect(result.probBBeatsA).toBeGreaterThan(0.99);
  });

  it("equal arms → probBBeatsA ≈ 0.5", () => {
    const result = bayesianABComparison(50, 100, 50, 100, 1, 1, 50000);
    expect(result.probBBeatsA).toBeGreaterThan(0.4);
    expect(result.probBBeatsA).toBeLessThan(0.6);
  });

  it("credibleInterval is [lo, hi] with lo < hi", () => {
    const result = bayesianABComparison(60, 100, 80, 100);
    expect(result.credibleInterval[0]).toBeLessThan(result.credibleInterval[1]);
  });

  it("expectedLift is positive when B >> A", () => {
    const result = bayesianABComparison(30, 100, 80, 100);
    expect(result.expectedLift).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// poissonPmf
// ---------------------------------------------------------------------------

describe("poissonPmf", () => {
  it("P(0 | lambda=3) = e^-3", () => {
    expect(poissonPmf(0, 3)).toBeCloseTo(Math.exp(-3), 8);
  });

  it("P(3 | lambda=3) ≈ 0.2240", () => {
    // 3^3 * e^-3 / 6 = 27 * e^-3 / 6 = 4.5 * e^-3
    expect(poissonPmf(3, 3)).toBeCloseTo((27 * Math.exp(-3)) / 6, 6);
  });

  it("returns 0 for negative k", () => {
    expect(poissonPmf(-1, 3)).toBe(0);
  });

  it("returns 0 for non-integer k", () => {
    expect(poissonPmf(1.5, 3)).toBe(0);
  });

  it("PMF sums to ≈1 over a large range", () => {
    let total = 0;
    for (let k = 0; k <= 30; k++) total += poissonPmf(k, 5);
    expect(total).toBeCloseTo(1, 4);
  });

  it("P(k | lambda=0) = delta(k, 0)", () => {
    expect(poissonPmf(0, 0)).toBe(1);
    expect(poissonPmf(1, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// poissonCdf
// ---------------------------------------------------------------------------

describe("poissonCdf", () => {
  it("CDF at k=0 = PMF(0)", () => {
    expect(poissonCdf(0, 2)).toBeCloseTo(Math.exp(-2), 8);
  });

  it("CDF is monotonically non-decreasing", () => {
    const lambda = 3;
    for (let k = 0; k < 10; k++) {
      expect(poissonCdf(k + 1, lambda)).toBeGreaterThanOrEqual(poissonCdf(k, lambda));
    }
  });

  it("CDF converges to 1 for large k", () => {
    expect(poissonCdf(50, 5)).toBeCloseTo(1, 6);
  });

  it("CDF(k < 0) = 0", () => {
    expect(poissonCdf(-1, 3)).toBe(0);
  });

  it("CDF matches cumulative sum of PMF", () => {
    const lambda = 4;
    const k = 5;
    let manual = 0;
    for (let i = 0; i <= k; i++) manual += poissonPmf(i, lambda);
    expect(poissonCdf(k, lambda)).toBeCloseTo(manual, 10);
  });
});

// ---------------------------------------------------------------------------
// poissonMean / poissonVariance
// ---------------------------------------------------------------------------

describe("poissonMean and poissonVariance", () => {
  it("mean = lambda", () => {
    expect(poissonMean(7)).toBe(7);
    expect(poissonMean(0.5)).toBe(0.5);
  });

  it("variance = lambda", () => {
    expect(poissonVariance(7)).toBe(7);
    expect(poissonVariance(2.5)).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// poissonQuantile
// ---------------------------------------------------------------------------

describe("poissonQuantile", () => {
  it("min k where CDF(k) >= p", () => {
    const lambda = 3;
    for (const p of [0.1, 0.5, 0.9, 0.99]) {
      const k = poissonQuantile(p, lambda);
      expect(poissonCdf(k, lambda)).toBeGreaterThanOrEqual(p);
      if (k > 0) {
        expect(poissonCdf(k - 1, lambda)).toBeLessThan(p);
      }
    }
  });

  it("poissonQuantile(0, lambda) = 0", () => {
    expect(poissonQuantile(0, 3)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// binomialPmf
// ---------------------------------------------------------------------------

describe("binomialPmf", () => {
  it("Binomial(10, 0.5) PMF at k=5", () => {
    // C(10,5) * 0.5^10 = 252 / 1024
    expect(binomialPmf(5, 10, 0.5)).toBeCloseTo(252 / 1024, 8);
  });

  it("sums to 1 over all k for n=10, p=0.3", () => {
    let total = 0;
    for (let k = 0; k <= 10; k++) total += binomialPmf(k, 10, 0.3);
    expect(total).toBeCloseTo(1, 8);
  });

  it("returns 0 for k < 0 or k > n", () => {
    expect(binomialPmf(-1, 10, 0.5)).toBe(0);
    expect(binomialPmf(11, 10, 0.5)).toBe(0);
  });

  it("p=0: PMF is 1 at k=0", () => {
    expect(binomialPmf(0, 10, 0)).toBe(1);
    expect(binomialPmf(1, 10, 0)).toBe(0);
  });

  it("p=1: PMF is 1 at k=n", () => {
    expect(binomialPmf(10, 10, 1)).toBe(1);
    expect(binomialPmf(9, 10, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// binomialCdf
// ---------------------------------------------------------------------------

describe("binomialCdf", () => {
  it("Binomial(10, 0.5) CDF at k=5 ≈ 0.623", () => {
    // P(X<=5) for Bin(10, 0.5): sum_{k=0}^{5} C(10,k)/2^10
    let expected = 0;
    for (let k = 0; k <= 5; k++) {
      const coeff = [1, 10, 45, 120, 210, 252][k]!;
      expected += coeff / 1024;
    }
    expect(binomialCdf(5, 10, 0.5)).toBeCloseTo(expected, 6);
  });

  it("CDF(n, ...) = 1", () => {
    expect(binomialCdf(10, 10, 0.5)).toBeCloseTo(1, 8);
  });

  it("CDF is monotonically increasing", () => {
    for (let k = 0; k < 9; k++) {
      expect(binomialCdf(k + 1, 10, 0.4)).toBeGreaterThanOrEqual(binomialCdf(k, 10, 0.4));
    }
  });
});

// ---------------------------------------------------------------------------
// binomialMean / binomialVariance
// ---------------------------------------------------------------------------

describe("binomialMean and binomialVariance", () => {
  it("n=10, p=0.5 → mean=5, variance=2.5", () => {
    expect(binomialMean(10, 0.5)).toBeCloseTo(5, 10);
    expect(binomialVariance(10, 0.5)).toBeCloseTo(2.5, 10);
  });

  it("n=100, p=0.3 → mean=30, variance=21", () => {
    expect(binomialMean(100, 0.3)).toBeCloseTo(30, 10);
    expect(binomialVariance(100, 0.3)).toBeCloseTo(21, 10);
  });
});

// ---------------------------------------------------------------------------
// binomialQuantile
// ---------------------------------------------------------------------------

describe("binomialQuantile", () => {
  it("min k where CDF(k) >= prob", () => {
    const n = 10;
    const p = 0.5;
    for (const prob of [0.1, 0.5, 0.9]) {
      const k = binomialQuantile(prob, n, p);
      expect(binomialCdf(k, n, p)).toBeGreaterThanOrEqual(prob);
      if (k > 0) {
        expect(binomialCdf(k - 1, n, p)).toBeLessThan(prob);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// proportionConfidenceInterval (Wilson score)
// ---------------------------------------------------------------------------

describe("proportionConfidenceInterval", () => {
  it("50/100 → 95% CI contains 0.5", () => {
    const [lo, hi] = proportionConfidenceInterval(50, 100);
    expect(lo).toBeLessThan(0.5);
    expect(hi).toBeGreaterThan(0.5);
  });

  it("returns [lo, hi] where 0 <= lo <= hi <= 1", () => {
    const [lo, hi] = proportionConfidenceInterval(5, 20);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeLessThan(hi);
  });

  it("wider CI with lower confidence", () => {
    const [lo95, hi95] = proportionConfidenceInterval(50, 100, 0.95);
    const [lo80, hi80] = proportionConfidenceInterval(50, 100, 0.8);
    expect(hi95 - lo95).toBeGreaterThan(hi80 - lo80);
  });

  it("small sample: 1/10 → CI above 0 and below 1", () => {
    const [lo, hi] = proportionConfidenceInterval(1, 10);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// meanConfidenceInterval
// ---------------------------------------------------------------------------

describe("meanConfidenceInterval", () => {
  it("CI contains the true mean for simple data", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const [lo, hi] = meanConfidenceInterval(values);
    const mean = 5.5;
    expect(lo).toBeLessThan(mean);
    expect(hi).toBeGreaterThan(mean);
  });

  it("centered on the sample mean", () => {
    const values = [10, 12, 14, 16, 18];
    const [lo, hi] = meanConfidenceInterval(values);
    const mean = 14;
    expect((lo + hi) / 2).toBeCloseTo(mean, 4);
  });

  it("larger sample → narrower CI", () => {
    const small = Array.from({ length: 5 }, (_, i) => i);
    const large = Array.from({ length: 100 }, (_, i) => i % 5);
    const [lo5, hi5] = meanConfidenceInterval(small);
    const [lo100, hi100] = meanConfidenceInterval(large);
    expect(hi5 - lo5).toBeGreaterThan(hi100 - lo100);
  });
});

// ---------------------------------------------------------------------------
// differenceInProportionsCI
// ---------------------------------------------------------------------------

describe("differenceInProportionsCI", () => {
  it("different rates → 95% CI excludes 0", () => {
    // p1 = 0.8 (n=100), p2 = 0.2 (n=100)
    const [lo, hi] = differenceInProportionsCI(100, 80, 100, 20);
    expect(lo).toBeGreaterThan(0); // difference is clearly positive
    expect(hi).toBeGreaterThan(lo);
  });

  it("same proportions → CI contains 0", () => {
    const [lo, hi] = differenceInProportionsCI(100, 50, 100, 50);
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// predictionInterval
// ---------------------------------------------------------------------------

describe("predictionInterval", () => {
  it("wider than confidence interval", () => {
    const values = Array.from({ length: 20 }, (_, i) => i);
    const [loCI, hiCI] = meanConfidenceInterval(values);
    const [loPred, hiPred] = predictionInterval(values);
    expect(hiPred - loPred).toBeGreaterThan(hiCI - loCI);
  });

  it("centered on the sample mean", () => {
    const values = [2, 4, 6, 8, 10];
    const [lo, hi] = predictionInterval(values);
    expect((lo + hi) / 2).toBeCloseTo(6, 4);
  });
});

// ---------------------------------------------------------------------------
// shannonEntropy
// ---------------------------------------------------------------------------

describe("shannonEntropy", () => {
  it("uniform [0.5, 0.5] = 1 bit", () => {
    expect(shannonEntropy([0.5, 0.5])).toBeCloseTo(1, 8);
  });

  it("[1, 0] = 0 bits (certain outcome)", () => {
    expect(shannonEntropy([1, 0])).toBeCloseTo(0, 8);
  });

  it("uniform over 4 = 2 bits", () => {
    expect(shannonEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(2, 8);
  });

  it("is maximized by uniform distribution", () => {
    const skewed = shannonEntropy([0.9, 0.1]);
    const uniform = shannonEntropy([0.5, 0.5]);
    expect(uniform).toBeGreaterThan(skewed);
  });
});

// ---------------------------------------------------------------------------
// klDivergence
// ---------------------------------------------------------------------------

describe("klDivergence", () => {
  it("KL(p || p) = 0", () => {
    const p = [0.3, 0.5, 0.2];
    expect(klDivergence(p, p)).toBeCloseTo(0, 10);
  });

  it("KL(p || q) >= 0", () => {
    const p = [0.3, 0.5, 0.2];
    const q = [0.1, 0.6, 0.3];
    expect(klDivergence(p, q)).toBeGreaterThanOrEqual(0);
  });

  it("KL is not symmetric in general", () => {
    const p = [0.9, 0.1];
    const q = [0.5, 0.5];
    expect(klDivergence(p, q)).not.toBeCloseTo(klDivergence(q, p), 3);
  });

  it("returns Infinity when q=0 but p>0", () => {
    expect(klDivergence([0.5, 0.5], [1, 0])).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// jensenShannonDivergence
// ---------------------------------------------------------------------------

describe("jensenShannonDivergence", () => {
  it("JSD(p, p) = 0", () => {
    const p = [0.3, 0.7];
    expect(jensenShannonDivergence(p, p)).toBeCloseTo(0, 8);
  });

  it("JSD is symmetric", () => {
    const p = [0.3, 0.7];
    const q = [0.6, 0.4];
    expect(jensenShannonDivergence(p, q)).toBeCloseTo(jensenShannonDivergence(q, p), 8);
  });

  it("JSD >= 0", () => {
    const p = [0.2, 0.8];
    const q = [0.7, 0.3];
    expect(jensenShannonDivergence(p, q)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// relativeEntropy
// ---------------------------------------------------------------------------

describe("relativeEntropy", () => {
  it("relativeEntropy(obs, obs) = 0", () => {
    const obs = [10, 20, 30];
    expect(relativeEntropy(obs, obs)).toBeCloseTo(0, 10);
  });

  it("is positive when distributions differ", () => {
    const obs = [40, 60];
    const exp = [50, 50];
    expect(relativeEntropy(obs, exp)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// winProbabilityFromOdds
// ---------------------------------------------------------------------------

describe("winProbabilityFromOdds", () => {
  it("-110 → 52.38..%", () => {
    // 110 / (110 + 100) = 110/210
    expect(winProbabilityFromOdds(-110)).toBeCloseTo(110 / 210, 5);
  });

  it("+150 → 40%", () => {
    expect(winProbabilityFromOdds(150)).toBeCloseTo(0.4, 5);
  });

  it("+100 → 50%", () => {
    expect(winProbabilityFromOdds(100)).toBeCloseTo(0.5, 5);
  });

  it("-200 → 66.67%", () => {
    expect(winProbabilityFromOdds(-200)).toBeCloseTo(200 / 300, 5);
  });

  it("+300 → 25%", () => {
    expect(winProbabilityFromOdds(300)).toBeCloseTo(0.25, 5);
  });
});

// ---------------------------------------------------------------------------
// devig
// ---------------------------------------------------------------------------

describe("devig", () => {
  it("probabilities sum to 1.0 after normalization", () => {
    const result = devig(-110, -110);
    expect(result.homeProb + result.awayProb).toBeCloseTo(1, 8);
  });

  it("symmetric market: each side = 0.5", () => {
    const result = devig(-110, -110);
    expect(result.homeProb).toBeCloseTo(0.5, 4);
    expect(result.awayProb).toBeCloseTo(0.5, 4);
  });

  it("favorite has higher probability than underdog", () => {
    const result = devig(-200, +160);
    expect(result.homeProb).toBeGreaterThan(result.awayProb);
  });

  it("devigged probs sum to exactly 1", () => {
    const result = devig(-150, +130);
    expect(result.homeProb + result.awayProb).toBeCloseTo(1, 10);
  });
});

// ---------------------------------------------------------------------------
// poissonGoalModel
// ---------------------------------------------------------------------------

describe("poissonGoalModel", () => {
  it("homeWin + draw + awayWin ≈ 1", () => {
    const result = poissonGoalModel(1.5, 1.0);
    expect(result.homeWin + result.draw + result.awayWin).toBeCloseTo(1, 4);
  });

  it("all probabilities are in [0, 1]", () => {
    const result = poissonGoalModel(1.5, 1.0);
    expect(result.homeWin).toBeGreaterThanOrEqual(0);
    expect(result.homeWin).toBeLessThanOrEqual(1);
    expect(result.draw).toBeGreaterThanOrEqual(0);
    expect(result.awayWin).toBeGreaterThanOrEqual(0);
  });

  it("scoreMatrix rows sum to ≤ 1 (truncated Poisson)", () => {
    const result = poissonGoalModel(1.5, 1.0, 8);
    let total = 0;
    for (const row of result.scoreMatrix) {
      for (const p of row) total += p;
    }
    // Should be close to 1 (truncation at maxGoals)
    expect(total).toBeGreaterThan(0.95);
  });

  it("higher home goal rate → higher homeWin probability", () => {
    const balanced = poissonGoalModel(1.0, 1.0);
    const homeStrong = poissonGoalModel(2.5, 0.5);
    expect(homeStrong.homeWin).toBeGreaterThan(balanced.homeWin);
  });

  it("scoreMatrix is (maxGoals+1) x (maxGoals+1)", () => {
    const result = poissonGoalModel(1.5, 1.0, 5);
    expect(result.scoreMatrix.length).toBe(6);
    expect(result.scoreMatrix[0]!.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// sportsBettingEv
// ---------------------------------------------------------------------------

describe("sportsBettingEv", () => {
  it("positive EV when winning more than break-even", () => {
    // Break-even for -110 is 110/210 ≈ 52.38%
    // If our model says 55%, we have positive EV
    const ev = sportsBettingEv(0.55, -110);
    expect(ev).toBeGreaterThan(0);
  });

  it("negative EV when winning less than break-even", () => {
    const ev = sportsBettingEv(0.45, -110);
    expect(ev).toBeLessThan(0);
  });

  it("EV = 0 at break-even probability for -110", () => {
    const breakEven = 110 / 210;
    const ev = sportsBettingEv(breakEven, -110);
    expect(ev).toBeCloseTo(0, 4);
  });

  it("positive odds +200 → EV positive when winning >33.3%", () => {
    const ev = sportsBettingEv(0.4, 200);
    expect(ev).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// kellyCriterion
// ---------------------------------------------------------------------------

describe("kellyCriterion", () => {
  it("returns 0 at break-even probability", () => {
    const breakEven = 110 / 210;
    expect(kellyCriterion(breakEven, -110)).toBeCloseTo(0, 4);
  });

  it("positive when favorable", () => {
    expect(kellyCriterion(0.55, -110)).toBeGreaterThan(0);
  });

  it("returns 0 or negative edge → 0 (clamped)", () => {
    expect(kellyCriterion(0.3, -110)).toBe(0);
  });

  it("+100 (even money) at p=0.6 → f = 0.2", () => {
    // f = (1*0.6 - 0.4) / 1 = 0.2
    expect(kellyCriterion(0.6, 100)).toBeCloseTo(0.2, 5);
  });

  it("is positive for a clear edge at +EV odds", () => {
    expect(kellyCriterion(0.7, 200)).toBeGreaterThan(0);
  });
});
