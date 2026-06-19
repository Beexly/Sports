/**
 * Forecasting Analytics Library
 *
 * Pure TypeScript time-series forecasting utilities for the Galaxy Sports Edge
 * analytics layer. Zero external dependencies (Node built-ins / pure math only).
 * Every function is pure (no side effects) and avoids the `any` type.
 *
 * NOTE: This is the analytics-layer forecasting module. It is intentionally
 * self-contained and does NOT import lib/math/time-series.ts.
 *
 * NOTE: Forecasts are probabilistic estimates only. Nothing here claims a pick
 * or projection is guaranteed.
 *
 * `noUncheckedIndexedAccess` is enabled: every array index read uses a `?? 0`
 * fallback so the compiler-narrowed type is `number`, not `number | undefined`.
 */

// ---------------------------------------------------------------------------
// 1. Smoothing
// ---------------------------------------------------------------------------

/**
 * Simple moving average over a fixed window.
 * Returns an empty array if window <= 0 or window > data.length.
 * Output length = data.length - window + 1.
 */
export function simpleMovingAverage(data: number[], window: number): number[] {
  if (window <= 0 || window > data.length) return [];
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < window; i++) {
    sum += data[i] ?? 0;
  }
  result.push(sum / window);
  for (let i = window; i < data.length; i++) {
    sum += (data[i] ?? 0) - (data[i - window] ?? 0);
    result.push(sum / window);
  }
  return result;
}

/**
 * Weighted moving average. The weights array defines the window length; weights
 * are normalized internally. Returns empty if weights is empty, weights length
 * exceeds data length, or the weights sum to zero.
 */
export function weightedMovingAverage(data: number[], weights: number[]): number[] {
  const w = weights.length;
  if (w <= 0 || w > data.length) return [];
  let weightSum = 0;
  for (let i = 0; i < w; i++) {
    weightSum += weights[i] ?? 0;
  }
  if (weightSum === 0) return [];
  const result: number[] = [];
  for (let start = 0; start + w <= data.length; start++) {
    let acc = 0;
    for (let j = 0; j < w; j++) {
      acc += (data[start + j] ?? 0) * (weights[j] ?? 0);
    }
    result.push(acc / weightSum);
  }
  return result;
}

/**
 * Single exponential smoothing. alpha is clamped to [0, 1].
 * Output is the same length as the input; the first value is the seed.
 */
export function exponentialSmoothing(data: number[], alpha: number): number[] {
  if (data.length === 0) return [];
  const a = clamp01(alpha);
  const result: number[] = [];
  let prev = data[0] ?? 0;
  result.push(prev);
  for (let i = 1; i < data.length; i++) {
    const value = data[i] ?? 0;
    prev = a * value + (1 - a) * prev;
    result.push(prev);
  }
  return result;
}

/**
 * Double exponential smoothing (Holt's linear method): level + trend.
 * Returns the smoothed (level + trend) series, same length as the input.
 * alpha and beta are clamped to [0, 1].
 */
export function doubleExponentialSmoothing(
  data: number[],
  alpha: number,
  beta: number,
): number[] {
  if (data.length === 0) return [];
  const a = clamp01(alpha);
  const b = clamp01(beta);
  const result: number[] = [];
  let level = data[0] ?? 0;
  let trend = data.length > 1 ? (data[1] ?? 0) - (data[0] ?? 0) : 0;
  result.push(level);
  for (let i = 1; i < data.length; i++) {
    const value = data[i] ?? 0;
    const prevLevel = level;
    level = a * value + (1 - a) * (prevLevel + trend);
    trend = b * (level - prevLevel) + (1 - b) * trend;
    result.push(level + trend);
  }
  return result;
}

/**
 * Cumulative moving average. result[i] = mean(data[0..i]).
 * Same length as the input.
 */
export function cumulativeMovingAverage(data: number[]): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] ?? 0;
    result.push(sum / (i + 1));
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. Forecast generation
// ---------------------------------------------------------------------------

