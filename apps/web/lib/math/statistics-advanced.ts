/**
 * Advanced statistical functions — pure TypeScript, zero npm dependencies.
 *
 * Descriptive statistics, correlation measures, hypothesis tests, regression,
 * outlier detection, bootstrap resampling, power analysis, and rolling statistics.
 * Designed to complement apps/web/lib/math/probability.ts without re-exporting it.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Standard normal CDF (A&S approximation, error < 1.5e-7).
 * Kept private so callers use probability.ts when they need it externally.
 */
function _normalCdf(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erfc = poly * Math.exp(-(x * x));
  const erf = 1 - erfc;
  return 0.5 * (1 + sign * erf);
}

/** Two-tailed p-value from a standard normal z-score. */
function _twoTailedP(z: number): number {
  return 2 * (1 - _normalCdf(Math.abs(z)));
}

/** Simple LCG pseudo-random number generator. Returns values in [0, 1). */
function _makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = ((1664525 * s + 1013904223) & 0xffffffff) >>> 0;
    return s / 0x100000000;
  };
}

/** Average-ties rank array (1-based). */
function _rankWithTies(arr: number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1]!.v === indexed[i]!.v) j++;
    const avgRank = (i + j) / 2 + 1; // 1-based average
    for (let k = i; k <= j; k++) ranks[indexed[k]!.i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

// ---------------------------------------------------------------------------
// Descriptive statistics
// ---------------------------------------------------------------------------

/**
 * Arithmetic mean.
 * Throws if values is empty.
 */
export function mean(values: number[]): number {
  if (values.length === 0) throw new RangeError("mean: values must not be empty");
  return values.reduce((s, x) => s + x, 0) / values.length;
}

/**
 * Variance.
 * population=true → divide by n (σ²); population=false (default) → divide by n-1 (s²).
 * Throws if empty; returns 0 for single-element sample variance.
 */
export function variance(values: number[], population = false): number {
  if (values.length === 0) throw new RangeError("variance: values must not be empty");
  const mu = mean(values);
  const ss = values.reduce((s, x) => s + (x - mu) ** 2, 0);
  const denom = population ? values.length : Math.max(values.length - 1, 1);
  return ss / denom;
}

/**
 * Standard deviation (sqrt of variance).
 */
export function stdDev(values: number[], population = false): number {
  return Math.sqrt(variance(values, population));
}

/**
 * Median value.
 * Throws if values is empty.
 */
export function median(values: number[]): number {
  if (values.length === 0) throw new RangeError("median: values must not be empty");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Mode: all values tied for most frequent, sorted ascending.
 * Returns [] for empty input.
 */
export function mode(values: number[]): number[] {
  if (values.length === 0) return [];
  const counts = new Map<number, number>();
  for (const x of values) counts.set(x, (counts.get(x) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  return [...counts.entries()]
    .filter(([, c]) => c === maxCount)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

/**
 * Quantile via linear interpolation.
 * q=0 → min; q=1 → max; q=0.5 → median.
 * Throws if values is empty or q ∉ [0,1].
 */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) throw new RangeError("quantile: values must not be empty");
  if (q < 0 || q > 1) throw new RangeError(`quantile: q must be in [0,1], got ${q}`);
  const sorted = [...values].sort((a, b) => a - b);
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (idx - lo) * (sorted[hi]! - sorted[lo]!);
}

/**
 * Interquartile range (Q3 − Q1).
 */
export function iqr(values: number[]): number {
  return quantile(values, 0.75) - quantile(values, 0.25);
}

/**
 * Pearson's moment skewness.
 * Returns 0 if n < 3 or std dev = 0.
 */
export function skewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const mu = mean(values);
  const s = stdDev(values, false);
  if (s === 0) return 0;
  const sum3 = values.reduce((acc, x) => acc + ((x - mu) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}

/**
 * Excess kurtosis (Fisher definition).
 * Returns 0 if n < 4 or std dev = 0.
 */
export function kurtosis(values: number[]): number {
  const n = values.length;
  if (n < 4) return 0;
  const mu = mean(values);
  const s = stdDev(values, false);
  if (s === 0) return 0;
  const sum4 = values.reduce((acc, x) => acc + ((x - mu) / s) ** 4, 0);
  const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum4;
  const term2 = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return term1 - term2;
}

/**
 * Z-score of a single value.
 * Returns 0 if std = 0.
 */
export function zScore(value: number, mu: number, std: number): number {
  if (std === 0) return 0;
  return (value - mu) / std;
}

/**
 * Z-score normalize each element: (x − mean) / std.
 * Returns all-zeros if std = 0.
 */
export function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const mu = mean(values);
  const s = stdDev(values, false);
  if (s === 0) return values.map(() => 0);
  return values.map((x) => (x - mu) / s);
}

/**
 * Min-max standardize values to [0, 1].
 * If all equal, returns all 0.5.
 * Accepts optional external min/max bounds.
 */
export function standardize(values: number[], min?: number, max?: number): number[] {
  if (values.length === 0) return [];
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  if (lo === hi) return values.map(() => 0.5);
  return values.map((x) => (x - lo) / (hi - lo));
}

// ---------------------------------------------------------------------------
// Correlation
// ---------------------------------------------------------------------------

/**
 * Pearson r correlation coefficient.
 * Throws if arrays have different lengths or n < 2.
 * Returns 0 if either array has zero standard deviation.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length)
    throw new RangeError("pearsonCorrelation: arrays must have equal length");
  if (x.length < 2)
    throw new RangeError("pearsonCorrelation: need at least 2 data points");
  const mx = mean(x);
  const my = mean(y);
  const sx = stdDev(x, false);
  const sy = stdDev(y, false);
  if (sx === 0 || sy === 0) return 0;
  const cov = x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0) / (x.length - 1);
  return cov / (sx * sy);
}

/**
 * Spearman rank correlation.
 * Converts to average-tie ranks then applies pearsonCorrelation.
 */
export function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length)
    throw new RangeError("spearmanCorrelation: arrays must have equal length");
  if (x.length < 2)
    throw new RangeError("spearmanCorrelation: need at least 2 data points");
  return pearsonCorrelation(_rankWithTies(x), _rankWithTies(y));
}

/**
 * Kendall tau-b correlation.
 * Handles ties via tau-b formula.
 */
export function kendallTau(x: number[], y: number[]): number {
  if (x.length !== y.length)
    throw new RangeError("kendallTau: arrays must have equal length");
  const n = x.length;
  if (n < 2) return 0;
  let concordant = 0;
  let discordant = 0;
  let tiedX = 0;
  let tiedY = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[i]! - x[j]!;
      const dy = y[i]! - y[j]!;
      const prod = dx * dy;
      if (prod > 0) concordant++;
      else if (prod < 0) discordant++;
      else {
        if (dx === 0 && dy !== 0) tiedX++;
        else if (dy === 0 && dx !== 0) tiedY++;
        // both zero: not counted in either tiedX or tiedY (tied pair)
      }
    }
  }
  const n0 = (n * (n - 1)) / 2;
  const n1 = tiedX;
  const n2 = tiedY;
  const denom = Math.sqrt((n0 - n1) * (n0 - n2));
  if (denom === 0) return 0;
  return (concordant - discordant) / denom;
}

