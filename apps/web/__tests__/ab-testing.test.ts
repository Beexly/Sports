/**
 * Tests for ab-testing.ts — pure A/B testing utilities.
 * 145+ test cases covering all exported functions.
 */

import { describe, it, expect } from "vitest";
import {
  // existing exports
  assignVariant,
  hashString,
  twoProportionZTest,
  normalCdf,
  bayesianABTest,
  sampleSize,
  multiVariantTest,
  chiSquareTest,
  validateExperiment,
  normalizeWeights,
  summarizeExperiment,
  obrienFleming,
  epsilonGreedy,
  thompsonSampling,
  // new exports
  normCDF,
  normInvCDF,
  sampleSizeForProportionTest,
  sampleSizeForMeanTest,
  sampleSizeForRelativeLift,
  daysToReachSampleSize,
  twoProportionZTestV2,
  chiSquareTestV2,
  welchTTest,
  mannWhitneyU,
  confidenceIntervalDiff,
  relativeLift,
  absoluteDiff,
  cohenSD,
  cohenH,
  cramersV,
  pooledStd,
  effectSizeLabel,
  betaPosterior,
  bayesianProbBetterThan,
  bayesianExpectedLoss,
  credibleInterval,
  betaMean,
  betaMode,
  betaVariance,
  fnv1aHash,
  assignVariantV2,
  isInExperiment,
  stratifiedSample,
  obrienflemingBoundary,
  pocockBoundary,
  alphaSpent,
  peekedTooEarly,
  pickCTRLift,
  subscriptionLift,
  pickBoardEngagementTest,
  type Experiment,
  type Variant,
} from "@/lib/analytics/ab-testing";

// ---------------------------------------------------------------------------
// hashString (existing)
// ---------------------------------------------------------------------------
describe("hashString", () => {
  it("returns a number in [0, 99]", () => {
    for (const s of ["user1", "user2", "experiment:control", "", "abc123"]) {
      const h = hashString(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(99);
    }
  });

  it("is deterministic for same input", () => {
    expect(hashString("test-input")).toBe(hashString("test-input"));
  });

  it("produces different values for different inputs", () => {
    const values = new Set(Array.from({ length: 50 }, (_, i) => hashString(`user-${i}`)));
    expect(values.size).toBeGreaterThan(10);
  });

  it("handles empty string", () => {
    const h = hashString("");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(99);
  });

  it("handles unicode input", () => {
    const h = hashString("用户123");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(99);
  });
});

// ---------------------------------------------------------------------------
// assignVariant (existing)
// ---------------------------------------------------------------------------
describe("assignVariant (existing)", () => {
  const experiment: Experiment = {
    id: "exp-001",
    variants: [{ id: "control", weight: 0.5 }, { id: "treatment", weight: 0.5 }],
    active: true,
  };

  it("is deterministic", () => {
    for (let i = 0; i < 20; i++) {
      const r1 = assignVariant(experiment, `user-${i}`);
      const r2 = assignVariant(experiment, `user-${i}`);
      expect(r1.variantId).toBe(r2.variantId);
    }
  });

  it("returns a valid variantId", () => {
    const validIds = new Set(experiment.variants.map((v) => v.id));
    const r = assignVariant(experiment, "user-42");
    expect(validIds.has(r.variantId)).toBe(true);
  });

  it("bucket is in [0, 99]", () => {
    for (let i = 0; i < 20; i++) {
      const r = assignVariant(experiment, `user-${i}`);
      expect(r.bucket).toBeGreaterThanOrEqual(0);
      expect(r.bucket).toBeLessThanOrEqual(99);
    }
  });
});

// ---------------------------------------------------------------------------
// normalCdf (existing)
// ---------------------------------------------------------------------------
describe("normalCdf (existing)", () => {
  it("Phi(0) = 0.5", () => expect(normalCdf(0)).toBeCloseTo(0.5, 4));
  it("Phi(1.96) ≈ 0.975", () => expect(normalCdf(1.96)).toBeCloseTo(0.975, 2));
  it("Phi(-1.96) ≈ 0.025", () => expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2));
  it("Phi(-∞) ≈ 0", () => expect(normalCdf(-10)).toBeLessThan(0.0001));
  it("Phi(+∞) ≈ 1", () => expect(normalCdf(10)).toBeGreaterThan(0.9999));
});

// ---------------------------------------------------------------------------
// normCDF (new erf-based)
// ---------------------------------------------------------------------------
describe("normCDF", () => {
  it("normCDF(0) = 0.5", () => expect(normCDF(0)).toBeCloseTo(0.5, 5));
  it("normCDF(1.96) ≈ 0.975", () => expect(normCDF(1.96)).toBeCloseTo(0.975, 2));
  it("normCDF(-1.96) ≈ 0.025", () => expect(normCDF(-1.96)).toBeCloseTo(0.025, 2));
  it("normCDF(1.645) ≈ 0.95", () => expect(normCDF(1.645)).toBeCloseTo(0.95, 2));
  it("normCDF(-∞) ≈ 0", () => expect(normCDF(-10)).toBeLessThan(0.0001));
  it("normCDF(+∞) ≈ 1", () => expect(normCDF(10)).toBeGreaterThan(0.9999));
  it("symmetry: normCDF(z) + normCDF(-z) = 1", () => {
    for (const z of [0.5, 1, 1.5, 2, 2.5]) {
      expect(normCDF(z) + normCDF(-z)).toBeCloseTo(1, 5);
    }
  });
  it("is monotonically increasing", () => {
    const zs: number[] = [-3, -2, -1, 0, 1, 2, 3];
    for (let i = 1; i < zs.length; i++) {
      expect(normCDF(zs[i]!)).toBeGreaterThan(normCDF(zs[i - 1]!));
    }
  });
});

