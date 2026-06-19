/**
 * Descriptive statistics utilities — pure math, zero dependencies.
 *
 * Variance, standard deviation, z-scores, percentiles, correlation,
 * and regression helpers for sports analytics surfaces.
 */

/**
 * Sum of an array. Returns 0 for empty arrays.
 */
export function sum(arr: readonly number[]): number {
  return arr.reduce((acc, n) => acc + n, 0);
}

/**
 * Arithmetic mean. Returns null for empty arrays.
 */
export function mean(arr: readonly number[]): number | null {
  if (arr.length === 0) return null;
  return sum(arr) / arr.length;
}

/**
 * Population variance σ². Returns null for empty arrays.
 */
export function variancePop(arr: readonly number[]): number | null {
  const mu = mean(arr);
  if (mu === null) return null;
  return arr.reduce((acc, x) => acc + (x - mu) ** 2, 0) / arr.length;
}

/**
 * Sample variance s² (Bessel's correction). Returns null for n < 2.
 */
export function varianceSample(arr: readonly number[]): number | null {
  if (arr.length < 2) return null;
  const mu = mean(arr)!;
  return arr.reduce((acc, x) => acc + (x - mu) ** 2, 0) / (arr.length - 1);
}

/**
 * Population standard deviation σ.
 */
export function stdDevPop(arr: readonly number[]): number | null {
  const v = variancePop(arr);
  return v === null ? null : Math.sqrt(v);
}

/**
 * Sample standard deviation s.
 */
export function stdDevSample(arr: readonly number[]): number | null {
  const v = varianceSample(arr);
  return v === null ? null : Math.sqrt(v);
}

/**
 * Z-score of a value given a mean and standard deviation.
 * Returns null if stdDev is 0.
 */
export function zScore(value: number, mu: number, sigma: number): number | null {
  if (sigma === 0) return null;
  return (value - mu) / sigma;
}

/**
 * Z-scores for an entire array.
 * Uses sample std dev. Returns null if std dev is zero or array is too small.
 */
export function zScores(arr: readonly number[]): number[] | null {
  const mu = mean(arr);
  const sigma = stdDevSample(arr);
  if (mu === null || sigma === null || sigma === 0) return null;
  return arr.map((x) => (x - mu) / sigma);
}

/**
 * Median value. Returns null for empty arrays.
 * For even-length arrays, returns the average of the two middle values.
 */
export function median(arr: readonly number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/**
 * Mode: most frequent value(s). Returns all modes if there are ties.
 */
export function mode(arr: readonly number[]): number[] {
  if (arr.length === 0) return [];
  const counts = new Map<number, number>();
  for (const x of arr) counts.set(x, (counts.get(x) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  return [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v);
}

/**
 * p-th quantile of an array (linear interpolation).
 * quantile([1,2,3,4], 0.25) → 1.75
 *
 * @param arr Array of numbers.
 * @param p   Probability in [0,1].
 */
export function quantile(arr: readonly number[], p: number): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (idx - lower) * (sorted[upper]! - sorted[lower]!);
}

/**
 * Interquartile range (Q3 - Q1).
 */
export function iqr(arr: readonly number[]): number | null {
  const q1 = quantile(arr, 0.25);
  const q3 = quantile(arr, 0.75);
  if (q1 === null || q3 === null) return null;
  return q3 - q1;
}

/**
 * Covariance of two arrays (sample).
 * Returns null if arrays have different lengths or n < 2.
 */
export function covariance(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const mx = mean(x)!;
  const my = mean(y)!;
  return x.reduce((acc, xi, i) => acc + (xi - mx) * (y[i]! - my), 0) / (x.length - 1);
}

/**
 * Pearson correlation coefficient r ∈ [-1, 1].
 * Returns null if arrays are incompatible or std dev is zero.
 */
export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number | null {
  const cov = covariance(x, y);
  const sx = stdDevSample(x);
  const sy = stdDevSample(y);
  if (cov === null || sx === null || sy === null || sx === 0 || sy === 0) return null;
  return cov / (sx * sy);
}

/**
 * Spearman rank correlation.
 * Monotonic correlation; robust to outliers.
 */
export function spearmanCorrelation(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const rank = (arr: readonly number[]) => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(arr.length);
    for (let i = 0; i < sorted.length; i++) {
      ranks[sorted[i]!.i] = i + 1;
    }
    return ranks;
  };
  return pearsonCorrelation(rank(x), rank(y));
}

/**
 * Simple linear regression: y = slope * x + intercept.
 * Returns slope, intercept, and R².
 */
export interface LinearRegressionResult {
  readonly slope: number;
  readonly intercept: number;
  readonly rSquared: number;
  readonly n: number;
}

export function linearRegression(x: readonly number[], y: readonly number[]): LinearRegressionResult | null {
  if (x.length !== y.length || x.length < 2) return null;
  const n = x.length;
  const mx = mean(x)!;
  const my = mean(y)!;
  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (x[i]! - mx) * (y[i]! - my);
    ssXX += (x[i]! - mx) ** 2;
  }
  if (ssXX === 0) return null;
  const slope = ssXY / ssXX;
  const intercept = my - slope * mx;
  const predicted = x.map((xi) => slope * xi + intercept);
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - predicted[i]!) ** 2, 0);
  const ssTot = y.reduce((acc, yi) => acc + (yi - my) ** 2, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, rSquared, n };
}