/**
 * Sample covariance: sum((xi − meanX)(yi − meanY)) / (n − 1).
 * Throws if arrays have different lengths or n < 2.
 */
export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length)
    throw new RangeError("covariance: arrays must have equal length");
  if (x.length < 2)
    throw new RangeError("covariance: need at least 2 data points");
  const mx = mean(x);
  const my = mean(y);
  return x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0) / (x.length - 1);
}

// ---------------------------------------------------------------------------
// Hypothesis tests
// ---------------------------------------------------------------------------

export interface TestResult {
  statistic: number;
  pValue: number;
  rejectNull: boolean;
  effectSize?: number;
}

/**
 * One-sample t-test.
 * t = (xbar − mu0) / (s / √n), two-tailed p-value via normal approximation.
 */
export function oneSampleTTest(values: number[], populationMean: number): TestResult {
  if (values.length < 2)
    throw new RangeError("oneSampleTTest: need at least 2 values");
  const n = values.length;
  const xbar = mean(values);
  const s = stdDev(values, false);
  if (s === 0) return { statistic: 0, pValue: 1, rejectNull: false };
  const t = (xbar - populationMean) / (s / Math.sqrt(n));
  const pValue = _twoTailedP(t);
  return { statistic: t, pValue, rejectNull: pValue < 0.05 };
}

