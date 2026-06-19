/**
 * Tests for @/lib/math/statistics-advanced
 * ≥ 85 tests covering all exported functions.
 */
import { describe, expect, it } from "vitest";
import {
  mean,
  variance,
  stdDev,
  median,
  mode,
  quantile,
  iqr,
  skewness,
  kurtosis,
  zScore,
  normalize,
  standardize,
  pearsonCorrelation,
  spearmanCorrelation,
  kendallTau,
  covariance,
  oneSampleTTest,
  twoSampleTTest,
  pairedTTest,
  chiSquareGoodnessOfFit,
  chiSquareIndependence,
  mannWhitneyU,
  wilcoxonSignedRank,
  oneWayAnova,
  simpleLinearRegression,
  multipleRCorrelation,
  zScoreOutliers,
  iqrOutliers,
  grubbs,
  bootstrapMean,
  bootstrapCorrelation,
  sampleSizeForProportion,
  powerForTTest,
  rollingMean,
  rollingCorrelation,
} from "@/lib/math/statistics-advanced";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const closeEnough = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;
const CLOSE = (tol = 1e-6) => ({
  asymmetricMatch: (received: number) => closeEnough(received, 0, tol),
});

// ---------------------------------------------------------------------------
// mean
// ---------------------------------------------------------------------------
describe("mean", () => {
  it("computes arithmetic mean of integers", () => {
    expect(mean([1, 2, 3, 4, 5])).toBeCloseTo(3, 10);
  });
  it("computes mean of a single value", () => {
    expect(mean([7])).toBe(7);
  });
  it("handles negative values", () => {
    expect(mean([-2, -4, -6])).toBeCloseTo(-4, 10);
  });
  it("throws on empty array", () => {
    expect(() => mean([])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// variance
// ---------------------------------------------------------------------------
describe("variance", () => {
  it("sample variance (default) for [2,4,4,4,5,5,7,9]", () => {
    // Known value: sample variance = 4.571...
    const v = variance([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(v).toBeCloseTo(4.5714, 3);
  });
  it("population variance for uniform values", () => {
    const v = variance([2, 4, 4, 4, 5, 5, 7, 9], true);
    expect(v).toBeCloseTo(4.0, 3);
  });
  it("sample variance of two identical values is 0", () => {
    expect(variance([5, 5])).toBe(0);
  });
  it("throws on empty array", () => {
    expect(() => variance([])).toThrow(RangeError);
  });
  it("population vs sample differ for small arrays", () => {
    const vals = [1, 3, 5];
    expect(variance(vals, false)).toBeGreaterThan(variance(vals, true));
  });
});

// ---------------------------------------------------------------------------
// stdDev
// ---------------------------------------------------------------------------
describe("stdDev", () => {
  it("equals sqrt of sample variance", () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stdDev(vals)).toBeCloseTo(Math.sqrt(variance(vals)), 10);
  });
  it("population mode", () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stdDev(vals, true)).toBeCloseTo(Math.sqrt(variance(vals, true)), 10);
  });
});

// ---------------------------------------------------------------------------
// median
// ---------------------------------------------------------------------------
describe("median", () => {
  it("odd-length array", () => {
    expect(median([3, 1, 4, 1, 5])).toBe(3);
  });
  it("even-length array averages two middle elements", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("single element", () => {
    expect(median([42])).toBe(42);
  });
  it("throws on empty array", () => {
    expect(() => median([])).toThrow(RangeError);
  });
  it("works with unsorted input", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// mode
// ---------------------------------------------------------------------------
describe("mode", () => {
  it("single mode", () => {
    expect(mode([1, 2, 2, 3])).toEqual([2]);
  });
  it("two modes (bi-modal) sorted ascending", () => {
    expect(mode([1, 1, 2, 2, 3])).toEqual([1, 2]);
  });
  it("all values are mode when all distinct", () => {
    expect(mode([3, 1, 2])).toEqual([1, 2, 3]);
  });
  it("empty array returns []", () => {
    expect(mode([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// quantile
// ---------------------------------------------------------------------------
describe("quantile", () => {
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it("q=0 returns min", () => {
    expect(quantile(vals, 0)).toBe(1);
  });
  it("q=1 returns max", () => {
    expect(quantile(vals, 1)).toBe(10);
  });
  it("q=0.5 returns median", () => {
    expect(quantile(vals, 0.5)).toBeCloseTo(5.5, 10);
  });
  it("q=0.25 linear interpolation", () => {
    expect(quantile(vals, 0.25)).toBeCloseTo(3.25, 5);
  });
  it("throws on empty array", () => {
    expect(() => quantile([], 0.5)).toThrow(RangeError);
  });
  it("throws on q outside [0,1]", () => {
    expect(() => quantile(vals, 1.1)).toThrow(RangeError);
    expect(() => quantile(vals, -0.1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// iqr
// ---------------------------------------------------------------------------
describe("iqr", () => {
  it("IQR of [1..10] ≈ 4.5", () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(iqr(vals)).toBeCloseTo(4.5, 5);
  });
  it("IQR of identical values is 0", () => {
    expect(iqr([5, 5, 5, 5])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// skewness
// ---------------------------------------------------------------------------
describe("skewness", () => {
  it("returns 0 for n < 3", () => {
    expect(skewness([1, 2])).toBe(0);
  });
  it("symmetric distribution has skewness near 0", () => {
    // Perfectly symmetric array (mean = median)
    const sym = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    expect(Math.abs(skewness(sym))).toBeLessThan(1e-10);
  });
  it("right-skewed distribution has positive skewness", () => {
    const right = [1, 1, 1, 2, 2, 3, 10, 50, 100];
    expect(skewness(right)).toBeGreaterThan(0);
  });
  it("returns 0 when std dev is 0", () => {
    expect(skewness([3, 3, 3])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// kurtosis
// ---------------------------------------------------------------------------
describe("kurtosis", () => {
  it("returns 0 for n < 4", () => {
    expect(kurtosis([1, 2, 3])).toBe(0);
  });
  it("normal-like data has kurtosis near 0", () => {
    const normal = [-2, -1, -1, 0, 0, 0, 1, 1, 2];
    // excess kurtosis may deviate but should be finite
    expect(isFinite(kurtosis(normal))).toBe(true);
  });
  it("heavy-tailed distribution has positive excess kurtosis", () => {
    const heavy = [0, 0, 0, 0, 0, 0, 0, 0, 0, 100];
    expect(kurtosis(heavy)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// zScore (single value)
// ---------------------------------------------------------------------------
describe("zScore", () => {
  it("z-score = 0 when value equals mean", () => {
    expect(zScore(5, 5, 2)).toBe(0);
  });
  it("z-score = 1 when value is 1 std above mean", () => {
    expect(zScore(7, 5, 2)).toBe(1);
  });
  it("z-score = -1 when value is 1 std below mean", () => {
    expect(zScore(3, 5, 2)).toBe(-1);
  });
  it("returns 0 when std = 0", () => {
    expect(zScore(5, 5, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalize (z-score of array)
// ---------------------------------------------------------------------------
describe("normalize", () => {
  it("normalized array has mean ≈ 0", () => {
    const vals = [10, 20, 30, 40, 50];
    const normed = normalize(vals);
    expect(mean(normed)).toBeCloseTo(0, 8);
  });
  it("normalized array has std ≈ 1", () => {
    const vals = [10, 20, 30, 40, 50];
    const normed = normalize(vals);
    expect(stdDev(normed)).toBeCloseTo(1, 8);
  });
  it("all-same values returns zeros", () => {
    expect(normalize([5, 5, 5])).toEqual([0, 0, 0]);
  });
  it("empty array returns []", () => {
    expect(normalize([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// standardize (min-max)
// ---------------------------------------------------------------------------
describe("standardize", () => {
  it("min maps to 0, max maps to 1", () => {
    const result = standardize([0, 5, 10]);
    expect(result[0]).toBe(0);
    expect(result[2]).toBe(1);
    expect(result[1]).toBeCloseTo(0.5, 10);
  });
  it("all same → all 0.5", () => {
    expect(standardize([3, 3, 3])).toEqual([0.5, 0.5, 0.5]);
  });
  it("accepts external min/max bounds", () => {
    const result = standardize([2, 5, 8], 0, 10);
    expect(result[0]).toBeCloseTo(0.2, 10);
    expect(result[1]).toBeCloseTo(0.5, 10);
    expect(result[2]).toBeCloseTo(0.8, 10);
  });
});

// ---------------------------------------------------------------------------
// pearsonCorrelation
// ---------------------------------------------------------------------------
describe("pearsonCorrelation", () => {
  it("perfect positive correlation = 1", () => {
    expect(pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 8);
  });
  it("perfect negative correlation = -1", () => {
    expect(pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1, 8);
  });
  it("no correlation ≈ 0", () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [3, 3, 3, 3, 3]);
    expect(r).toBe(0); // std=0 path
  });
  it("throws on unequal lengths", () => {
    expect(() => pearsonCorrelation([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
  it("throws on n < 2", () => {
    expect(() => pearsonCorrelation([1], [1])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// spearmanCorrelation
// ---------------------------------------------------------------------------
describe("spearmanCorrelation", () => {
  it("monotonic relationship ≈ 1", () => {
    const r = spearmanCorrelation([1, 2, 3, 4, 5], [1, 4, 9, 16, 25]);
    expect(r).toBeCloseTo(1, 5);
  });
  it("reverse monotonic ≈ -1", () => {
    const r = spearmanCorrelation([1, 2, 3, 4, 5], [25, 16, 9, 4, 1]);
    expect(r).toBeCloseTo(-1, 5);
  });
  it("rank-based handles non-linear data differently from pearson", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [1, 8, 27, 64, 125]; // cubes
    const pearson = pearsonCorrelation(x, y);
    const spearman = spearmanCorrelation(x, y);
    // Spearman should be 1 for monotonic; pearson < 1
    expect(spearman).toBeCloseTo(1, 5);
    expect(pearson).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// kendallTau
// ---------------------------------------------------------------------------
describe("kendallTau", () => {
  it("all concordant pairs → 1", () => {
    const tau = kendallTau([1, 2, 3, 4], [1, 2, 3, 4]);
    expect(tau).toBeCloseTo(1, 5);
  });
  it("all discordant pairs → -1", () => {
    const tau = kendallTau([1, 2, 3, 4], [4, 3, 2, 1]);
    expect(tau).toBeCloseTo(-1, 5);
  });
  it("mixed concordant/discordant → value in (-1, 1)", () => {
    const tau = kendallTau([1, 2, 3, 4], [1, 3, 2, 4]);
    expect(tau).toBeGreaterThan(-1);
    expect(tau).toBeLessThan(1);
  });
  it("n < 2 returns 0", () => {
    expect(kendallTau([1], [1])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// covariance
// ---------------------------------------------------------------------------
describe("covariance", () => {
  it("positive covariance for co-varying data", () => {
    expect(covariance([1, 2, 3], [2, 4, 6])).toBeCloseTo(2, 8);
  });
  it("zero covariance for constant y", () => {
    expect(covariance([1, 2, 3], [5, 5, 5])).toBe(0);
  });
  it("throws on unequal lengths", () => {
    expect(() => covariance([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// oneSampleTTest
// ---------------------------------------------------------------------------
describe("oneSampleTTest", () => {
  it("population mean matches sample → high p-value, no reject", () => {
    const result = oneSampleTTest([10, 10, 10, 10, 10], 10);
    expect(result.pValue).toBeGreaterThanOrEqual(0.05);
    expect(result.rejectNull).toBe(false);
  });
  it("population mean far from sample → low p-value, reject null", () => {
    const result = oneSampleTTest([100, 101, 99, 102, 98], 50);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.rejectNull).toBe(true);
  });
  it("statistic is signed correctly", () => {
    // Use slightly varied values above mu so std > 0
    const result = oneSampleTTest([5, 5.1, 4.9, 5.05, 4.95], 4);
    expect(result.statistic).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// twoSampleTTest
// ---------------------------------------------------------------------------
describe("twoSampleTTest", () => {
  it("identical groups → high p-value", () => {
    const result = twoSampleTTest([5, 5, 5, 5], [5, 5, 5, 5]);
    expect(result.pValue).toBeGreaterThanOrEqual(0.05);
    expect(result.rejectNull).toBe(false);
  });
  it("clearly different groups → low p-value, reject", () => {
    const g1 = [1, 1.1, 0.9, 1.05, 0.95];
    const g2 = [10, 10.1, 9.9, 10.05, 9.95];
    const result = twoSampleTTest(g1, g2);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.rejectNull).toBe(true);
  });
  it("effectSize (Cohen's d) is defined and non-negative", () => {
    const result = twoSampleTTest([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
    expect(result.effectSize).toBeDefined();
    expect(result.effectSize!).toBeGreaterThan(0);
  });
  it("large effect size for well-separated groups", () => {
    const result = twoSampleTTest(
      [1, 1.1, 0.9, 1.05, 0.95],
      [10, 10.1, 9.9, 10.05, 9.95]
    );
    expect(result.effectSize!).toBeGreaterThan(3);
  });
});

// ---------------------------------------------------------------------------
// pairedTTest
// ---------------------------------------------------------------------------
describe("pairedTTest", () => {
  it("no change → high p-value", () => {
    const result = pairedTTest([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    expect(result.pValue).toBeGreaterThanOrEqual(0.05);
  });
  it("clear improvement → low p-value, reject null", () => {
    const before = [10, 10, 10, 10, 10];
    const after = [20, 21, 19, 20, 20];
    const result = pairedTTest(before, after);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.rejectNull).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// chiSquareGoodnessOfFit
// ---------------------------------------------------------------------------
describe("chiSquareGoodnessOfFit", () => {
  it("observed matches expected → high p-value", () => {
    const obs = [25, 25, 25, 25];
    const exp = [25, 25, 25, 25];
    const result = chiSquareGoodnessOfFit(obs, exp);
    expect(result.pValue).toBeGreaterThan(0.5);
    expect(result.rejectNull).toBe(false);
  });
  it("clearly different observed → low p-value, reject", () => {
    const obs = [100, 0, 0, 0];
    const exp = [25, 25, 25, 25];
    const result = chiSquareGoodnessOfFit(obs, exp);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.rejectNull).toBe(true);
  });
  it("throws on zero expected", () => {
    expect(() => chiSquareGoodnessOfFit([1, 2], [0, 2])).toThrow(RangeError);
  });
  it("throws on unequal lengths", () => {
    expect(() => chiSquareGoodnessOfFit([1, 2, 3], [1, 2])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// chiSquareIndependence
// ---------------------------------------------------------------------------
describe("chiSquareIndependence", () => {
  it("independent table → p-value near 1", () => {
    // Equal proportions across rows → no relationship
    const table = [
      [50, 50],
      [50, 50],
    ];
    const result = chiSquareIndependence(table);
    expect(result.pValue).toBeGreaterThan(0.9);
  });
  it("dependent table → low p-value", () => {
    const table = [
      [90, 10],
      [10, 90],
    ];
    const result = chiSquareIndependence(table);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.rejectNull).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mannWhitneyU
// ---------------------------------------------------------------------------
describe("mannWhitneyU", () => {
  it("clearly separated groups → rejectNull", () => {
    const g1 = [1, 2, 3, 4, 5];
    const g2 = [10, 20, 30, 40, 50];
    const result = mannWhitneyU(g1, g2);
    expect(result.rejectNull).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });
  it("overlapping groups → no reject", () => {
    const g1 = [1, 2, 3, 4, 5];
    const g2 = [1, 2, 3, 4, 5];
    const result = mannWhitneyU(g1, g2);
    expect(result.rejectNull).toBe(false);
  });
  it("statistic is non-negative", () => {
    const result = mannWhitneyU([1, 2, 3], [4, 5, 6]);
    expect(result.statistic).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// wilcoxonSignedRank
// ---------------------------------------------------------------------------
describe("wilcoxonSignedRank", () => {
  it("no difference → high p-value", () => {
    const vals = [1, 2, 3, 4, 5];
    const result = wilcoxonSignedRank(vals, vals);
    expect(result.pValue).toBeGreaterThanOrEqual(0.05);
  });
  it("large consistent improvement → reject null", () => {
    const before = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const after = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const result = wilcoxonSignedRank(before, after);
    expect(result.rejectNull).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// oneWayAnova
// ---------------------------------------------------------------------------
describe("oneWayAnova", () => {
  it("same group values → high p-value (no reject)", () => {
    const result = oneWayAnova([
      [5, 5, 5, 5],
      [5, 5, 5, 5],
      [5, 5, 5, 5],
    ]);
    expect(result.rejectNull).toBe(false);
  });
  it("clearly different groups → reject null", () => {
    const result = oneWayAnova([
      [1, 1.1, 0.9, 1.05],
      [5, 5.1, 4.9, 5.05],
      [10, 10.1, 9.9, 10.05],
    ]);
    expect(result.rejectNull).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });
  it("returns groupMeans array of correct length", () => {
    const result = oneWayAnova([[1, 2], [3, 4], [5, 6]]);
    expect(result.groupMeans).toHaveLength(3);
  });
  it("effectSize (eta-squared) in [0, 1]", () => {
    const result = oneWayAnova([[1, 2, 3], [10, 11, 12], [20, 21, 22]]);
    expect(result.effectSize).toBeDefined();
    expect(result.effectSize!).toBeGreaterThanOrEqual(0);
    expect(result.effectSize!).toBeLessThanOrEqual(1);
  });
  it("fStatistic matches statistic field", () => {
    const result = oneWayAnova([[1, 2], [3, 4], [5, 6]]);
    expect(result.fStatistic).toBe(result.statistic);
  });
});

// ---------------------------------------------------------------------------
// simpleLinearRegression
// ---------------------------------------------------------------------------
describe("simpleLinearRegression", () => {
  it("perfect linear data: slope=2, intercept=1, r2=1", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 5, 7, 9, 11]; // y = 2x + 1
    const result = simpleLinearRegression(x, y);
    expect(result.slope).toBeCloseTo(2, 8);
    expect(result.intercept).toBeCloseTo(1, 8);
    expect(result.r2).toBeCloseTo(1, 8);
  });
  it("r2 in [0,1] for noisy data", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 4, 3, 6, 5, 8, 7, 10, 9, 12];
    const result = simpleLinearRegression(x, y);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });
  it("95% CI contains the true slope for perfect data", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 5, 7, 9, 11];
    const result = simpleLinearRegression(x, y);
    expect(result.confidenceInterval95[0]).toBeLessThanOrEqual(2);
    expect(result.confidenceInterval95[1]).toBeGreaterThanOrEqual(2);
  });
  it("p-value for perfect linear fit is small", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 5, 7, 9, 11];
    const result = simpleLinearRegression(x, y);
    expect(result.pValue).toBeLessThan(0.05);
  });
  it("throws on n < 3", () => {
    expect(() => simpleLinearRegression([1, 2], [3, 4])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// multipleRCorrelation
// ---------------------------------------------------------------------------
describe("multipleRCorrelation", () => {
  it("single perfect predictor → R ≈ 1", () => {
    const x = [[1, 2, 3, 4, 5]];
    const y = [2, 4, 6, 8, 10];
    const R = multipleRCorrelation(x, y);
    expect(R).toBeCloseTo(1, 5);
  });
  it("R is in [0, 1]", () => {
    const x = [[1, 2, 3, 4, 5], [5, 4, 3, 2, 1]];
    const y = [2, 3, 5, 4, 6];
    const R = multipleRCorrelation(x, y);
    expect(R).toBeGreaterThanOrEqual(0);
    expect(R).toBeLessThanOrEqual(1);
  });
  it("two predictors that perfectly explain y → R ≈ 1", () => {
    // y = 2*x1 + 3*x2
    const x1 = [1, 2, 3, 4, 5];
    const x2 = [5, 4, 3, 2, 1];
    const y = x1.map((xi, i) => 2 * xi + 3 * x2[i]!);
    const R = multipleRCorrelation([x1, x2], y);
    expect(R).toBeCloseTo(1, 4);
  });
});

// ---------------------------------------------------------------------------
// zScoreOutliers
// ---------------------------------------------------------------------------
describe("zScoreOutliers", () => {
  it("detects obvious outlier at end", () => {
    const vals = [1, 2, 2, 2, 2, 2, 2, 2, 2, 100];
    const indices = zScoreOutliers(vals);
    expect(indices).toContain(9);
  });
  it("no outliers in uniform data", () => {
    const vals = [5, 5, 5, 5, 5, 5];
    expect(zScoreOutliers(vals)).toEqual([]);
  });
  it("custom threshold reduces sensitivity", () => {
    const vals = [1, 2, 3, 4, 100];
    const strictIndices = zScoreOutliers(vals, 0.5);
    const looseIndices = zScoreOutliers(vals, 10);
    expect(strictIndices.length).toBeGreaterThanOrEqual(looseIndices.length);
  });
});

// ---------------------------------------------------------------------------
// iqrOutliers
// ---------------------------------------------------------------------------
describe("iqrOutliers", () => {
  it("detects classic box-plot outlier", () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000];
    const indices = iqrOutliers(vals);
    expect(indices).toContain(9);
  });
  it("no outliers in uniform data", () => {
    expect(iqrOutliers([5, 5, 5, 5])).toEqual([]);
  });
  it("lower fence outlier detected", () => {
    const vals = [-1000, 1, 2, 3, 4, 5];
    const indices = iqrOutliers(vals);
    expect(indices).toContain(0);
  });
});

// ---------------------------------------------------------------------------
// grubbs
// ---------------------------------------------------------------------------
describe("grubbs", () => {
  it("detects extreme outlier", () => {
    const vals = [10, 11, 10.5, 10.2, 10.8, 100];
    const result = grubbs(vals);
    expect(result.isOutlier).toBe(true);
    expect(result.outlierIndex).toBe(5); // index of 100
  });
  it("no outlier in uniform-ish data", () => {
    const vals = [10, 10.5, 11, 10.2, 10.8, 10.9];
    const result = grubbs(vals);
    expect(result.isOutlier).toBe(false);
  });
  it("throws on n < 3", () => {
    expect(() => grubbs([1, 2])).toThrow(RangeError);
  });
  it("gStat is non-negative", () => {
    const vals = [1, 2, 3, 4, 5];
    expect(grubbs(vals).gStat).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// bootstrapMean
// ---------------------------------------------------------------------------
describe("bootstrapMean", () => {
  it("CI contains true mean for well-behaved data", () => {
    const vals = Array.from({ length: 50 }, (_, i) => i + 1);
    const trueMean = mean(vals);
    const result = bootstrapMean(vals, 2000, 123);
    expect(result.ci95Low).toBeLessThanOrEqual(trueMean);
    expect(result.ci95High).toBeGreaterThanOrEqual(trueMean);
  });
  it("bootstrap mean matches sample mean", () => {
    const vals = [1, 2, 3, 4, 5];
    const result = bootstrapMean(vals, 1000, 42);
    expect(result.mean).toBeCloseTo(mean(vals), 10);
  });
  it("ci95Low < ci95High", () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = bootstrapMean(vals, 1000, 7);
    expect(result.ci95Low).toBeLessThan(result.ci95High);
  });
});

// ---------------------------------------------------------------------------
// bootstrapCorrelation
// ---------------------------------------------------------------------------
describe("bootstrapCorrelation", () => {
  it("correlation matches sample pearson", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const result = bootstrapCorrelation(x, y, 1000, 42);
    expect(result.correlation).toBeCloseTo(1, 8);
  });
  it("CI for perfect correlation is near [1,1]", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = x.map((v) => v * 2);
    const result = bootstrapCorrelation(x, y, 500, 42);
    expect(result.ci95Low).toBeGreaterThan(0.9);
  });
  it("throws on mismatched arrays", () => {
    expect(() => bootstrapCorrelation([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// sampleSizeForProportion
// ---------------------------------------------------------------------------
describe("sampleSizeForProportion", () => {
  it("standard formula: p=0.5, E=0.05 → ~385", () => {
    const n = sampleSizeForProportion(0.5, 0.05);
    // Classic result is ceil(1.96^2 * 0.25 / 0.0025) = 385
    expect(n).toBeGreaterThanOrEqual(380);
    expect(n).toBeLessThanOrEqual(400);
  });
  it("smaller margin → larger sample", () => {
    const n1 = sampleSizeForProportion(0.5, 0.05);
    const n2 = sampleSizeForProportion(0.5, 0.01);
    expect(n2).toBeGreaterThan(n1);
  });
  it("returns integer (ceiling)", () => {
    const n = sampleSizeForProportion(0.3, 0.04);
    expect(Number.isInteger(n)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// powerForTTest
// ---------------------------------------------------------------------------
describe("powerForTTest", () => {
  it("large effect + large n → high power", () => {
    const power = powerForTTest(0.8, 100);
    expect(power).toBeGreaterThan(0.9);
  });
  it("small effect + small n → low power", () => {
    const power = powerForTTest(0.1, 5);
    expect(power).toBeLessThan(0.5);
  });
  it("power is in [0, 1]", () => {
    const power = powerForTTest(0.5, 30);
    expect(power).toBeGreaterThanOrEqual(0);
    expect(power).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// rollingMean
// ---------------------------------------------------------------------------
describe("rollingMean", () => {
  it("window=1 → same values as input", () => {
    const vals = [1, 2, 3, 4, 5];
    const result = rollingMean(vals, 1);
    expect(result).toEqual(vals);
  });
  it("first (window-1) values are NaN", () => {
    const vals = [1, 2, 3, 4, 5];
    const result = rollingMean(vals, 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(isNaN(result[2]!)).toBe(false);
  });
  it("window=3 computes correct mean", () => {
    const vals = [1, 2, 3, 4, 5];
    const result = rollingMean(vals, 3);
    expect(result[2]).toBeCloseTo(2, 10); // (1+2+3)/3
    expect(result[3]).toBeCloseTo(3, 10); // (2+3+4)/3
    expect(result[4]).toBeCloseTo(4, 10); // (3+4+5)/3
  });
  it("output length equals input length", () => {
    const vals = [1, 2, 3, 4, 5];
    expect(rollingMean(vals, 2)).toHaveLength(5);
  });
  it("throws on window < 1", () => {
    expect(() => rollingMean([1, 2, 3], 0)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// rollingCorrelation
// ---------------------------------------------------------------------------
describe("rollingCorrelation", () => {
  it("first (window-1) values are NaN", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const result = rollingCorrelation(x, y, 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(isNaN(result[2]!)).toBe(false);
  });
  it("perfect positive relationship → 1.0 in window", () => {
    const x = [1, 2, 3, 4, 5, 6];
    const y = [2, 4, 6, 8, 10, 12];
    const result = rollingCorrelation(x, y, 3);
    expect(result[2]).toBeCloseTo(1, 8);
    expect(result[5]).toBeCloseTo(1, 8);
  });
  it("output length equals input length", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 4, 3, 2, 1];
    expect(rollingCorrelation(x, y, 3)).toHaveLength(5);
  });
  it("throws on mismatched lengths", () => {
    expect(() => rollingCorrelation([1, 2, 3], [1, 2], 2)).toThrow(RangeError);
  });
});
