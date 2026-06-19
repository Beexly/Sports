/**
 * Time-series analysis utilities — pure TypeScript, zero dependencies.
 *
 * Provides higher-level forecasting: decomposition, Holt-Winters, ARIMA-lite,
 * seasonal naive, AR(1), linear extrapolation, anomaly detection, change points,
 * and accuracy metrics. Does NOT re-import signal-processing.ts.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DecompositionResult {
  trend: number[];     // trend component (same length as input)
  seasonal: number[];  // seasonal component (full length)
  residual: number[];  // remainder = original - trend - seasonal
  period: number;      // detected or provided period
}

export interface ForecastResult {
  forecast: number[];    // forecast values for next n steps
  lowerBound: number[];  // 80% prediction interval lower bound
  upperBound: number[];  // 80% prediction interval upper bound
  method: string;        // e.g. 'HoltWinters', 'LinearTrend', 'Naive'
}

export interface ArimaLiteParams {
  p: number; // AR order (0, 1, or 2)
  d: number; // differencing order (0 or 1)
  q: number; // MA order (0 or 1)
}

export interface SeasonalityTest {
  hasSeasionality: boolean; // Note: intentional typo from spec
  period: number | null;
  strength: number;    // 0-1; variance of seasonal / total variance
  confidence: number;  // 0-1
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Sum of array. */
function _sum(arr: number[]): number {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

/** Population mean. */
function _mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return _sum(arr) / arr.length;
}

/** Population variance. */
function _variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = _mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return s / arr.length;
}

/** Population standard deviation. */
function _std(arr: number[]): number {
  return Math.sqrt(_variance(arr));
}

/**
 * Simple moving average (trailing).
 * Result[i] is the average of values[i-window+1..i] for i >= window-1, else NaN.
 */
function sma(values: number[], window: number): number[] {
  const n = values.length;
  const result: number[] = new Array(n).fill(NaN);
  if (window <= 0 || window > n) return result;
  for (let i = window - 1; i < n; i++) {
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += values[j]!;
    result[i] = s / window;
  }
  return result;
}

// ─── Trend ────────────────────────────────────────────────────────────────────

/**
 * Trend detection via centered moving average.
 *
 * For even period, uses (period+1) to maintain symmetry so the center point
 * aligns with an actual data index. CMA at index i averages values centered
 * on i over `window` values. Edge positions (first/last floor(period/2) items)
 * are extrapolated from the nearest available CMA value.
 */
export function trendComponent(values: number[], period: number): number[] {
  const n = values.length;
  const window = period % 2 === 0 ? period + 1 : period;
  const half = Math.floor(window / 2);
  const trend: number[] = new Array(n).fill(NaN);

  // Compute centered moving average for the interior
  for (let i = half; i < n - half; i++) {
    let s = 0;
    for (let j = i - half; j <= i + half; j++) s += values[j]!;
    trend[i] = s / window;
  }

  // Fill left edge with nearest available CMA value
  if (half > 0 && !isNaN(trend[half]!)) {
    for (let i = 0; i < half; i++) trend[i] = trend[half]!;
  }
  // Fill right edge
  const rightStart = n - half;
  if (rightStart < n && !isNaN(trend[rightStart - 1]!)) {
    for (let i = rightStart; i < n; i++) trend[i] = trend[rightStart - 1]!;
  }

  return trend;
}

// ─── Seasonal indices ─────────────────────────────────────────────────────────

/**
 * Seasonal indices via classical additive decomposition.
 * Returns array of length `period` (the recurring pattern) summing to 0.
 */
export function seasonalIndices(values: number[], period: number): number[] {
  const n = values.length;
  const trend = trendComponent(values, period);

  // Detrended = original - trend
  const detrended: number[] = values.map((v, i) => v - trend[i]!);

  // Average detrended values by position within period
  const buckets: number[][] = Array.from({ length: period }, () => []);
  for (let i = 0; i < n; i++) {
    const pos = i % period;
    if (isFinite(detrended[i]!)) {
      buckets[pos]!.push(detrended[i]!);
    }
  }

  const raw: number[] = buckets.map((b) => (b.length > 0 ? _mean(b) : 0));

  // Adjust so indices sum to 0
  const adj = _mean(raw);
  return raw.map((v) => v - adj);
}