/**
 * Two-sample t-test.
 * equalVariance=false (default): Welch's t-test.
 * effectSize = Cohen's d = (m1 − m2) / pooledStd.
 */
export function twoSampleTTest(
  group1: number[],
  group2: number[],
  equalVariance = false
): TestResult {
  if (group1.length < 2 || group2.length < 2)
    throw new RangeError("twoSampleTTest: each group needs at least 2 values");
  const n1 = group1.length;
  const n2 = group2.length;
  const m1 = mean(group1);
  const m2 = mean(group2);
  const s1 = stdDev(group1, false);
  const s2 = stdDev(group2, false);

  let t: number;
  if (equalVariance) {
    const sp = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2));
    if (sp === 0) return { statistic: 0, pValue: 1, rejectNull: false, effectSize: 0 };
    t = (m1 - m2) / (sp * Math.sqrt(1 / n1 + 1 / n2));
  } else {
    const se = Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2);
    if (se === 0) return { statistic: 0, pValue: 1, rejectNull: false, effectSize: 0 };
    t = (m1 - m2) / se;
  }

  const pValue = _twoTailedP(t);

  // Cohen's d
  const pooledStd = Math.sqrt((s1 ** 2 + s2 ** 2) / 2);
  const effectSize = pooledStd === 0 ? 0 : Math.abs(m1 - m2) / pooledStd;

  return { statistic: t, pValue, rejectNull: pValue < 0.05, effectSize };
}

/**
 * Paired t-test.
 * Computes differences d_i = after_i − before_i, then runs oneSampleTTest(d, 0).
 */
export function pairedTTest(before: number[], after: number[]): TestResult {
  if (before.length !== after.length)
    throw new RangeError("pairedTTest: before and after must have equal length");
  const diffs = before.map((b, i) => after[i]! - b);
  return oneSampleTTest(diffs, 0);
}

/**
 * Chi-square goodness-of-fit test.
 * chi2 = sum((O − E)^2 / E); df = k − 1.
 * p-value via Wilson-Hilferty approximation.
 */
export function chiSquareGoodnessOfFit(observed: number[], expected: number[]): TestResult {
  if (observed.length !== expected.length)
    throw new RangeError("chiSquareGoodnessOfFit: arrays must have equal length");
  if (expected.some((e) => e === 0))
    throw new RangeError("chiSquareGoodnessOfFit: expected values must not be 0");
  const chi2 = observed.reduce((s, o, i) => s + (o - expected[i]!) ** 2 / expected[i]!, 0);
  const df = observed.length - 1;
  const pValue = _chiSquareSurvival(chi2, df);
  return { statistic: chi2, pValue, rejectNull: pValue < 0.05 };
}

/** Wilson-Hilferty chi-square survival (upper tail) approximation. */
function _chiSquareSurvival(chi2: number, df: number): number {
  if (df <= 0) return chi2 <= 0 ? 1 : 0;
  if (chi2 <= 0) return 1;
  const x = Math.pow(chi2 / df, 1 / 3);
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  const z = (x - mu) / sigma;
  return 1 - _normalCdf(z);
}

/**
 * Chi-square test of independence from a contingency table.
 * df = (rows − 1)(cols − 1).
 */
export function chiSquareIndependence(contingencyTable: number[][]): TestResult {
  const rows = contingencyTable.length;
  if (rows < 2) throw new RangeError("chiSquareIndependence: need at least 2 rows");
  const cols = contingencyTable[0]!.length;
  if (cols < 2) throw new RangeError("chiSquareIndependence: need at least 2 columns");

  const rowTotals = contingencyTable.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals = Array.from({ length: cols }, (_, j) =>
    contingencyTable.reduce((s, row) => s + row[j]!, 0)
  );
  const total = rowTotals.reduce((s, v) => s + v, 0);

  if (total === 0) throw new RangeError("chiSquareIndependence: table total must not be 0");

  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i]! * colTotals[j]!) / total;
      if (expected === 0) continue;
      chi2 += (contingencyTable[i]![j]! - expected) ** 2 / expected;
    }
  }

  const df = (rows - 1) * (cols - 1);
  const pValue = _chiSquareSurvival(chi2, df);
  return { statistic: chi2, pValue, rejectNull: pValue < 0.05 };
}

