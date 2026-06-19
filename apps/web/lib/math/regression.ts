/**
 * Regression and moving average utilities — pure math, zero dependencies.
 *
 * Linear regression (OLS), moving averages (SMA/EMA/WMA/DEMA/TEMA),
 * polynomial fit, trend detection, and time-series helpers for
 * sports performance analytics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinearModel {
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number; // coefficient of determination
  readonly rmse: number; // root mean squared error
  readonly mae: number; // mean absolute error
  readonly n: number; // number of data points
}

export interface PolynomialModel {
  readonly coefficients: readonly number[]; // [a0, a1, a2, ...] for a0 + a1*x + a2*x^2 + ...
  readonly degree: number;
  readonly r2: number;
  readonly n: number;
}

export interface TrendResult {
  readonly direction: "up" | "down" | "flat";
  readonly strength: number; // [0, 1] — how strong the trend is (|slope| relative to mean)
  readonly slope: number;
  readonly r2: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _mean(data: readonly number[]): number {
  if (data.length === 0) return 0;
  let s = 0;
  for (const v of data) s += v;
  return s / data.length;
}

function _sum(data: readonly number[]): number {
  let s = 0;
  for (const v of data) s += v;
  return s;
}

// ---------------------------------------------------------------------------
// Linear regression (OLS)
// ---------------------------------------------------------------------------

/**
 * Ordinary least squares linear regression: y = slope * x + intercept.
 * Throws if arrays are different lengths or contain fewer than 2 points.
 */
export function linearRegression(
  xs: readonly number[],
  ys: readonly number[]
): LinearModel {
  if (xs.length !== ys.length) {
    throw new Error(
      `linearRegression: xs.length (${xs.length}) !== ys.length (${ys.length})`
    );
  }
  const n = xs.length;
  if (n < 2) {
    throw new Error(`linearRegression: need at least 2 data points, got ${n}`);
  }

  const xMean = _mean(xs);
  const yMean = _mean(ys);

  let ssXX = 0;
  let ssXY = 0;
  for (let i = 0; i < n; i++) {
    ssXX += (xs[i] - xMean) ** 2;
    ssXY += (xs[i] - xMean) * (ys[i] - yMean);
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  // Build predictions array for metrics
  const predictions = xs.map((x) => slope * x + intercept);

  return {
    slope,
    intercept,
    r2: rSquared(ys, predictions),
    rmse: rmse(ys, predictions),
    mae: mae(ys, predictions),
    n,
  };
}

// ---------------------------------------------------------------------------
// Prediction helpers
// ---------------------------------------------------------------------------

/** Evaluate a linear model at x. */
export function predict(model: LinearModel, x: number): number {
  return model.slope * x + model.intercept;
}

/** Evaluate a polynomial model at x. */
export function predictPoly(model: PolynomialModel, x: number): number {
  let result = 0;
  for (let i = 0; i < model.coefficients.length; i++) {
    result += model.coefficients[i] * x ** i;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Moving averages
// ---------------------------------------------------------------------------

/**
 * Simple Moving Average.
 * Output length = data.length - window + 1.
 * Returns [] if data.length < window.
 */
export function sma(data: readonly number[], window: number): number[] {
  if (window <= 0) throw new Error("sma: window must be > 0");
  if (data.length < window) return [];

  const result: number[] = [];
  let windowSum = 0;

  for (let i = 0; i < window; i++) {
    windowSum += data[i];
  }
  result.push(windowSum / window);

  for (let i = window; i < data.length; i++) {
    windowSum += data[i] - data[i - window];
    result.push(windowSum / window);
  }
  return result;
}

/**
 * Exponential Moving Average.
 * alpha in [0, 1]; typical: alpha = 2 / (period + 1).
 * Seeded with data[0]. Same length as input.
 */
export function ema(data: readonly number[], alpha: number): number[] {
  if (data.length === 0) return [];
  if (alpha < 0 || alpha > 1) {
    throw new Error("ema: alpha must be in [0, 1]");
  }
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Weighted Moving Average. Weights = [1, 2, 3, ..., window] (higher = more recent).
 * Output length = data.length - window + 1.
 */
export function wma(data: readonly number[], window: number): number[] {
  if (window <= 0) throw new Error("wma: window must be > 0");
  if (data.length < window) return [];

  // denominator = sum of weights = window*(window+1)/2
  const denom = (window * (window + 1)) / 2;

  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < window; j++) {
      weightedSum += (j + 1) * data[i - window + 1 + j];
    }
    result.push(weightedSum / denom);
  }
  return result;
}

/**
 * Double Exponential Moving Average: 2 * EMA(data) - EMA(EMA(data)).
 * Reduces lag versus a single EMA.
 */
export function dema(data: readonly number[], alpha: number): number[] {
  if (data.length === 0) return [];
  const e1 = ema(data, alpha);
  const e2 = ema(e1, alpha);
  return e1.map((v, i) => 2 * v - e2[i]);
}

// ---------------------------------------------------------------------------
// Rolling window functions
// ---------------------------------------------------------------------------

/**
 * Rolling minimum over each window of size `window`.
 * Output length = data.length - window + 1.
 */
export function rollingMin(data: readonly number[], window: number): number[] {
  if (window <= 0) throw new Error("rollingMin: window must be > 0");
  if (data.length < window) return [];

  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    let min = data[i - window + 1];
    for (let j = i - window + 2; j <= i; j++) {
      if (data[j] < min) min = data[j];
    }
    result.push(min);
  }
  return result;
}

/**
 * Rolling maximum over each window of size `window`.
 * Output length = data.length - window + 1.
 */
export function rollingMax(data: readonly number[], window: number): number[] {
  if (window <= 0) throw new Error("rollingMax: window must be > 0");
  if (data.length < window) return [];

  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    let max = data[i - window + 1];
    for (let j = i - window + 2; j <= i; j++) {
      if (data[j] > max) max = data[j];
    }
    result.push(max);
  }
  return result;
}