// ─── Decomposition ────────────────────────────────────────────────────────────

/**
 * Full STL-like additive decomposition.
 * trend = trendComponent; seasonal = seasonalIndices repeated; residual = original - trend - seasonal.
 */
export function decompose(values: number[], period: number): DecompositionResult {
  const n = values.length;
  const trend = trendComponent(values, period);
  const indices = seasonalIndices(values, period);

  const seasonal: number[] = new Array(n);
  for (let i = 0; i < n; i++) seasonal[i] = indices[i % period]!;

  const residual: number[] = new Array(n);
  for (let i = 0; i < n; i++) residual[i] = values[i]! - trend[i]! - seasonal[i]!;

  return { trend, seasonal, residual, period };
}

// ─── Period detection ─────────────────────────────────────────────────────────

/**
 * Pearson autocorrelation at lag k.
 * corr(values[lag:], values[:-lag])
 */
export function autocorrAtLag(values: number[], lag: number): number {
  if (lag === 0) return 1.0;
  const n = values.length;
  if (lag >= n) return 0;

  const a = values.slice(lag);       // values[lag:]
  const b = values.slice(0, n - lag); // values[:-lag]

  const ma = _mean(a);
  const mb = _mean(b);
  const sa = _std(a);
  const sb = _std(b);

  if (sa === 0 || sb === 0) return 0;

  let cov = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i]! - ma) * (b[i]! - mb);
  }
  cov /= a.length;
  return cov / (sa * sb);
}

/**
 * Detect seasonality period (try periods 2..maxPeriod).
 * Finds period with highest autocorrelation.
 * strength: variance of seasonal / variance of original (0-1)
 * confidence: normalized autocorrelation at detected lag (0-1)
 * hasSeasionality: strength > 0.2 AND confidence > 0.3
 */
export function detectPeriod(
  values: number[],
  maxPeriod?: number
): SeasonalityTest {
  const n = values.length;
  const maxP = maxPeriod !== undefined ? maxPeriod : Math.floor(n / 2);

  if (maxP < 2 || n < 4) {
    return { hasSeasionality: false, period: null, strength: 0, confidence: 0 };
  }

  let bestPeriod = 2;
  let bestCorr = -Infinity;

  for (let p = 2; p <= maxP; p++) {
    const corr = autocorrAtLag(values, p);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestPeriod = p;
    }
  }

  // Strength: variance of seasonal component / variance of original
  let strength = 0;
  try {
    const indices = seasonalIndices(values, bestPeriod);
    const seasonal: number[] = new Array(n);
    for (let i = 0; i < n; i++) seasonal[i] = indices[i % bestPeriod]!;
    const varSeasonal = _variance(seasonal);
    const varTotal = _variance(values);
    strength = varTotal === 0 ? 0 : Math.min(1, varSeasonal / varTotal);
  } catch {
    strength = 0;
  }

  // Confidence: normalize bestCorr to [0,1]
  const confidence = Math.max(0, Math.min(1, (bestCorr + 1) / 2));

  const hasSeasionality = strength > 0.2 && confidence > 0.3;

  return {
    hasSeasionality,
    period: hasSeasionality ? bestPeriod : null,
    strength,
    confidence,
  };
}

// ─── Holt-Winters ─────────────────────────────────────────────────────────────

/**
 * Holt-Winters exponential smoothing (additive).
 * Returns smoothed series of same length as input (in-sample fit).
 */