/**
 * Mann-Whitney U test (non-parametric two-sample test).
 * statistic = min(U1, U2).
 * Normal approximation for p-value.
 */
export function mannWhitneyU(group1: number[], group2: number[]): TestResult {
  if (group1.length === 0 || group2.length === 0)
    throw new RangeError("mannWhitneyU: groups must not be empty");
  const n1 = group1.length;
  const n2 = group2.length;

  // Combine and rank
  const combined = [
    ...group1.map((v) => ({ v, group: 1 as 1 | 2 })),
    ...group2.map((v) => ({ v, group: 2 as 1 | 2 })),
  ].sort((a, b) => a.v - b.v);

  // Assign average ranks for ties
  const ranks = new Array<number>(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1]!.v === combined[i]!.v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    i = j + 1;
  }

  let R1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k]!.group === 1) R1 += ranks[k]!;
  }

  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);

  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);

  if (sigmaU === 0) return { statistic: U, pValue: 1, rejectNull: false };

  const z = (U - muU) / sigmaU;
  const pValue = _twoTailedP(z);
  return { statistic: U, pValue, rejectNull: pValue < 0.05 };
}

/**
 * Wilcoxon signed-rank test (non-parametric paired test).
 * statistic = min(W+, W−).
 */
export function wilcoxonSignedRank(before: number[], after: number[]): TestResult {
  if (before.length !== after.length)
    throw new RangeError("wilcoxonSignedRank: before and after must have equal length");

  const diffs = before.map((b, i) => after[i]! - b).filter((d) => d !== 0);
  const n = diffs.length;

  if (n === 0) return { statistic: 0, pValue: 1, rejectNull: false };

  // Rank by absolute value with average ties
  const absRanked = diffs
    .map((d, i) => ({ d, abs: Math.abs(d), i }))
    .sort((a, b) => a.abs - b.abs);

  const ranks = new Array<number>(n);
  let j = 0;
  while (j < absRanked.length) {
    let k = j;
    while (k < absRanked.length - 1 && absRanked[k + 1]!.abs === absRanked[j]!.abs) k++;
    const avgRank = (j + k) / 2 + 1;
    for (let m = j; m <= k; m++) ranks[absRanked[m]!.i] = avgRank;
    j = k + 1;
  }

  let wPlus = 0;
  let wMinus = 0;
  for (let idx = 0; idx < n; idx++) {
    if (diffs[idx]! > 0) wPlus += ranks[idx]!;
    else wMinus += ranks[idx]!;
  }

  const W = Math.min(wPlus, wMinus);
  const muW = (n * (n + 1)) / 4;
  const sigmaW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);

  if (sigmaW === 0) return { statistic: W, pValue: 1, rejectNull: false };

  const z = (W - muW) / sigmaW;
  const pValue = _twoTailedP(z);
  return { statistic: W, pValue, rejectNull: pValue < 0.05 };
}

/**
 * One-way ANOVA (F-test).
 * effectSize = eta-squared = SSB / (SSB + SSW).
 */
export function oneWayAnova(
  groups: number[][]
): TestResult & { fStatistic: number; groupMeans: number[] } {
  if (groups.length < 2) throw new RangeError("oneWayAnova: need at least 2 groups");
  if (groups.some((g) => g.length === 0))
    throw new RangeError("oneWayAnova: each group must have at least one value");

  const k = groups.length;
  const groupMeans = groups.map(mean);
  const N = groups.reduce((s, g) => s + g.length, 0);
  const allValues = groups.flat();
  const grandMean = mean(allValues);

  const SSB = groups.reduce(
    (s, g, i) => s + g.length * (groupMeans[i]! - grandMean) ** 2,
    0
  );
  const SSW = groups.reduce(
    (s, g, i) => s + g.reduce((gs, x) => gs + (x - groupMeans[i]!) ** 2, 0),
    0
  );

  if (SSW === 0) {
    // All values within groups are identical
    const fStat = SSB === 0 ? 0 : Infinity;
    const pVal = SSB === 0 ? 1 : 0;
    return {
      statistic: fStat,
      fStatistic: fStat,
      pValue: pVal,
      rejectNull: pVal < 0.05,
      effectSize: SSB === 0 ? 0 : 1,
      groupMeans,
    };
  }

  const dfB = k - 1;
  const dfW = N - k;
  const MSB = SSB / dfB;
  const MSW = SSW / dfW;

  if (MSW === 0) {
    return {
      statistic: Infinity,
      fStatistic: Infinity,
      pValue: 0,
      rejectNull: true,
      effectSize: SSB / (SSB + SSW),
      groupMeans,
    };
  }

  const F = MSB / MSW;

  // Approximate p-value via chi-square on F*dfB with dfB degrees of freedom
  // Using Wilson-Hilferty on the chi2 approximation: chi2 = F * dfB
  const chi2Approx = F * dfB;
  const pValue = _chiSquareSurvival(chi2Approx, dfB);

  const effectSize = SSB / (SSB + SSW);

  return {
    statistic: F,
    fStatistic: F,
    pValue,
    rejectNull: pValue < 0.05,
    effectSize,
    groupMeans,
  };
}