/**
 * Rolling population standard deviation over each window.
 * Output length = data.length - window + 1.
 */
export function rollingStdDev(data: readonly number[], window: number): number[] {
  if (window <= 0) throw new Error("rollingStdDev: window must be > 0");
  if (data.length < window) return [];

  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    const slice = data.slice(i - window + 1, i + 1);
    const m = _mean(slice);
    const variance =
      slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / slice.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Trend detection
// ---------------------------------------------------------------------------

/**
 * Detect trend direction and strength from a time series.
 * Fits OLS regression over index-based x values.
 */
export function detectTrend(data: readonly number[]): TrendResult {
  if (data.length < 2) {
    return { direction: "flat", strength: 0, slope: 0, r2: 0 };
  }

  const xs = data.map((_, i) => i);
  const model = linearRegression(xs, data);

  const absMean =
    _mean(data.map((v) => Math.abs(v))) || Number.EPSILON;
  const threshold = 0.01 * absMean;
  const epsilon = 1e-10;

  const strength = Math.min(1, Math.abs(model.slope) / (absMean + epsilon));

  let direction: "up" | "down" | "flat";
  if (model.slope > threshold) {
    direction = "up";
  } else if (model.slope < -threshold) {
    direction = "down";
  } else {
    direction = "flat";
  }

  return { direction, strength, slope: model.slope, r2: model.r2 };
}

// ---------------------------------------------------------------------------
// Error / fit metrics
// ---------------------------------------------------------------------------

/**
 * Coefficient of determination R².
 * R² = 1 - SS_res / SS_tot.
 */
export function rSquared(
  ys: readonly number[],
  predictions: readonly number[]
): number {
  if (ys.length !== predictions.length) {
    throw new Error("rSquared: ys and predictions must have the same length");
  }
  const yMean = _mean(ys);
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < ys.length; i++) {
    ssTot += (ys[i] - yMean) ** 2;
    ssRes += (ys[i] - predictions[i]) ** 2;
  }
  if (ssTot === 0) return 1; // all y values identical — perfect fit (trivially)
  return 1 - ssRes / ssTot;
}

/**
 * Root mean squared error.
 */
export function rmse(
  ys: readonly number[],
  predictions: readonly number[]
): number {
  if (ys.length !== predictions.length) {
    throw new Error("rmse: ys and predictions must have the same length");
  }
  const ssRes = ys.reduce((acc, y, i) => acc + (y - predictions[i]) ** 2, 0);
  return Math.sqrt(ssRes / ys.length);
}

/**
 * Mean absolute error.
 */
export function mae(
  ys: readonly number[],
  predictions: readonly number[]
): number {
  if (ys.length !== predictions.length) {
    throw new Error("mae: ys and predictions must have the same length");
  }
  return ys.reduce((acc, y, i) => acc + Math.abs(y - predictions[i]), 0) / ys.length;
}