/**
 * Single-step exponential-smoothing forecast.
 * Returns NaN for an empty input. Default alpha = 0.3.
 */
export function forecastNext(data: number[], alpha = 0.3): number {
  if (data.length === 0) return NaN;
  const smoothed = exponentialSmoothing(data, alpha);
  return smoothed[smoothed.length - 1] ?? NaN;
}

/**
 * Ordinary-least-squares linear-trend forecast.
 * Fits y = slope * x + intercept (x = index) and projects stepsAhead steps
 * forward. Returns empty if data is empty or stepsAhead <= 0.
 */
export function linearTrendForecast(data: number[], stepsAhead: number): number[] {
  if (data.length === 0 || stepsAhead <= 0) return [];
  const { slope, intercept } = linearRegression(data);
  const result: number[] = [];
  for (let h = 1; h <= stepsAhead; h++) {
    const x = data.length - 1 + h;
    result.push(slope * x + intercept);
  }
  return result;
}

/**
 * Holt's linear method forecast. Smooths the series, then projects the final
 * level + h * trend for each horizon step. alpha/beta clamped to [0, 1].
 * Returns empty if data is empty or stepsAhead <= 0.
 */
export function holtForecast(
  data: number[],
  alpha: number,
  beta: number,
  stepsAhead: number,
): number[] {
  if (data.length === 0 || stepsAhead <= 0) return [];
  const a = clamp01(alpha);
  const b = clamp01(beta);
  let level = data[0] ?? 0;
  let trend = data.length > 1 ? (data[1] ?? 0) - (data[0] ?? 0) : 0;
  for (let i = 1; i < data.length; i++) {
    const value = data[i] ?? 0;
    const prevLevel = level;
    level = a * value + (1 - a) * (prevLevel + trend);
    trend = b * (level - prevLevel) + (1 - b) * trend;
  }
  const result: number[] = [];
  for (let h = 1; h <= stepsAhead; h++) {
    result.push(level + h * trend);
  }
  return result;
}

/**
 * Naive forecast: repeat the last observed value stepsAhead times.
 * Returns empty if data is empty or stepsAhead <= 0.
 */
export function naiveForecast(data: number[], stepsAhead: number): number[] {
  if (data.length === 0 || stepsAhead <= 0) return [];
  const last = data[data.length - 1] ?? 0;
  return new Array<number>(stepsAhead).fill(last);
}

/**
 * Drift forecast: extends from the last value using the average per-step drift
 * of the historical series ((last - first) / (n - 1)).
 * Returns empty if data is empty or stepsAhead <= 0.
 */