// ---------------------------------------------------------------------------
// Regression
// ---------------------------------------------------------------------------

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  confidenceInterval95: [number, number];
}

/**
 * Simple linear regression (OLS).
 * SE of slope = sqrt(MSE / Sxx); t = slope / SE; df = n − 2.
 * 95% CI: slope ± 1.96 * SE (normal approximation).
 */
export function simpleLinearRegression(x: number[], y: number[]): RegressionResult {
  if (x.length !== y.length)
    throw new RangeError("simpleLinearRegression: x and y must have equal length");
  if (x.length < 3)
    throw new RangeError("simpleLinearRegression: need at least 3 data points");

  const n = x.length;
  const mx = mean(x);
  const my = mean(y);

  const Sxx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0);
  const Sxy = x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0);

  if (Sxx === 0) throw new RangeError("simpleLinearRegression: x has zero variance");

  const slope = Sxy / Sxx;
  const intercept = my - slope * mx;

  const SSE = y.reduce((s, yi, i) => s + (yi - (slope * x[i]! + intercept)) ** 2, 0);
  const MSE = SSE / (n - 2);
  const SE = Math.sqrt(MSE / Sxx);

  const SStot = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  const r2 = SStot === 0 ? 1 : 1 - SSE / SStot;

  // When SE ≈ 0 (perfect fit), use a very large t-statistic
  const tStat = SE < 1e-15 ? (slope === 0 ? 0 : 1e15 * Math.sign(slope)) : slope / SE;
  const pValue = SE < 1e-15 && slope !== 0 ? 0 : _twoTailedP(tStat);
  const ci: [number, number] = [slope - 1.96 * SE, slope + 1.96 * SE];

  return {
    slope,
    intercept,
    r2,
    standardError: SE,
    tStatistic: tStat,
    pValue,
    confidenceInterval95: ci,
  };
}

/**
 * Multiple correlation coefficient R from multiple linear regression (OLS).
 * Supports up to 3 predictors via inline Gaussian elimination.
 * Returns R = sqrt(SSReg / SSTotal).
 */