// ---------------------------------------------------------------------------
// Correlation & normalization
// ---------------------------------------------------------------------------

/**
 * Pearson correlation coefficient [-1, 1].
 * Returns NaN if either series has zero standard deviation.
 */
export function pearsonCorrelation(
  xs: readonly number[],
  ys: readonly number[]
): number {
  if (xs.length !== ys.length) {
    throw new Error(
      "pearsonCorrelation: xs and ys must have the same length"
    );
  }
  const n = xs.length;
  if (n === 0) return NaN;

  const xMean = _mean(xs);
  const yMean = _mean(ys);

  let num = 0;
  let xSS = 0;
  let ySS = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    const dy = ys[i] - yMean;
    num += dx * dy;
    xSS += dx ** 2;
    ySS += dy ** 2;
  }

  const denom = Math.sqrt(xSS * ySS);
  if (denom === 0) return NaN;
  return num / denom;
}

/**
 * Z-score: (value - mean) / stdDev.
 * Returns 0 if stdDev = 0.
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Min-max normalization to [0, 1].
 * Returns all 0s if all values are the same.
 */
export function normalize(data: readonly number[]): number[] {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  if (range === 0) return data.map(() => 0);
  return data.map((v) => (v - min) / range);
}

/**
 * Z-score standardization: (x - mean) / stdDev.
 * Returns all 0s if stdDev = 0.
 */
export function standardize(data: readonly number[]): number[] {
  if (data.length === 0) return [];
  const m = _mean(data);
  const variance = data.reduce((acc, v) => acc + (v - m) ** 2, 0) / data.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return data.map(() => 0);
  return data.map((v) => (v - m) / sd);
}

// ---------------------------------------------------------------------------
// Bollinger Bands
// ---------------------------------------------------------------------------

/**
 * Bollinger Bands.
 * Middle = SMA(data, window); Upper/Lower = middle ± multiplier * rollingStdDev.
 * Output length = data.length - window + 1.
 */
export function bollingerBands(
  data: readonly number[],
  window: number,
  multiplier = 2
): Array<{ upper: number; middle: number; lower: number }> {
  const middles = sma(data, window);
  const stdDevs = rollingStdDev(data, window);

  return middles.map((middle, i) => ({
    upper: middle + multiplier * stdDevs[i],
    middle,
    lower: middle - multiplier * stdDevs[i],
  }));
}

// ---------------------------------------------------------------------------
// Smoothing
// ---------------------------------------------------------------------------

/**
 * Exponential smoothing (same as EMA but with an explicit name).
 * alpha is the smoothing factor. Returns same length as data.
 */
export function exponentialSmoothing(
  data: readonly number[],
  alpha: number
): number[] {
  return ema(data, alpha);
}

// ---------------------------------------------------------------------------
// RSI
// ---------------------------------------------------------------------------

/**
 * Relative Strength Index (0–100).
 * Uses Wilder's smoothed moving average.
 * Output length = data.length - period.
 */
export function rsi(data: readonly number[], period = 14): number[] {
  if (data.length <= period) return [];

  // Compute price differences
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  // Initial average gain/loss over first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const result: number[] = [];

  // First RSI value uses the simple averages
  const firstRS = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRS));

  // Subsequent values use Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Time-series helpers
// ---------------------------------------------------------------------------

/**
 * Cumulative sum.
 */
export function cumsum(data: readonly number[]): number[] {
  const result: number[] = [];
  let acc = 0;
  for (const v of data) {
    acc += v;
    result.push(acc);
  }
  return result;
}

/**
 * First difference at given lag: data[i] - data[i - lag].
 * Output length = data.length - lag.
 */
export function diff(data: readonly number[], lag = 1): number[] {
  if (lag <= 0) throw new Error("diff: lag must be > 0");
  if (data.length <= lag) return [];
  const result: number[] = [];
  for (let i = lag; i < data.length; i++) {
    result.push(data[i] - data[i - lag]);
  }
  return result;
}

/**
 * Autocorrelation at given lag.
 * Pearson correlation of series with itself shifted by lag.
 */
export function autocorrelation(data: readonly number[], lag: number): number {
  if (lag <= 0) throw new Error("autocorrelation: lag must be > 0");
  if (data.length <= lag) return NaN;
  const xs = data.slice(0, data.length - lag);
  const ys = data.slice(lag);
  return pearsonCorrelation(xs, ys);
}