export function driftForecast(data: number[], stepsAhead: number): number[] {
  if (data.length === 0 || stepsAhead <= 0) return [];
  const n = data.length;
  const last = data[n - 1] ?? 0;
  const first = data[0] ?? 0;
  const drift = n > 1 ? (last - first) / (n - 1) : 0;
  const result: number[] = [];
  for (let h = 1; h <= stepsAhead; h++) {
    result.push(last + drift * h);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. Seasonality
// ---------------------------------------------------------------------------

/**
 * Seasonal indices via the ratio-to-moving-average method.
 * Returns an array of length `period` where each entry is the average ratio of
 * the observation to the centered-window average for that season slot.
 * Indices are normalized so they average to ~1.
 * Returns empty if period <= 0 or data.length < period.
 */
export function seasonalIndices(data: number[], period: number): number[] {
  if (period <= 0 || data.length < period) return [];
  const ma = simpleMovingAverage(data, period);
  // The moving average aligns to the right edge of each window; offset by
  // period-1 so ratios line up with the original observations.
  const offset = period - 1;
  const ratioSums = new Array<number>(period).fill(0);
  const ratioCounts = new Array<number>(period).fill(0);
  for (let i = 0; i < ma.length; i++) {
    const avg = ma[i] ?? 0;
    if (avg === 0) continue;
    const dataIndex = i + offset;
    const value = data[dataIndex] ?? 0;
    const slot = dataIndex % period;
    ratioSums[slot] = (ratioSums[slot] ?? 0) + value / avg;
    ratioCounts[slot] = (ratioCounts[slot] ?? 0) + 1;
  }
  const indices: number[] = [];
  for (let s = 0; s < period; s++) {
    const count = ratioCounts[s] ?? 0;
    indices.push(count > 0 ? (ratioSums[s] ?? 0) / count : 1);
  }
  // Normalize so the average index is 1.
  const mean = average(indices);
  if (mean === 0) return indices;
  return indices.map((v) => v / mean);
}

/**
 * Deseasonalize: divide each observation by its seasonal index.
 * Returns the original data if seasonal indices cannot be computed.
 */
export function deseasonalize(data: number[], period: number): number[] {
  const indices = seasonalIndices(data, period);
  if (indices.length === 0) return data.slice();
  return data.map((value, i) => {
    const idx = indices[i % period] ?? 1;
    return idx === 0 ? value : value / idx;
  });
}

/**
 * Seasonal naive forecast: repeat the last full season cycle forward.
 * Returns empty if period <= 0, stepsAhead <= 0, or data.length < period.
 */
export function seasonalNaiveForecast(
  data: number[],
  period: number,
  stepsAhead: number,
): number[] {
  if (period <= 0 || stepsAhead <= 0 || data.length < period) return [];
  const lastSeason: number[] = [];
  for (let i = data.length - period; i < data.length; i++) {
    lastSeason.push(data[i] ?? 0);
  }
  const result: number[] = [];
  for (let h = 0; h < stepsAhead; h++) {
    result.push(lastSeason[h % period] ?? 0);
  }
  return result;
}

/**
 * Seasonality strength in [0, 1] via variance decomposition.
 * Compares the variance of the deseasonalized residual against the variance of
 * the detrended series: strength = max(0, 1 - Var(residual)/Var(detrended)).
 * Returns 0 if it cannot be computed.
 */
export function detectSeasonalityStrength(data: number[], period: number): number {
  if (period <= 0 || data.length < period * 2) return 0;
  const detrended = detrend(data);
  const detrendedVar = variance(detrended);
  if (detrendedVar === 0) return 0;
  // Estimate the seasonal component from the detrended series.
  const seasonalSums = new Array<number>(period).fill(0);
  const seasonalCounts = new Array<number>(period).fill(0);
  for (let i = 0; i < detrended.length; i++) {
    const slot = i % period;
    seasonalSums[slot] = (seasonalSums[slot] ?? 0) + (detrended[i] ?? 0);
    seasonalCounts[slot] = (seasonalCounts[slot] ?? 0) + 1;
  }
  const seasonal: number[] = [];
  for (let s = 0; s < period; s++) {
    const count = seasonalCounts[s] ?? 0;
    seasonal.push(count > 0 ? (seasonalSums[s] ?? 0) / count : 0);
  }
  const residual = detrended.map((v, i) => v - (seasonal[i % period] ?? 0));
  const residualVar = variance(residual);
  const strength = 1 - residualVar / detrendedVar;
  return clamp01(strength);
}

// ---------------------------------------------------------------------------
// 4. Accuracy metrics
// ---------------------------------------------------------------------------

/**
 * Mean absolute error. Returns 0 for two empty arrays, NaN if lengths mismatch.
 */
export function meanAbsoluteError(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return NaN;
  if (actual.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += Math.abs((actual[i] ?? 0) - (predicted[i] ?? 0));
  }
  return sum / actual.length;
}

/**
 * Mean squared error. Returns 0 for two empty arrays, NaN if lengths mismatch.
 */
export function meanSquaredError(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return NaN;
  if (actual.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    const diff = (actual[i] ?? 0) - (predicted[i] ?? 0);
    sum += diff * diff;
  }
  return sum / actual.length;
}

/**
 * Root mean squared error. Returns 0 for two empty arrays, NaN if mismatch.
 */
export function rootMeanSquaredError(actual: number[], predicted: number[]): number {
  const mse = meanSquaredError(actual, predicted);
  return Number.isNaN(mse) ? NaN : Math.sqrt(mse);
}

/**
 * Mean absolute percentage error (as a percentage, 0–100+).
 * Skips observations where the actual value is zero. Returns 0 for empty,
 * NaN if lengths mismatch, and 0 if every actual is zero.
 */
export function meanAbsolutePercentageError(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return NaN;
  if (actual.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i] ?? 0;
    if (a === 0) continue;
    sum += Math.abs((a - (predicted[i] ?? 0)) / a);
    count++;
  }
  if (count === 0) return 0;
  return (sum / count) * 100;
}

/**
 * Symmetric MAPE (as a percentage). Uses |a|+|p| in the denominator and skips
 * points where that denominator is zero. Returns 0 for empty, NaN if mismatch.
 */
export function symmetricMape(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return NaN;
  if (actual.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i] ?? 0;
    const p = predicted[i] ?? 0;
    const denom = Math.abs(a) + Math.abs(p);
    if (denom === 0) continue;
    sum += Math.abs(a - p) / denom;
    count++;
  }
  if (count === 0) return 0;
  return (sum / count) * 100;
}