export function multipleRCorrelation(x: number[][], y: number[]): number {
  const n = y.length;
  if (n === 0) throw new RangeError("multipleRCorrelation: y must not be empty");
  const p = x.length;
  if (p === 0) throw new RangeError("multipleRCorrelation: x must not be empty");
  if (x.some((col) => col.length !== n))
    throw new RangeError("multipleRCorrelation: all predictors must have length n");

  // Build design matrix with intercept: columns [1, x[0], x[1], ...]
  const cols = p + 1;
  // X is n x cols, stored row-major
  const X: number[][] = Array.from({ length: n }, (_, i) => [
    1,
    ...x.map((xj) => xj[i]!),
  ]);

  // Compute XᵀX (cols x cols) and Xᵀy (cols x 1)
  const XtX: number[][] = Array.from({ length: cols }, () => new Array<number>(cols).fill(0));
  const Xty: number[] = new Array<number>(cols).fill(0);

  for (let i = 0; i < n; i++) {
    for (let a = 0; a < cols; a++) {
      Xty[a]! += X[i]![a]! * y[i]!;
      for (let b = 0; b < cols; b++) {
        XtX[a]![b]! += X[i]![a]! * X[i]![b]!;
      }
    }
  }

  // Augment [XtX | Xty] and solve via Gaussian elimination
  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]!]);

  for (let col = 0; col < cols; col++) {
    // Find pivot
    let pivotRow = -1;
    let maxVal = 0;
    for (let row = col; row < cols; row++) {
      if (Math.abs(aug[row]![col]!) > maxVal) {
        maxVal = Math.abs(aug[row]![col]!);
        pivotRow = row;
      }
    }
    if (pivotRow === -1 || maxVal < 1e-12) continue;
    [aug[col], aug[pivotRow]] = [aug[pivotRow]!, aug[col]!];
    const scale = aug[col]![col]!;
    for (let j = col; j <= cols; j++) aug[col]![j]! /= scale;
    for (let row = 0; row < cols; row++) {
      if (row === col) continue;
      const factor = aug[row]![col]!;
      for (let j = col; j <= cols; j++) aug[row]![j]! -= factor * aug[col]![j]!;
    }
  }

  const beta = aug.map((row) => row[cols]!);

  // Predicted values and R²
  const yHat = Array.from({ length: n }, (_, i) =>
    X[i]!.reduce((s, xij, j) => s + xij * beta[j]!, 0)
  );
  const my = mean(y);
  const SSRes = y.reduce((s, yi, i) => s + (yi - yHat[i]!) ** 2, 0);
  const SSTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  if (SSTot === 0) return 1;
  return Math.sqrt(Math.max(0, 1 - SSRes / SSTot));
}

// ---------------------------------------------------------------------------
// Outlier detection
// ---------------------------------------------------------------------------

/**
 * Returns indices where |z-score| > threshold (default 2.5).
 */
export function zScoreOutliers(values: number[], threshold = 2.5): number[] {
  if (values.length < 2) return [];
  const mu = mean(values);
  const s = stdDev(values, false);
  if (s === 0) return [];
  return values
    .map((v, i) => ({ z: Math.abs((v - mu) / s), i }))
    .filter(({ z }) => z > threshold)
    .map(({ i }) => i);
}

/**
 * Returns indices where value < Q1 − multiplier*IQR or > Q3 + multiplier*IQR (default 1.5).
 */
export function iqrOutliers(values: number[], multiplier = 1.5): number[] {
  if (values.length === 0) return [];
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const range = (q3 - q1) * multiplier;
  const lo = q1 - range;
  const hi = q3 + range;
  return values.map((v, i) => (v < lo || v > hi ? i : -1)).filter((i) => i !== -1);
}

/**
 * Grubbs test for a single outlier.
 * G = max(|xi − mean|) / std.
 * Critical value approximated using G_crit = ((n-1)/sqrt(n)) * sqrt(t² / (n-2+t²))
 * with t ≈ 2.326 (z for large-n approximation at alpha=0.05/2n).
 */
export function grubbs(
  values: number[]
): { outlierIndex: number; gStat: number; isOutlier: boolean } {
  if (values.length < 3)
    throw new RangeError("grubbs: need at least 3 values");
  const mu = mean(values);
  const s = stdDev(values, false);
  if (s === 0) return { outlierIndex: 0, gStat: 0, isOutlier: false };

  let maxDev = -Infinity;
  let outlierIndex = 0;
  for (let i = 0; i < values.length; i++) {
    const dev = Math.abs(values[i]! - mu);
    if (dev > maxDev) {
      maxDev = dev;
      outlierIndex = i;
    }
  }

  const n = values.length;
  const gStat = maxDev / s;
  const t = 2.326; // large-n approximation for t(alpha/(2n), n-2)
  const gCrit = ((n - 1) / Math.sqrt(n)) * Math.sqrt((t * t) / (n - 2 + t * t));
  const isOutlier = gStat > gCrit;

  return { outlierIndex, gStat, isOutlier };
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * Bootstrap mean with 95% CI.
 * Resamples with replacement nBootstrap times (default 1000).
 */
export function bootstrapMean(
  values: number[],
  nBootstrap = 1000,
  seed = 42
): { mean: number; ci95Low: number; ci95High: number } {
  if (values.length === 0) throw new RangeError("bootstrapMean: values must not be empty");
  const prng = _makeLcg(seed);
  const n = values.length;
  const means: number[] = [];

  for (let b = 0; b < nBootstrap; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += values[Math.floor(prng() * n)]!;
    }
    means.push(s / n);
  }

  means.sort((a, b) => a - b);
  const lo = Math.floor(0.025 * nBootstrap);
  const hi = Math.floor(0.975 * nBootstrap);

  return {
    mean: mean(values),
    ci95Low: means[lo]!,
    ci95High: means[hi]!,
  };
}