/**
 * Moving average (simple).
 * Returns an array of length arr.length - windowSize + 1.
 */
export function movingAverage(arr: readonly number[], windowSize: number): number[] {
  if (windowSize < 1 || arr.length < windowSize) return [];
  const result: number[] = [];
  let windowSum = arr.slice(0, windowSize).reduce((a, b) => a + b, 0);
  result.push(windowSum / windowSize);
  for (let i = windowSize; i < arr.length; i++) {
    windowSum += arr[i]! - arr[i - windowSize]!;
    result.push(windowSum / windowSize);
  }
  return result;
}

/**
 * Exponential moving average with smoothing factor alpha ∈ (0,1].
 * EMA(t) = alpha * x(t) + (1-alpha) * EMA(t-1)
 * First value = first element of arr.
 */
export function exponentialMovingAverage(arr: readonly number[], alpha: number): number[] {
  if (arr.length === 0) return [];
  const a = Math.max(0, Math.min(1, alpha));
  const result: number[] = [arr[0]!];
  for (let i = 1; i < arr.length; i++) {
    result.push(a * arr[i]! + (1 - a) * result[i - 1]!);
  }
  return result;
}

/**
 * Cumulative sum.
 * cumSum([1,2,3]) → [1,3,6]
 */
export function cumSum(arr: readonly number[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (const x of arr) {
    total += x;
    result.push(total);
  }
  return result;
}

/**
 * Normalize an array to [0,1] (min-max normalization).
 * Returns null if min === max.
 */
export function normalize(arr: readonly number[]): number[] | null {
  if (arr.length === 0) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (min === max) return null;
  return arr.map((x) => (x - min) / (max - min));
}

/**
 * Standardize an array to have mean=0 and std=1.
 * Returns null if std is zero.
 */
export function standardize(arr: readonly number[]): number[] | null {
  const scores = zScores(arr);
  return scores;
}

/**
 * Outlier detection using z-score threshold.
 * Returns indices of elements with |z| > threshold (default 2.5).
 */
export function detectOutliers(arr: readonly number[], threshold = 2.5): number[] {
  const scores = zScores(arr);
  if (!scores) return [];
  return arr.map((_, i) => i).filter((i) => Math.abs(scores[i]!) > threshold);
}

/**
 * Winsorize an array: clip values beyond the p and (1-p) quantiles.
 * winsorize(arr, 0.05) clips at 5th and 95th percentiles.
 */
export function winsorize(arr: readonly number[], p: number): number[] {
  const lo = quantile(arr, p)!;
  const hi = quantile(arr, 1 - p)!;
  return arr.map((x) => Math.max(lo, Math.min(hi, x)));
}

/**
 * Root mean square error.
 */
export function rmse(actual: readonly number[], predicted: readonly number[]): number | null {
  if (actual.length !== predicted.length || actual.length === 0) return null;
  const mse = actual.reduce((acc, a, i) => acc + (a - predicted[i]!) ** 2, 0) / actual.length;
  return Math.sqrt(mse);
}

/**
 * Mean absolute error.
 */
export function mae(actual: readonly number[], predicted: readonly number[]): number | null {
  if (actual.length !== predicted.length || actual.length === 0) return null;
  return actual.reduce((acc, a, i) => acc + Math.abs(a - predicted[i]!), 0) / actual.length;
}