/**
 * Forecast bias = mean(actual - predicted). Positive means under-forecasting.
 * Returns 0 for empty, NaN if lengths mismatch.
 */
export function forecastBias(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return NaN;
  if (actual.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += (actual[i] ?? 0) - (predicted[i] ?? 0);
  }
  return sum / actual.length;
}

// ---------------------------------------------------------------------------
// 5. Trend & decomposition
// ---------------------------------------------------------------------------

/**
 * Ordinary-least-squares linear regression with x = index (0, 1, 2, ...).
 * Returns slope = 0, intercept = first value (or 0) when data.length < 2.
 */
export function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: data[0] ?? 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const y = data[i] ?? 0;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Trend strength = R² (coefficient of determination) of the linear fit.
 * In [0, 1]. Returns 0 if data.length < 2 or total variance is 0.
 */
export function trendStrength(data: number[]): number {
  const n = data.length;
  if (n < 2) return 0;
  const { slope, intercept } = linearRegression(data);
  const mean = average(data);
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = data[i] ?? 0;
    const fitted = slope * i + intercept;
    ssTot += (y - mean) * (y - mean);
    ssRes += (y - fitted) * (y - fitted);
  }
  if (ssTot === 0) return 0;
  const r2 = 1 - ssRes / ssTot;
  return clamp01(r2);
}

/**
 * Detrend: residuals after removing the linear (OLS) fit. Same length as input.
 */
export function detrend(data: number[]): number[] {
  if (data.length === 0) return [];
  const { slope, intercept } = linearRegression(data);
  return data.map((y, i) => y - (slope * i + intercept));
}

/**
 * Average growth rate (CAGR-style) over the series:
 * (last / first)^(1/(n-1)) - 1.
 * Returns 0 if data.length < 2, the first value is 0, or the ratio is negative.
 */
export function growthRate(data: number[]): number {
  const n = data.length;
  if (n < 2) return 0;
  const first = data[0] ?? 0;
  const last = data[n - 1] ?? 0;
  if (first === 0) return 0;
  const ratio = last / first;
  if (ratio <= 0) return 0;
  return Math.pow(ratio, 1 / (n - 1)) - 1;
}

/**
 * Classical additive decomposition into trend, seasonal, and residual parts.
 * Each output array is the same length as the input.
 * - trend: the OLS linear fit
 * - seasonal: average of (data - trend) per season slot, mean-centered
 * - residual: data - trend - seasonal
 * If period <= 0 or data.length < period, the seasonal component is all zeros.
 */