/**
 * Bootstrap Pearson correlation with 95% CI.
 */
export function bootstrapCorrelation(
  x: number[],
  y: number[],
  nBootstrap = 1000,
  seed = 42
): { correlation: number; ci95Low: number; ci95High: number } {
  if (x.length !== y.length)
    throw new RangeError("bootstrapCorrelation: x and y must have equal length");
  if (x.length < 2)
    throw new RangeError("bootstrapCorrelation: need at least 2 data points");

  const prng = _makeLcg(seed);
  const n = x.length;
  const cors: number[] = [];

  for (let b = 0; b < nBootstrap; b++) {
    const bx: number[] = [];
    const by: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(prng() * n);
      bx.push(x[idx]!);
      by.push(y[idx]!);
    }
    try {
      cors.push(pearsonCorrelation(bx, by));
    } catch {
      cors.push(0);
    }
  }

  cors.sort((a, b) => a - b);
  const lo = Math.floor(0.025 * nBootstrap);
  const hi = Math.floor(0.975 * nBootstrap);

  return {
    correlation: pearsonCorrelation(x, y),
    ci95Low: cors[lo]!,
    ci95High: cors[hi]!,
  };
}

// ---------------------------------------------------------------------------
// Power analysis
// ---------------------------------------------------------------------------

/**
 * Minimum sample size for estimating a proportion.
 * n = ceil((z / E)² * p * (1 − p))
 * confidence default 0.95, z = 1.96.
 */
export function sampleSizeForProportion(
  expectedRate: number,
  marginOfError: number,
  confidence = 0.95
): number {
  const z = confidence >= 0.99 ? 2.576 : confidence >= 0.99 ? 2.326 : 1.96;
  const p = expectedRate;
  const n = (z / marginOfError) ** 2 * p * (1 - p);
  return Math.ceil(n);
}

/**
 * Approximate power for a two-sample t-test.
 * Power = normalCdf(|d| * sqrt(n/2) − z_{alpha/2}).
 * z_{alpha/2} = 1.96 for alpha = 0.05.
 */
export function powerForTTest(effectSize: number, n: number, alpha = 0.05): number {
  const zAlpha = alpha <= 0.01 ? 2.576 : alpha <= 0.05 ? 1.96 : 1.645;
  const nonCentrality = Math.abs(effectSize) * Math.sqrt(n / 2);
  return _normalCdf(nonCentrality - zAlpha);
}

// ---------------------------------------------------------------------------
// Rolling statistics
// ---------------------------------------------------------------------------

/**
 * Rolling mean with same-length output.
 * First (window − 1) values are NaN; subsequent values use past window elements.
 */
export function rollingMean(values: number[], window: number): number[] {
  if (window < 1) throw new RangeError("rollingMean: window must be >= 1");
  const result: number[] = new Array<number>(values.length).fill(NaN);
  for (let i = window - 1; i < values.length; i++) {
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += values[j]!;
    result[i] = s / window;
  }
  return result;
}

/**
 * Rolling Pearson correlation over a sliding window.
 * Returns NaN for the first (window − 1) positions.
 */
export function rollingCorrelation(x: number[], y: number[], window: number): number[] {
  if (x.length !== y.length)
    throw new RangeError("rollingCorrelation: x and y must have equal length");
  if (window < 2) throw new RangeError("rollingCorrelation: window must be >= 2");
  const n = x.length;
  const result: number[] = new Array<number>(n).fill(NaN);
  for (let i = window - 1; i < n; i++) {
    const wx = x.slice(i - window + 1, i + 1);
    const wy = y.slice(i - window + 1, i + 1);
    try {
      result[i] = pearsonCorrelation(wx, wy);
    } catch {
      result[i] = NaN;
    }
  }
  return result;
}