export function holtWinters(
  values: number[],
  period: number,
  options?: { alpha?: number; beta?: number; gamma?: number }
): number[] {
  const n = values.length;
  if (n === 0) return [];

  const alpha = options?.alpha ?? 0.3;
  const beta = options?.beta ?? 0.1;
  const gamma = options?.gamma ?? 0.2;

  // Initialize seasonal factors from first period
  const initSeasonal = seasonalIndices(values.slice(0, Math.min(n, period * 2)), period);
  const s: number[] = [...initSeasonal];
  // Extend s to cover the full series
  while (s.length < n + period) {
    for (let i = 0; i < period; i++) s.push(s[s.length - period]!);
  }

  // Initialize level = mean of first period, trend = mean difference
  const firstPeriod = values.slice(0, Math.min(period, n));
  let level = _mean(firstPeriod);

  let trend = 0;
  if (n >= 2 * period) {
    const secondPeriod = values.slice(period, 2 * period);
    trend = (_mean(secondPeriod) - _mean(firstPeriod)) / period;
  } else if (n >= 2) {
    trend = (values[n - 1]! - values[0]!) / (n - 1);
  }

  const yhat: number[] = new Array(n).fill(0);
  let lvl = level;
  let trnd = trend;

  for (let t = 0; t < n; t++) {
    const prevLvl = lvl;
    const prevTrnd = trnd;
    const prevS = s[t]!; // seasonal factor t periods ago

    // One-step-ahead forecast for position t
    yhat[t] = prevLvl + prevTrnd + prevS;

    // Update level, trend, seasonal
    lvl = alpha * (values[t]! - prevS) + (1 - alpha) * (prevLvl + prevTrnd);
    trnd = beta * (lvl - prevLvl) + (1 - beta) * prevTrnd;
    s[t + period] = gamma * (values[t]! - lvl) + (1 - gamma) * prevS;
  }

  return yhat;
}

/**
 * Forecast n steps ahead using Holt-Winters.
 * Prediction interval: ±1.28 * stdDev(residuals) * sqrt(k) for 80%.
 */
export function holtWintersForecast(
  values: number[],
  steps: number,
  period: number,
  options?: { alpha?: number; beta?: number; gamma?: number }
): ForecastResult {
  const n = values.length;
  const alpha = options?.alpha ?? 0.3;
  const beta = options?.beta ?? 0.1;
  const gamma = options?.gamma ?? 0.2;

  // Fit Holt-Winters and collect final state
  const initSeasonal = seasonalIndices(values.slice(0, Math.min(n, period * 2)), period);
  const s: number[] = [...initSeasonal];
  while (s.length < n + period + steps) {
    for (let i = 0; i < period; i++) s.push(s[s.length - period]!);
  }

  const firstPeriod = values.slice(0, Math.min(period, n));
  let lvl = _mean(firstPeriod);
  let trnd = 0;
  if (n >= 2 * period) {
    const secondPeriod = values.slice(period, 2 * period);
    trnd = (_mean(secondPeriod) - _mean(firstPeriod)) / period;
  } else if (n >= 2) {
    trnd = (values[n - 1]! - values[0]!) / (n - 1);
  }

  const residuals: number[] = [];

  for (let t = 0; t < n; t++) {
    const prevLvl = lvl;
    const prevTrnd = trnd;
    const prevS = s[t]!;
    const yhat = prevLvl + prevTrnd + prevS;
    residuals.push(values[t]! - yhat);
    lvl = alpha * (values[t]! - prevS) + (1 - alpha) * (prevLvl + prevTrnd);
    trnd = beta * (lvl - prevLvl) + (1 - beta) * prevTrnd;
    s[t + period] = gamma * (values[t]! - lvl) + (1 - gamma) * prevS;
  }

  const residStd = _std(residuals);

  // Project steps ahead: F[t+k] = level + k*trend + s[t+k-period]
  const forecast: number[] = [];
  const lowerBound: number[] = [];
  const upperBound: number[] = [];

  for (let k = 1; k <= steps; k++) {
    const seasonalFactor = s[n + k - 1]!; // s has been extended
    const f = lvl + k * trnd + seasonalFactor;
    const interval = 1.28 * residStd * Math.sqrt(k);
    forecast.push(f);
    lowerBound.push(f - interval);
    upperBound.push(f + interval);
  }

  return { forecast, lowerBound, upperBound, method: 'HoltWinters' };
}

// ─── AR(1) forecast ───────────────────────────────────────────────────────────

/**
 * Simple AR(1) model.
 * phi = corr(y[1:], y[:-1])
 * Forecast: y_hat = mean + phi*(y_t - mean), applied recursively.
 * Uncertainty: ± 1.28 * sigma * sqrt(k / (1 - phi^2)), clamped.
 */