export function decompose(
  data: number[],
  period: number,
): { trend: number[]; seasonal: number[]; residual: number[] } {
  const n = data.length;
  const { slope, intercept } = linearRegression(data);
  const trend = data.map((_, i) => slope * i + intercept);
  const seasonal = new Array<number>(n).fill(0);
  if (period > 0 && n >= period) {
    const sums = new Array<number>(period).fill(0);
    const counts = new Array<number>(period).fill(0);
    for (let i = 0; i < n; i++) {
      const slot = i % period;
      sums[slot] = (sums[slot] ?? 0) + ((data[i] ?? 0) - (trend[i] ?? 0));
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
    const slotAvg: number[] = [];
    for (let s = 0; s < period; s++) {
      const count = counts[s] ?? 0;
      slotAvg.push(count > 0 ? (sums[s] ?? 0) / count : 0);
    }
    // Center the seasonal component so it sums to ~0.
    const meanSeasonal = average(slotAvg);
    for (let i = 0; i < n; i++) {
      seasonal[i] = (slotAvg[i % period] ?? 0) - meanSeasonal;
    }
  }
  const residual = data.map((y, i) => y - (trend[i] ?? 0) - (seasonal[i] ?? 0));
  return { trend, seasonal, residual };
}

// ---------------------------------------------------------------------------
// 6. Confidence & intervals
// ---------------------------------------------------------------------------

/**
 * Symmetric confidence interval around a point forecast.
 * Default z = 1.96 (~95%). The half-width is z * residualStdDev.
 */
export function forecastConfidenceInterval(
  forecast: number,
  residualStdDev: number,
  z = 1.96,
): { lower: number; upper: number } {
  const halfWidth = z * Math.abs(residualStdDev);
  return { lower: forecast - halfWidth, upper: forecast + halfWidth };
}

/**
 * Standard deviation of forecast residuals (actual - predicted), using the
 * sample standard deviation (n - 1 denominator). Returns 0 for empty/length-1
 * inputs, NaN if lengths mismatch.
 */
export function residualStandardDeviation(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return NaN;
  const n = actual.length;
  if (n < 2) return 0;
  const errors: number[] = [];
  for (let i = 0; i < n; i++) {
    errors.push((actual[i] ?? 0) - (predicted[i] ?? 0));
  }
  const mean = average(errors);
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = (errors[i] ?? 0) - mean;
    ss += d * d;
  }
  return Math.sqrt(ss / (n - 1));
}

/**
 * Prediction interval half-width that widens with the forecast horizon:
 * z * residualStdDev * sqrt(stepsAhead). Returns 0 if stepsAhead <= 0.
 */
export function predictionIntervalWidth(
  residualStdDev: number,
  stepsAhead: number,
  z = 1.96,
): number {
  if (stepsAhead <= 0) return 0;
  return z * Math.abs(residualStdDev) * Math.sqrt(stepsAhead);
}

// ---------------------------------------------------------------------------
// 7. Model selection & sports usage
// ---------------------------------------------------------------------------

/**
 * Backtest naive / drift / linear / exponential on a holdout window (the final
 * `holdout` points) and return the method with the lowest RMSE.
 * Falls back to 'naive' if there is insufficient data to backtest.
 */
export function bestForecastMethod(
  data: number[],
  holdout: number,
): 'naive' | 'drift' | 'linear' | 'exponential' {
  if (holdout <= 0 || holdout >= data.length || data.length - holdout < 2) {
    return 'naive';
  }
  const train = data.slice(0, data.length - holdout);
  const test = data.slice(data.length - holdout);

  const candidates: { name: 'naive' | 'drift' | 'linear' | 'exponential'; forecast: number[] }[] = [
    { name: 'naive', forecast: naiveForecast(train, holdout) },
    { name: 'drift', forecast: driftForecast(train, holdout) },
    { name: 'linear', forecast: linearTrendForecast(train, holdout) },
    { name: 'exponential', forecast: exponentialForecastHorizon(train, 0.3, holdout) },
  ];

  let best: 'naive' | 'drift' | 'linear' | 'exponential' = 'naive';
  let bestRmse = Infinity;
  for (const candidate of candidates) {
    const rmse = rootMeanSquaredError(test, candidate.forecast);
    if (!Number.isNaN(rmse) && rmse < bestRmse) {
      bestRmse = rmse;
      best = candidate.name;
    }
  }
  return best;
}