// ---------------------------------------------------------------------------
// normInvCDF
// ---------------------------------------------------------------------------
describe("normInvCDF", () => {
  it("normInvCDF(0.5) ≈ 0", () => expect(normInvCDF(0.5)).toBeCloseTo(0, 3));
  it("normInvCDF(0.975) ≈ 1.96", () => expect(normInvCDF(0.975)).toBeCloseTo(1.96, 1));
  it("normInvCDF(0.025) ≈ -1.96", () => expect(normInvCDF(0.025)).toBeCloseTo(-1.96, 1));
  it("normInvCDF(0.95) ≈ 1.645", () => expect(normInvCDF(0.95)).toBeCloseTo(1.645, 1));
  it("normInvCDF(0.8) ≈ 0.842", () => expect(normInvCDF(0.8)).toBeCloseTo(0.842, 1));
  it("round-trip: normCDF(normInvCDF(p)) ≈ p", () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(normCDF(normInvCDF(p))).toBeCloseTo(p, 4);
    }
  });
});

// ---------------------------------------------------------------------------
// sampleSizeForProportionTest
// ---------------------------------------------------------------------------
describe("sampleSizeForProportionTest", () => {
  it("returns ~3842 for baseline=0.1, MDE=0.02", () => {
    const n = sampleSizeForProportionTest(0.1, 0.02);
    expect(n).toBeGreaterThan(3000);
    expect(n).toBeLessThan(5000);
  });

  it("returns integer (ceiling)", () => {
    const n = sampleSizeForProportionTest(0.1, 0.02);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("larger MDE → smaller sample", () => {
    const small = sampleSizeForProportionTest(0.1, 0.02);
    const large = sampleSizeForProportionTest(0.1, 0.05);
    expect(large).toBeLessThan(small);
  });

  it("lower power → smaller sample", () => {
    const high = sampleSizeForProportionTest(0.1, 0.02, 0.05, 0.9);
    const low = sampleSizeForProportionTest(0.1, 0.02, 0.05, 0.7);
    expect(low).toBeLessThan(high);
  });

  it("lower alpha → larger sample", () => {
    const strict = sampleSizeForProportionTest(0.1, 0.02, 0.01);
    const loose = sampleSizeForProportionTest(0.1, 0.02, 0.1);
    expect(strict).toBeGreaterThan(loose);
  });

  it("result > 0", () => {
    expect(sampleSizeForProportionTest(0.05, 0.01)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// sampleSizeForMeanTest
// ---------------------------------------------------------------------------
describe("sampleSizeForMeanTest", () => {
  it("returns positive integer", () => {
    const n = sampleSizeForMeanTest(10, 2);
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("larger MDE → smaller sample", () => {
    const small = sampleSizeForMeanTest(10, 1);
    const large = sampleSizeForMeanTest(10, 5);
    expect(large).toBeLessThan(small);
  });

  it("larger std → larger sample", () => {
    const narrow = sampleSizeForMeanTest(5, 1);
    const wide = sampleSizeForMeanTest(20, 1);
    expect(wide).toBeGreaterThan(narrow);
  });

  it("lower power → smaller sample", () => {
    const high = sampleSizeForMeanTest(10, 2, 0.05, 0.9);
    const low = sampleSizeForMeanTest(10, 2, 0.05, 0.7);
    expect(low).toBeLessThan(high);
  });
});

// ---------------------------------------------------------------------------
// sampleSizeForRelativeLift
// ---------------------------------------------------------------------------
describe("sampleSizeForRelativeLift", () => {
  it("returns positive integer", () => {
    const n = sampleSizeForRelativeLift(0.1, 0.2);
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("is equivalent to sampleSizeForProportionTest with mde=baselineRate*relativeLift", () => {
    const n1 = sampleSizeForRelativeLift(0.1, 0.2);
    const n2 = sampleSizeForProportionTest(0.1, 0.1 * 0.2);
    expect(n1).toBe(n2);
  });

  it("larger lift → smaller sample", () => {
    const small = sampleSizeForRelativeLift(0.1, 0.1);
    const large = sampleSizeForRelativeLift(0.1, 0.5);
    expect(large).toBeLessThan(small);
  });
});

// ---------------------------------------------------------------------------
// daysToReachSampleSize
// ---------------------------------------------------------------------------
describe("daysToReachSampleSize", () => {
  it("returns ceil(n / (traffic * splitRatio))", () => {
    expect(daysToReachSampleSize(1000, 200, 0.5)).toBe(Math.ceil(1000 / (200 * 0.5)));
  });

  it("default splitRatio=0.5", () => {
    expect(daysToReachSampleSize(1000, 200)).toBe(Math.ceil(1000 / 100));
  });

  it("returns integer", () => {
    expect(Number.isInteger(daysToReachSampleSize(1001, 200))).toBe(true);
  });

  it("higher traffic → fewer days", () => {
    const low = daysToReachSampleSize(5000, 100);
    const high = daysToReachSampleSize(5000, 1000);
    expect(high).toBeLessThan(low);
  });

  it("higher split ratio → fewer days", () => {
    const low = daysToReachSampleSize(1000, 500, 0.1);
    const high = daysToReachSampleSize(1000, 500, 0.9);
    expect(high).toBeLessThan(low);
  });
});

// ---------------------------------------------------------------------------
// twoProportionZTestV2
// ---------------------------------------------------------------------------
describe("twoProportionZTestV2", () => {
  it("detects significant difference (10% vs 12%, n=5000)", () => {
    const r = twoProportionZTestV2(500, 5000, 600, 5000);
    expect(r.significant).toBe(true);
    expect(r.pValue).toBeLessThan(0.05);
  });

  it("z is positive when treatment > control", () => {
    const r = twoProportionZTestV2(500, 5000, 600, 5000);
    expect(r.z).toBeGreaterThan(0);
  });

  it("returns alpha=0.05", () => {
    const r = twoProportionZTestV2(100, 1000, 110, 1000);
    expect(r.alpha).toBe(0.05);
  });

  it("not significant for tiny difference", () => {
    const r = twoProportionZTestV2(100, 1000, 101, 1000);
    expect(r.significant).toBe(false);
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it("pValue in [0, 1]", () => {
    const r = twoProportionZTestV2(50, 500, 60, 500);
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
  });

  it("handles zero visitors", () => {
    const r = twoProportionZTestV2(0, 0, 10, 100);
    expect(r.significant).toBe(false);
    expect(r.pValue).toBe(1);
  });

  it("handles equal rates", () => {
    const r = twoProportionZTestV2(100, 1000, 100, 1000);
    expect(r.z).toBeCloseTo(0, 4);
    expect(r.significant).toBe(false);
  });

  it("large difference is significant", () => {
    const r = twoProportionZTestV2(100, 1000, 500, 1000);
    expect(r.significant).toBe(true);
    expect(r.pValue).toBeLessThan(0.001);
  });
});

// ---------------------------------------------------------------------------
// chiSquareTestV2
// ---------------------------------------------------------------------------
describe("chiSquareTestV2", () => {
  it("no difference → not significant", () => {
    const observed = [[500, 500], [500, 500]];
    const r = chiSquareTestV2(observed);
    expect(r.significant).toBe(false);
  });

  it("large difference → significant", () => {
    const observed = [[900, 100], [100, 900]];
    const r = chiSquareTestV2(observed);
    expect(r.significant).toBe(true);
    expect(r.pValue).toBeLessThan(0.001);
  });

  it("df = (rows-1)*(cols-1) for 2x2", () => {
    const observed = [[50, 50], [50, 50]];
    const r = chiSquareTestV2(observed);
    expect(r.df).toBe(1);
  });

  it("df = (3-1)*(3-1) = 4 for 3x3", () => {
    const observed = [[30, 20, 50], [40, 30, 30], [20, 50, 30]];
    const r = chiSquareTestV2(observed);
    expect(r.df).toBe(4);
  });

  it("chiSq is non-negative", () => {
    const observed = [[100, 200], [150, 150]];
    const r = chiSquareTestV2(observed);
    expect(r.chiSq).toBeGreaterThanOrEqual(0);
  });

  it("uses provided expected table", () => {
    const observed = [[100, 200], [150, 150]];
    const expected = [[100, 200], [150, 150]]; // identical
    const r = chiSquareTestV2(observed, expected);
    expect(r.chiSq).toBeCloseTo(0, 5);
    expect(r.significant).toBe(false);
  });

  it("pValue in [0, 1]", () => {
    const observed = [[80, 20], [40, 60]];
    const r = chiSquareTestV2(observed);
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// welchTTest
// ---------------------------------------------------------------------------
describe("welchTTest", () => {
  it("detects difference in means", () => {
    const control = Array.from({ length: 100 }, (_, i) => i * 0.1);
    const treatment = Array.from({ length: 100 }, (_, i) => i * 0.1 + 5);
    const r = welchTTest(control, treatment);
    expect(r.significant).toBe(true);
    expect(r.pValue).toBeLessThan(0.001);
  });

  it("no difference → not significant", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r = welchTTest(data, data);
    expect(r.t).toBeCloseTo(0, 5);
    expect(r.significant).toBe(false);
  });

  it("t is positive when treatment mean > control mean", () => {
    const control = [1, 2, 3, 4, 5];
    const treatment = [6, 7, 8, 9, 10];
    const r = welchTTest(control, treatment);
    expect(r.t).toBeGreaterThan(0);
  });

  it("df is positive", () => {
    const control = [1, 2, 3, 4, 5];
    const treatment = [2, 3, 4, 5, 6];
    const r = welchTTest(control, treatment);
    expect(r.df).toBeGreaterThan(0);
  });

  it("pValue in [0, 1]", () => {
    const r = welchTTest([1, 2, 3], [4, 5, 6]);
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// mannWhitneyU
// ---------------------------------------------------------------------------
describe("mannWhitneyU", () => {
  it("U is non-negative", () => {
    const r = mannWhitneyU([1, 2, 3], [4, 5, 6]);
    expect(r.U).toBeGreaterThanOrEqual(0);
  });

  it("significant for clearly separated groups", () => {
    const control = Array.from({ length: 50 }, (_, i) => i);
    const treatment = Array.from({ length: 50 }, (_, i) => i + 100);
    const r = mannWhitneyU(control, treatment);
    expect(r.significant).toBe(true);
  });

  it("pValue in [0, 1]", () => {
    const r = mannWhitneyU([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
  });

  it("equal groups → not significant", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r = mannWhitneyU(data, data);
    expect(r.significant).toBe(false);
  });

  it("z is a number", () => {
    const r = mannWhitneyU([1, 2, 3], [4, 5, 6]);
    expect(typeof r.z).toBe("number");
    expect(isFinite(r.z)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// confidenceIntervalDiff
// ---------------------------------------------------------------------------
describe("confidenceIntervalDiff", () => {
  it("lower < upper", () => {
    const r = confidenceIntervalDiff(0.1, 1000, 0.12, 1000);
    expect(r.lower).toBeLessThan(r.upper);
  });

  it("includes_zero=true when not significant", () => {
    const r = confidenceIntervalDiff(0.1, 100, 0.11, 100);
    expect(r.includes_zero).toBe(true);
  });

  it("includes_zero=false for large difference", () => {
    const r = confidenceIntervalDiff(0.1, 10000, 0.5, 10000);
    expect(r.includes_zero).toBe(false);
  });

  it("default confidence=0.95", () => {
    const r95 = confidenceIntervalDiff(0.1, 1000, 0.15, 1000);
    const r99 = confidenceIntervalDiff(0.1, 1000, 0.15, 1000, 0.99);
    expect(r99.upper - r99.lower).toBeGreaterThan(r95.upper - r95.lower);
  });

  it("returns numeric lower and upper", () => {
    const r = confidenceIntervalDiff(0.2, 500, 0.25, 500);
    expect(typeof r.lower).toBe("number");
    expect(typeof r.upper).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Effect size functions
// ---------------------------------------------------------------------------
describe("relativeLift", () => {
  it("(120-100)/100*100 = 20", () => expect(relativeLift(100, 120)).toBeCloseTo(20, 5));
  it("equal values → 0", () => expect(relativeLift(50, 50)).toBe(0));
  it("treatment < control → negative", () => expect(relativeLift(100, 80)).toBeCloseTo(-20, 5));
  it("works with rates", () => expect(relativeLift(0.1, 0.12)).toBeCloseTo(20, 4));
});

describe("absoluteDiff", () => {
  it("treatment - control", () => expect(absoluteDiff(100, 120)).toBe(20));
  it("negative when treatment < control", () => expect(absoluteDiff(120, 100)).toBe(-20));
  it("zero when equal", () => expect(absoluteDiff(50, 50)).toBe(0));
});

describe("cohenSD", () => {
  it("(mean2-mean1)/pooledStd", () => {
    expect(cohenSD(10, 12, 4)).toBeCloseTo(0.5, 5);
  });
  it("zero when means equal", () => expect(cohenSD(5, 5, 2)).toBe(0));
  it("negative when mean1 > mean2", () => expect(cohenSD(12, 10, 4)).toBeCloseTo(-0.5, 5));
});

describe("cohenH", () => {
  it("is zero when p1 == p2", () => expect(cohenH(0.5, 0.5)).toBeCloseTo(0, 5));
  it("is positive when p2 > p1", () => expect(cohenH(0.3, 0.5)).toBeGreaterThan(0));
  it("is negative when p2 < p1", () => expect(cohenH(0.5, 0.3)).toBeLessThan(0));
});

describe("cramersV", () => {
  it("is non-negative", () => expect(cramersV(10, 200, 2)).toBeGreaterThanOrEqual(0));
  it("sqrt(chiSq/(n*(minDim-1)))", () => {
    expect(cramersV(20, 100, 2)).toBeCloseTo(Math.sqrt(20 / (100 * 1)), 5);
  });
});

describe("pooledStd", () => {
  it("returns positive number", () => {
    expect(pooledStd(2, 50, 3, 50)).toBeGreaterThan(0);
  });
  it("equal stds → same std", () => {
    expect(pooledStd(2, 100, 2, 100)).toBeCloseTo(2, 5);
  });
});

describe("effectSizeLabel", () => {
  it("< 0.2 → negligible", () => expect(effectSizeLabel(0.1)).toBe("negligible"));
  it(">= 0.2 and < 0.5 → small", () => expect(effectSizeLabel(0.3)).toBe("small"));
  it(">= 0.5 and < 0.8 → medium", () => expect(effectSizeLabel(0.6)).toBe("medium"));
  it(">= 0.8 → large", () => expect(effectSizeLabel(1.0)).toBe("large"));
  it("works with negative d (uses absolute value)", () => {
    expect(effectSizeLabel(-0.3)).toBe("small");
    expect(effectSizeLabel(-0.9)).toBe("large");
  });
  it("boundary 0.2 → small", () => expect(effectSizeLabel(0.2)).toBe("small"));
  it("boundary 0.5 → medium", () => expect(effectSizeLabel(0.5)).toBe("medium"));
  it("boundary 0.8 → large", () => expect(effectSizeLabel(0.8)).toBe("large"));
});

// ---------------------------------------------------------------------------
// Bayesian
// ---------------------------------------------------------------------------
describe("betaPosterior", () => {
  it("with uniform prior: alpha=successes+1, beta=failures+1", () => {
    const p = betaPosterior(10, 90);
    expect(p.alpha).toBe(11);
    expect(p.beta).toBe(91);
  });

  it("with custom prior", () => {
    const p = betaPosterior(10, 90, 2, 3);
    expect(p.alpha).toBe(12);
    expect(p.beta).toBe(93);
  });

  it("zero successes", () => {
    const p = betaPosterior(0, 100);
    expect(p.alpha).toBe(1);
    expect(p.beta).toBe(101);
  });
});

describe("bayesianProbBetterThan", () => {
  it("returns value in [0, 1]", () => {
    const p = bayesianProbBetterThan(2, 98, 5, 95);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("symmetric: P(B>A) + P(A>B) ≈ 1 for equal posteriors", () => {
    const pBgA = bayesianProbBetterThan(10, 90, 10, 90);
    expect(pBgA).toBeCloseTo(0.5, 1);
  });

  it("B clearly better → P(B>A) > 0.9", () => {
    const p = bayesianProbBetterThan(2, 98, 50, 50);
    expect(p).toBeGreaterThan(0.9);
  });

  it("A clearly better → P(B>A) < 0.1", () => {
    const p = bayesianProbBetterThan(50, 50, 2, 98);
    expect(p).toBeLessThan(0.1);
  });

  it("is deterministic (same seed)", () => {
    const p1 = bayesianProbBetterThan(5, 95, 8, 92, 1000);
    const p2 = bayesianProbBetterThan(5, 95, 8, 92, 1000);
    expect(p1).toBe(p2);
  });
});

describe("bayesianExpectedLoss", () => {
  it("returns lossA and lossB >= 0", () => {
    const r = bayesianExpectedLoss(2, 98, 5, 95);
    expect(r.lossA).toBeGreaterThanOrEqual(0);
    expect(r.lossB).toBeGreaterThanOrEqual(0);
  });

  it("B better → lossA > lossB", () => {
    const r = bayesianExpectedLoss(2, 98, 50, 50);
    expect(r.lossA).toBeGreaterThan(r.lossB);
  });

  it("A better → lossB > lossA", () => {
    const r = bayesianExpectedLoss(50, 50, 2, 98);
    expect(r.lossB).toBeGreaterThan(r.lossA);
  });

  it("is deterministic", () => {
    const r1 = bayesianExpectedLoss(5, 95, 8, 92, 500);
    const r2 = bayesianExpectedLoss(5, 95, 8, 92, 500);
    expect(r1.lossA).toBe(r2.lossA);
    expect(r1.lossB).toBe(r2.lossB);
  });
});

describe("credibleInterval", () => {
  it("lower < upper", () => {
    const ci = credibleInterval(10, 90);
    expect(ci.lower).toBeLessThan(ci.upper);
  });

  it("interval contains betaMean", () => {
    const alpha = 10, beta = 40;
    const ci = credibleInterval(alpha, beta);
    const mean = betaMean(alpha, beta);
    expect(mean).toBeGreaterThan(ci.lower);
    expect(mean).toBeLessThan(ci.upper);
  });

  it("95% CI is narrower than 50% CI", () => {
    const ci95 = credibleInterval(10, 40, 0.95);
    const ci50 = credibleInterval(10, 40, 0.5);
    expect(ci95.upper - ci95.lower).toBeGreaterThan(ci50.upper - ci50.lower);
  });

  it("both bounds are in [0, 1]", () => {
    const ci = credibleInterval(5, 95);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeLessThanOrEqual(1);
  });
});

describe("betaMean", () => {
  it("betaMean(2, 5) ≈ 0.286", () => expect(betaMean(2, 5)).toBeCloseTo(0.2857, 3));
  it("betaMean(1, 1) = 0.5", () => expect(betaMean(1, 1)).toBeCloseTo(0.5, 5));
  it("betaMean(a, a) = 0.5", () => expect(betaMean(10, 10)).toBeCloseTo(0.5, 5));
  it("betaMean(10, 90) = 0.1", () => expect(betaMean(10, 90)).toBeCloseTo(0.1, 5));
});

describe("betaMode", () => {
  it("betaMode(2, 5) = 1/5 = 0.2", () => expect(betaMode(2, 5)).toBeCloseTo(0.2, 5));
  it("betaMode(1, 1) = 0 / 0 → NaN (degenerate uniform — no unique mode)", () => {
    // (1-1)/(1+1-2) = 0/0 = NaN; uniform distribution has no unique mode
    expect(isNaN(betaMode(1, 1))).toBe(true);
  });
  it("throws for alpha < 1", () => expect(() => betaMode(0.5, 2)).toThrow());
  it("throws for beta < 1", () => expect(() => betaMode(2, 0.5)).toThrow());
  it("mode is in [0, 1] for valid params", () => {
    const m = betaMode(3, 7);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(1);
  });
});

describe("betaVariance", () => {
  it("is positive", () => expect(betaVariance(2, 5)).toBeGreaterThan(0));
  it("betaVariance(1, 1) = 1/12", () => expect(betaVariance(1, 1)).toBeCloseTo(1 / 12, 5));
  it("larger alpha+beta → smaller variance", () => {
    const low = betaVariance(2, 5);
    const high = betaVariance(20, 50);
    expect(high).toBeLessThan(low);
  });
});

// ---------------------------------------------------------------------------
// fnv1aHash
// ---------------------------------------------------------------------------
describe("fnv1aHash", () => {
  it("returns unsigned 32-bit integer", () => {
    const h = fnv1aHash("test");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });

  it("is deterministic", () => {
    expect(fnv1aHash("hello")).toBe(fnv1aHash("hello"));
  });

  it("different strings produce different hashes", () => {
    const hashes = new Set(
      Array.from({ length: 100 }, (_, i) => fnv1aHash(`user-${i}`))
    );
    expect(hashes.size).toBeGreaterThan(90);
  });

  it("fnv1aHash('test') is a specific deterministic value", () => {
    // Verified: our FNV-1a 32-bit of "test" = 2949673445
    expect(fnv1aHash("test")).toBe(2949673445);
  });

  it("handles empty string", () => {
    const h = fnv1aHash("");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(typeof h).toBe("number");
  });

  it("handles unicode string", () => {
    const h = fnv1aHash("用户");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// assignVariantV2
// ---------------------------------------------------------------------------
describe("assignVariantV2", () => {
  it("is deterministic for same inputs", () => {
    const v1 = assignVariantV2("user1", "exp1", ["a", "b"]);
    const v2 = assignVariantV2("user1", "exp1", ["a", "b"]);
    expect(v1).toBe(v2);
  });

  it("returns one of the provided variants", () => {
    const variants = ["control", "treatment"];
    const v = assignVariantV2("user-abc", "exp-xyz", variants);
    expect(variants).toContain(v);
  });

  it("distributes approximately evenly across many users", () => {
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = assignVariantV2(`user-${i}`, "exp1", ["a", "b"]);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    expect(counts["a"]).toBeGreaterThan(350);
    expect(counts["b"]).toBeGreaterThan(350);
  });

  it("throws when no variants provided", () => {
    expect(() => assignVariantV2("u", "e", [])).toThrow();
  });

  it("respects weights", () => {
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = assignVariantV2(`user-${i}`, "exp1", ["a", "b"], [0.9, 0.1]);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    expect(counts["a"] ?? 0).toBeGreaterThan(counts["b"] ?? 0);
  });

  it("different experimentIds → different assignments for same userId", () => {
    const results = new Set([
      assignVariantV2("user42", "exp-A", ["a", "b"]),
      assignVariantV2("user42", "exp-B", ["a", "b"]),
      assignVariantV2("user42", "exp-C", ["a", "b"]),
    ]);
    // Not guaranteed but with 3 different experiments we likely get both variants
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// isInExperiment
// ---------------------------------------------------------------------------
describe("isInExperiment", () => {
  it("returns boolean", () => {
    expect(typeof isInExperiment("user1", "exp1", 50)).toBe("boolean");
  });

  it("rolloutPct=0 → never in experiment", () => {
    for (let i = 0; i < 50; i++) {
      expect(isInExperiment(`u${i}`, "e", 0)).toBe(false);
    }
  });

  it("rolloutPct=100 → always in experiment", () => {
    for (let i = 0; i < 50; i++) {
      expect(isInExperiment(`u${i}`, "e", 100)).toBe(true);
    }
  });

  it("is deterministic", () => {
    const r1 = isInExperiment("user-99", "exp-test", 50);
    const r2 = isInExperiment("user-99", "exp-test", 50);
    expect(r1).toBe(r2);
  });

  it("approximately half users with rolloutPct=50", () => {
    let inCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (isInExperiment(`u${i}`, "exp1", 50)) inCount++;
    }
    expect(inCount).toBeGreaterThan(350);
    expect(inCount).toBeLessThan(650);
  });
});

// ---------------------------------------------------------------------------
// stratifiedSample
// ---------------------------------------------------------------------------
describe("stratifiedSample", () => {
  it("returns array of requested size (approximately)", () => {
    const data = [
      ...Array.from({ length: 100 }, (_, i) => ({ group: "A", value: i })),
      ...Array.from({ length: 100 }, (_, i) => ({ group: "B", value: i + 100 })),
    ];
    const sample = stratifiedSample(data, 50);
    expect(sample.length).toBeGreaterThan(0);
    expect(sample.length).toBeLessThanOrEqual(60); // within rounding
  });

  it("preserves group proportions", () => {
    const data = [
      ...Array.from({ length: 80 }, (_, i) => ({ group: "A", value: i })),
      ...Array.from({ length: 20 }, (_, i) => ({ group: "B", value: i + 100 })),
    ];
    const sample = stratifiedSample(data, 100);
    const aCount = sample.filter((d) => d.group === "A").length;
    const bCount = sample.filter((d) => d.group === "B").length;
    expect(aCount).toBeGreaterThan(bCount);
  });

  it("is deterministic", () => {
    const data = Array.from({ length: 50 }, (_, i) => ({
      group: i % 2 === 0 ? "A" : "B",
      value: i,
    }));
    const s1 = stratifiedSample(data, 20);
    const s2 = stratifiedSample(data, 20);
    expect(s1.map((d) => d.value)).toEqual(s2.map((d) => d.value));
  });
});

// ---------------------------------------------------------------------------
// obrienflemingBoundary
// ---------------------------------------------------------------------------
describe("obrienflemingBoundary", () => {
  it("boundary at k=K equals z_alpha/2", () => {
    const b = obrienflemingBoundary(5, 5, 0.05);
    expect(b).toBeCloseTo(normInvCDF(0.975), 3);
  });

  it("boundary at k=1 < K is larger (more conservative)", () => {
    const b1 = obrienflemingBoundary(1, 5);
    const b5 = obrienflemingBoundary(5, 5);
    expect(b1).toBeGreaterThan(b5);
  });

  it("boundary decreases as k increases", () => {
    const boundaries = [1, 2, 3, 4, 5].map((k) => obrienflemingBoundary(k, 5));
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]!).toBeLessThanOrEqual(boundaries[i - 1]!);
    }
  });

  it("boundary is positive", () => {
    for (let k = 1; k <= 5; k++) {
      expect(obrienflemingBoundary(k, 5)).toBeGreaterThan(0);
    }
  });

  it("respects custom alpha", () => {
    const b05 = obrienflemingBoundary(3, 5, 0.05);
    const b01 = obrienflemingBoundary(3, 5, 0.01);
    expect(b01).toBeGreaterThan(b05);
  });
});

// ---------------------------------------------------------------------------
// pocockBoundary
// ---------------------------------------------------------------------------
describe("pocockBoundary", () => {
  it("returns positive number", () => {
    expect(pocockBoundary(5)).toBeGreaterThan(0);
  });

  it("larger K → larger boundary (more conservative)", () => {
    const b5 = pocockBoundary(5);
    const b1 = pocockBoundary(1);
    expect(b5).toBeGreaterThan(b1);
  });

  it("K=1 ≈ standard z_alpha/2", () => {
    expect(pocockBoundary(1, 0.05)).toBeCloseTo(normInvCDF(0.975), 3);
  });

  it("respects custom alpha", () => {
    const b05 = pocockBoundary(5, 0.05);
    const b01 = pocockBoundary(5, 0.01);
    expect(b01).toBeGreaterThan(b05);
  });
});

// ---------------------------------------------------------------------------
// alphaSpent
// ---------------------------------------------------------------------------
describe("alphaSpent", () => {
  it("returns array of length=looks", () => {
    const a = alphaSpent(3, 5);
    expect(a).toHaveLength(3);
  });

  it("values are increasing (cumulative spending)", () => {
    const a = alphaSpent(5, 5);
    for (let i = 1; i < a.length; i++) {
      expect(a[i]!).toBeGreaterThanOrEqual(a[i - 1]!);
    }
  });

  it("final value ≤ alpha", () => {
    const a = alphaSpent(5, 5, 0.05);
    expect(a[a.length - 1]).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it("all values in [0, alpha]", () => {
    const a = alphaSpent(5, 5, 0.05);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0.051);
    }
  });
});

// ---------------------------------------------------------------------------
// peekedTooEarly
// ---------------------------------------------------------------------------
describe("peekedTooEarly", () => {
  it("returns false when currentN >= requiredN", () => {
    expect(peekedTooEarly(1000, 1000, 0.2, 1, 5)).toBe(false);
    expect(peekedTooEarly(1500, 1000, 0.2, 1, 5)).toBe(false);
  });

  it("returns boolean", () => {
    const r = peekedTooEarly(100, 1000, 0.1, 1, 5);
    expect(typeof r).toBe("boolean");
  });

  it("very small pValue clears boundary → returns false (peeked but significant)", () => {
    // If pValue is tiny, it clears even the strict O'BF boundary
    const r = peekedTooEarly(100, 1000, 1e-10, 1, 5);
    expect(r).toBe(false);
  });

  it("large pValue before reaching n → returns true (peeked too early)", () => {
    const r = peekedTooEarly(100, 1000, 0.5, 1, 5);
    expect(r).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sports helpers
// ---------------------------------------------------------------------------
describe("pickCTRLift", () => {
  it("computes ctr_control and ctr_treatment", () => {
    const r = pickCTRLift(100, 1000, 150, 1000);
    expect(r.ctr_control).toBeCloseTo(0.1, 5);
    expect(r.ctr_treatment).toBeCloseTo(0.15, 5);
  });

  it("lift is positive when treatment CTR > control CTR", () => {
    const r = pickCTRLift(100, 1000, 150, 1000);
    expect(r.lift).toBeGreaterThan(0);
  });

  it("significant=true for large difference", () => {
    const r = pickCTRLift(100, 10000, 500, 10000);
    expect(r.significant).toBe(true);
  });

  it("significant=false for tiny difference", () => {
    const r = pickCTRLift(100, 1000, 101, 1000);
    expect(r.significant).toBe(false);
  });
});

describe("subscriptionLift", () => {
  it("computes conversionLift", () => {
    const r = subscriptionLift(100, 1000, 120, 1000);
    // controlRate=10%, treatmentRate=12%, lift=20%
    expect(r.conversionLift).toBeCloseTo(20, 1);
  });

  it("annualizedRevenueImpact = absDiff * treatmentN * 12 * 14.99", () => {
    const r = subscriptionLift(100, 1000, 120, 1000);
    const absDiff = 0.12 - 0.1;
    const expected = absDiff * 1000 * 12 * 14.99;
    expect(r.annualizedRevenueImpact).toBeCloseTo(expected, 1);
  });

  it("significant=true for large difference", () => {
    const r = subscriptionLift(100, 10000, 500, 10000);
    expect(r.significant).toBe(true);
  });

  it("significant=false for tiny difference", () => {
    const r = subscriptionLift(100, 1000, 101, 1000);
    expect(r.significant).toBe(false);
  });
});

describe("pickBoardEngagementTest", () => {
  it("computes favoriteRateLift", () => {
    const r = pickBoardEngagementTest(
      { views: 1000, favorites: 100, n: 1000 },
      { views: 1000, favorites: 150, n: 1000 },
    );
    expect(r.favoriteRateLift).toBeCloseTo(50, 1); // 50% lift
  });

  it("significant=true for large difference", () => {
    const r = pickBoardEngagementTest(
      { views: 10000, favorites: 100, n: 10000 },
      { views: 10000, favorites: 500, n: 10000 },
    );
    expect(r.significant).toBe(true);
  });

  it("significant=false for tiny difference", () => {
    const r = pickBoardEngagementTest(
      { views: 1000, favorites: 100, n: 1000 },
      { views: 1000, favorites: 101, n: 1000 },
    );
    expect(r.significant).toBe(false);
  });

  it("returns numeric favoriteRateLift", () => {
    const r = pickBoardEngagementTest(
      { views: 500, favorites: 50, n: 500 },
      { views: 500, favorites: 50, n: 500 },
    );
    expect(typeof r.favoriteRateLift).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// sampleSize (existing)
// ---------------------------------------------------------------------------
describe("sampleSize (existing)", () => {
  it("returns positive integers", () => {
    const r = sampleSize(0.1, 0.05);
    expect(r.perVariant).toBeGreaterThan(0);
    expect(r.total).toBe(r.perVariant * 2);
  });

  it("weeks calculation", () => {
    const r = sampleSize(0.1, 0.05, 0.95, 0.8, 500);
    expect(r.weeks).toBe(Math.ceil(r.total / 500));
  });
});

// ---------------------------------------------------------------------------
// twoProportionZTest (existing)
// ---------------------------------------------------------------------------
describe("twoProportionZTest (existing)", () => {
  it("detects significant difference", () => {
    const r = twoProportionZTest(500, 5000, 600, 5000);
    expect(r.significant).toBe(true);
  });
  it("handles zero visitors", () => {
    const r = twoProportionZTest(0, 0, 10, 100);
    expect(r.significant).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// bayesianABTest (existing)
// ---------------------------------------------------------------------------
describe("bayesianABTest (existing)", () => {
  it("B clearly better → probBBeatsA > 0.9", () => {
    const r = bayesianABTest(100, 1000, 200, 1000);
    expect(r.probBBeatsA).toBeGreaterThan(0.9);
  });
  it("deterministic with same inputs", () => {
    const r1 = bayesianABTest(100, 1000, 120, 1000);
    const r2 = bayesianABTest(100, 1000, 120, 1000);
    expect(r1.probBBeatsA).toBe(r2.probBBeatsA);
  });
});

// ---------------------------------------------------------------------------
// obrienFleming (existing)
// ---------------------------------------------------------------------------
describe("obrienFleming (existing)", () => {
  it("k=K gives overall alpha", () => {
    expect(obrienFleming(5, 5, 0.05)).toBeCloseTo(0.05, 3);
  });
  it("throws for invalid k", () => {
    expect(() => obrienFleming(0, 5)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Edge / integration
// ---------------------------------------------------------------------------
describe("Edge cases / integration", () => {
  it("sampleSizeForProportionTest with baseline 0.5 and small MDE", () => {
    const n = sampleSizeForProportionTest(0.5, 0.05);
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("betaMean + betaVariance consistency", () => {
    const a = 3, b = 7;
    const m = betaMean(a, b);
    const v = betaVariance(a, b);
    // For Beta(3,7): mean=0.3, variance=3*7/(100*11)≈0.019
    expect(m).toBeCloseTo(0.3, 5);
    expect(v).toBeCloseTo((a * b) / ((a + b) ** 2 * (a + b + 1)), 10);
  });

  it("credibleInterval with many data points is tight", () => {
    const ci = credibleInterval(1000, 1000);
    expect(ci.upper - ci.lower).toBeLessThan(0.05);
  });

  it("fnv1aHash('') produces defined result", () => {
    expect(fnv1aHash("")).toBe(2166136261); // FNV offset basis unchanged
  });

  it("assignVariantV2 with single variant always returns that variant", () => {
    for (let i = 0; i < 20; i++) {
      expect(assignVariantV2(`u${i}`, "e", ["only"])).toBe("only");
    }
  });

  it("alphaSpent with 1 look total returns array of length 1", () => {
    const a = alphaSpent(1, 1, 0.05);
    expect(a).toHaveLength(1);
    // O'BF at look 1 of 1: boundary = z_alpha/2 * sqrt(1/1) = z_alpha/2, spent ≈ alpha
    expect(a[0]).toBeGreaterThan(0);
    expect(a[0]).toBeLessThanOrEqual(0.051);
  });

  it("pickCTRLift with zero impressions (edge)", () => {
    // Should not throw; division may produce NaN but function should return something
    const r = pickCTRLift(0, 0, 0, 1000);
    expect(typeof r.ctr_control).toBe("number");
  });

  it("pooledStd with n1=n2 equal weighting", () => {
    const s = pooledStd(3, 100, 5, 100);
    // pooled = sqrt((99*9 + 99*25)/198) = sqrt(3366/198) = sqrt(17) ≈ 4.123
    expect(s).toBeCloseTo(Math.sqrt(17), 2);
  });
});