export function ar1Forecast(values: number[], steps: number): ForecastResult {
  const n = values.length;
  const mu = _mean(values);
  const phi = autocorrAtLag(values, 1);

  // Residual std from AR(1) model fit
  const preds: number[] = [values[0]!];
  for (let i = 1; i < n; i++) {
    preds.push(mu + phi * (values[i - 1]! - mu));
  }
  const residuals = values.map((v, i) => v - preds[i]!);
  const sigma = _std(residuals);

  const forecast: number[] = [];
  const lowerBound: number[] = [];
  const upperBound: number[] = [];

  let prev = values[n - 1]!;
  for (let k = 1; k <= steps; k++) {
    const f = mu + phi * (prev - mu);
    const denom = 1 - phi ** 2;
    const interval = denom > 0
      ? 1.28 * sigma * Math.sqrt(k / denom)
      : 1.28 * sigma * Math.sqrt(k);
    forecast.push(f);
    lowerBound.push(f - interval);
    upperBound.push(f + interval);
    prev = f;
  }

  return { forecast, lowerBound, upperBound, method: 'AR1' };
}

// ─── Naive forecast ───────────────────────────────────────────────────────────

/**
 * Naive forecast (last value repeated).
 * Bounds: ± 1.28 * stdDev(differences) * sqrt(k).
 */
export function naiveForecast(values: number[], steps: number): ForecastResult {
  const n = values.length;
  const last = values[n - 1]!;

  // Std dev of first differences
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) diffs.push(values[i]! - values[i - 1]!);
  const sigma = _std(diffs);

  const forecast: number[] = [];
  const lowerBound: number[] = [];
  const upperBound: number[] = [];

  for (let k = 1; k <= steps; k++) {
    const interval = 1.28 * sigma * Math.sqrt(k);
    forecast.push(last);
    lowerBound.push(last - interval);
    upperBound.push(last + interval);
  }

  return { forecast, lowerBound, upperBound, method: 'Naive' };
}

// ─── Seasonal naive ───────────────────────────────────────────────────────────

/**
 * Seasonal naive forecast: repeat the last season.
 * forecast[k] = values[n - period + (k % period)]
 */
export function seasonalNaiveForecast(
  values: number[],
  steps: number,
  period: number
): ForecastResult {
  const n = values.length;

  // Std dev of differences for bounds (same as naive)
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) diffs.push(values[i]! - values[i - 1]!);
  const sigma = _std(diffs);

  const forecast: number[] = [];
  const lowerBound: number[] = [];
  const upperBound: number[] = [];

  for (let k = 0; k < steps; k++) {
    const srcIdx = n - period + (k % period);
    const f = srcIdx >= 0 && srcIdx < n ? values[srcIdx]! : values[n - 1]!;
    const interval = 1.28 * sigma * Math.sqrt(k + 1);
    forecast.push(f);
    lowerBound.push(f - interval);
    upperBound.push(f + interval);
  }

  return { forecast, lowerBound, upperBound, method: 'SeasonalNaive' };
}

// ─── Linear forecast ──────────────────────────────────────────────────────────

/**
 * Linear trend extrapolation via OLS.
 * Bounds: ± 1.28 * SE * sqrt(1 + 1/n + (n+k-xbar)^2/Sxx).
 */
export function linearForecast(values: number[], steps: number): ForecastResult {
  const n = values.length;
  if (n === 0) {
    return { forecast: [], lowerBound: [], upperBound: [], method: 'LinearTrend' };
  }

  // OLS
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  let slope = 0;
  let intercept = sumY / n;

  if (denom !== 0) {
    slope = (n * sumXY - sumX * sumY) / denom;
    intercept = (sumY - slope * sumX) / n;
  }

  // Residual SE
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (values[i]! - (slope * i + intercept)) ** 2;
  }
  const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  const xbar = sumX / n;
  const sxx = sumX2 - n * xbar ** 2;

  const forecast: number[] = [];
  const lowerBound: number[] = [];
  const upperBound: number[] = [];

  for (let k = 1; k <= steps; k++) {
    const xNew = n - 1 + k; // 0-indexed: last known index is n-1
    const f = slope * xNew + intercept;
    const leverageTerm = sxx > 0
      ? 1 + 1 / n + (xNew - xbar) ** 2 / sxx
      : 1 + 1 / n;
    const interval = 1.28 * se * Math.sqrt(leverageTerm);
    forecast.push(f);
    lowerBound.push(f - interval);
    upperBound.push(f + interval);
  }

  return { forecast, lowerBound, upperBound, method: 'LinearTrend' };
}

// ─── Yule-Walker ──────────────────────────────────────────────────────────────