/**
 * Sample autocorrelation at a given lag, in [-1, 1].
 * Returns 0 if lag <= 0, lag >= data.length, or the series has zero variance.
 */
export function autocorrelation(data: number[], lag: number): number {
  const n = data.length;
  if (lag <= 0 || lag >= n) return 0;
  const mean = average(data);
  let denom = 0;
  for (let i = 0; i < n; i++) {
    const d = (data[i] ?? 0) - mean;
    denom += d * d;
  }
  if (denom === 0) return 0;
  let num = 0;
  for (let i = lag; i < n; i++) {
    num += ((data[i] ?? 0) - mean) * ((data[i - lag] ?? 0) - mean);
  }
  const r = num / denom;
  // Numerical clamp into [-1, 1].
  if (r > 1) return 1;
  if (r < -1) return -1;
  return r;
}

/**
 * Momentum score: (last short-window MA) - (last long-window MA).
 * Positive indicates upward momentum, negative downward.
 * Returns 0 if either window cannot be computed.
 */
export function momentumScore(
  data: number[],
  shortWindow: number,
  longWindow: number,
): number {
  const shortMa = simpleMovingAverage(data, shortWindow);
  const longMa = simpleMovingAverage(data, longWindow);
  if (shortMa.length === 0 || longMa.length === 0) return 0;
  const lastShort = shortMa[shortMa.length - 1] ?? 0;
  const lastLong = longMa[longMa.length - 1] ?? 0;
  return lastShort - lastLong;
}

/**
 * Project subscriber growth `monthsAhead` months forward.
 * Uses a linear-trend forecast when the history shows a clear trend
 * (R² >= 0.5), otherwise falls back to a drift forecast.
 * Returns empty if history is empty or monthsAhead <= 0.
 */
export function projectSubscriberGrowth(history: number[], monthsAhead: number): number[] {
  if (history.length === 0 || monthsAhead <= 0) return [];
  if (history.length < 2) {
    return naiveForecast(history, monthsAhead);
  }
  const strength = trendStrength(history);
  const projection =
    strength >= 0.5
      ? linearTrendForecast(history, monthsAhead)
      : driftForecast(history, monthsAhead);
  // Subscriber counts cannot go negative.
  return projection.map((v) => (v < 0 ? 0 : v));
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported as part of the public forecasting surface,
// but exported for testability and reuse within the analytics layer).
// ---------------------------------------------------------------------------

/** Clamp a value into [0, 1]. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Arithmetic mean. Returns 0 for an empty array. */
export function average(data: number[]): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] ?? 0;
  }
  return sum / data.length;
}

/** Population variance. Returns 0 for arrays of length < 1. */
export function variance(data: number[]): number {
  const n = data.length;
  if (n === 0) return 0;
  const mean = average(data);
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = (data[i] ?? 0) - mean;
    ss += d * d;
  }
  return ss / n;
}

/**
 * Horizon forecast from exponential smoothing: the last smoothed level repeated
 * stepsAhead times. Used internally by bestForecastMethod.
 */
export function exponentialForecastHorizon(
  data: number[],
  alpha: number,
  stepsAhead: number,
): number[] {
  if (data.length === 0 || stepsAhead <= 0) return [];
  const next = forecastNext(data, alpha);
  return new Array<number>(stepsAhead).fill(Number.isNaN(next) ? 0 : next);
}