/**
 * Yule-Walker equations for AR(p) coefficients.
 * Returns [phi_1, ..., phi_p].
 * For p=1: phi_1 = autocorrelation at lag 1.
 * For p=2: solve 2x2 Toeplitz system.
 */
export function yuleWalker(values: number[], p: number): number[] {
  if (p === 0) return [];

  const r1 = autocorrAtLag(values, 1);

  if (p === 1) {
    return [r1];
  }

  if (p === 2) {
    const r2 = autocorrAtLag(values, 2);
    const denom = 1 - r1 ** 2;
    if (Math.abs(denom) < 1e-12) return [r1, 0];
    const phi1 = (r1 - r2 * r1) / denom;
    const phi2 = (r2 - r1 ** 2) / denom;
    return [phi1, phi2];
  }

  // Higher p: return zeros (spec only supports p <= 2)
  return new Array(p).fill(0);
}

// ─── ARIMA-lite ───────────────────────────────────────────────────────────────

/**
 * ARIMA-lite: AR(p) + differencing + MA(1).
 * Supports p in {0,1,2}, d in {0,1}, q in {0,1}.
 */
export function arimaLite(
  values: number[],
  params: ArimaLiteParams,
  steps: number
): ForecastResult {
  const { p, d, q } = params;

  // Step 1: difference if needed
  let series = [...values];
  if (d === 1) {
    series = makeStationary(series, 'difference');
  }

  const n = series.length;
  const mu = _mean(series);
  const centered = series.map((v) => v - mu);

  // Step 2: AR coefficients via Yule-Walker
  const phi = p > 0 ? yuleWalker(series, Math.min(p, 2)) : [];

  // Step 3: Compute AR residuals
  const arResiduals: number[] = [];
  for (let t = Math.max(p, 1); t < n; t++) {
    let arPred = mu;
    for (let j = 0; j < phi.length; j++) {
      arPred += phi[j]! * (series[t - 1 - j]! - mu);
    }
    arResiduals.push(series[t]! - arPred);
  }

  // Step 4: MA(1) coefficient from lag-1 autocorrelation of residuals
  const theta = q === 1 && arResiduals.length >= 2
    ? autocorrAtLag(arResiduals, 1)
    : 0;

  const residStd = _std(arResiduals.length > 0 ? arResiduals : series);

  // Step 5: Build forecast on differenced series
  // Carry state for MA(1)
  let lastResidual = arResiduals.length > 0 ? arResiduals[arResiduals.length - 1]! : 0;

  // History for AR: last p values of the (differenced) series
  const history = series.slice(Math.max(0, n - Math.max(p, 1)));

  const diffForecast: number[] = [];
  for (let k = 0; k < steps; k++) {
    let f = mu;
    for (let j = 0; j < phi.length; j++) {
      const idx = history.length - 1 - j;
      if (idx >= 0) f += phi[j]! * (history[idx]! - mu);
    }
    // MA(1) correction: only apply for k=0 (last known residual)
    if (q === 1 && k === 0) f += theta * lastResidual;
    diffForecast.push(f);
    history.push(f);
    lastResidual = 0; // residuals unknown for future steps
  }

  // Step 6: Integrate if d=1
  const finalForecast = d === 1
    ? integrateForecasts(diffForecast, values[values.length - 1]!)
    : diffForecast;

  const interval = 1.28 * residStd * Math.sqrt(steps);

  const forecast = finalForecast;
  const lowerBound = forecast.map((f) => f - interval);
  const upperBound = forecast.map((f) => f + interval);

  return { forecast, lowerBound, upperBound, method: 'ARIMALite' };
}

// ─── Accuracy metrics ─────────────────────────────────────────────────────────

/** Mean absolute error. */
export function mae(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(actual[i]! - predicted[i]!);
  return s / n;
}

/** Root mean square error. */
export function rmse(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (actual[i]! - predicted[i]!) ** 2;
  return Math.sqrt(s / n);
}

/**
 * Mean absolute percentage error.
 * Skips where actual = 0; returns Infinity if all actual = 0.
 */
export function mape(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  let s = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      s += Math.abs((actual[i]! - predicted[i]!) / actual[i]!);
      count++;
    }
  }
  return count === 0 ? Infinity : s / count;
}

/**
 * Symmetric MAPE: mean(2*|A-P|/(|A|+|P|)).
 * Skips if both actual and predicted = 0.
 */
export function smape(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  let s = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const denom = Math.abs(actual[i]!) + Math.abs(predicted[i]!);
    if (denom !== 0) {
      s += (2 * Math.abs(actual[i]! - predicted[i]!)) / denom;
      count++;
    }
  }
  return count === 0 ? 0 : s / count;
}

// ─── Cross-validation ─────────────────────────────────────────────────────────

/**
 * Time-series cross-validation with expanding window.
 * For each position i from minTrainSize to n-1:
 *   train = values[0..i-1]; forecast = forecastFn(train); actual = values[i]
 */
export function timeSeriesCv(
  values: number[],
  forecastFn: (train: number[]) => number,
  minTrainSize?: number
): { maeFold: number[]; rmseOverall: number } {
  const n = values.length;
  const minTrain = minTrainSize ?? 10;
  const maeFold: number[] = [];
  const errors: number[] = [];

  for (let i = minTrain; i < n; i++) {
    const train = values.slice(0, i);
    const pred = forecastFn(train);
    const actual = values[i]!;
    const err = Math.abs(actual - pred);
    maeFold.push(err);
    errors.push((actual - pred) ** 2);
  }

  const rmseOverall = errors.length > 0
    ? Math.sqrt(_mean(errors))
    : 0;

  return { maeFold, rmseOverall };
}

// ─── Change point detection ───────────────────────────────────────────────────

/**
 * CUSUM change point detection.
 * CUSUM[i] = cumulative sum of (x - mean) / std.
 * Returns indices where |CUSUM| first exceeds threshold * n / 2.
 */
export function cusumChangePoints(
  values: number[],
  threshold?: number
): number[] {
  const n = values.length;
  const thr = threshold ?? 4.0;
  if (n === 0) return [];

  const mu = _mean(values);
  const sigma = _std(values);
  if (sigma === 0) return [];

  const limit = thr * n / 2;
  const changePoints: number[] = [];
  let cusum = 0;

  for (let i = 0; i < n; i++) {
    cusum += (values[i]! - mu) / sigma;
    if (Math.abs(cusum) >= limit) {
      changePoints.push(i);
      cusum = 0; // reset after detection
    }
  }

  return changePoints;
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

/**
 * Anomaly detection via rolling z-score.
 * Returns indices where rolling z-score exceeds ±threshold.
 */
export function anomalyDetection(
  values: number[],
  window?: number,
  threshold?: number
): number[] {
  const win = window ?? 10;
  const thr = threshold ?? 2.5;
  const n = values.length;
  const anomalies: number[] = [];

  for (let i = win - 1; i < n; i++) {
    // Include the current value in the window so spikes change std
    const slice = values.slice(i - win + 1, i + 1);
    const mu = _mean(slice);
    const sigma = _std(slice);
    if (sigma === 0) continue;
    const z = (values[i]! - mu) / sigma;
    if (Math.abs(z) >= thr) anomalies.push(i);
  }

  return anomalies;
}

// ─── Stationarity utils ───────────────────────────────────────────────────────

/**
 * Convert to stationary via differencing or log-differencing.
 * difference: [values[1]-values[0], ...]
 * log-difference: [log(values[1]/values[0]), ...]
 */
export function makeStationary(
  values: number[],
  method: 'difference' | 'log-difference' = 'difference'
): number[] {
  const n = values.length;
  if (n < 2) return [];

  const result: number[] = [];
  for (let i = 1; i < n; i++) {
    if (method === 'log-difference') {
      const ratio = values[i]! / values[i - 1]!;
      result.push(ratio > 0 ? Math.log(ratio) : 0);
    } else {
      result.push(values[i]! - values[i - 1]!);
    }
  }
  return result;
}

/**
 * Undo differencing: reverse of makeStationary('difference').
 * result[0] = lastOriginalValue + forecasts[0]
 * result[k] = result[k-1] + forecasts[k]
 */
export function integrateForecasts(
  forecasts: number[],
  lastOriginalValue: number
): number[] {
  const result: number[] = [];
  let prev = lastOriginalValue;
  for (const f of forecasts) {
    prev = prev + f;
    result.push(prev);
  }
  return result;
}
