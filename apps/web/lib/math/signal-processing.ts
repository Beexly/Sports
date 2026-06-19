/**
 * Signal / time-series processing utilities — pure TypeScript, zero dependencies.
 *
 * Moving averages, convolution, cross-correlation, trend analysis, peak detection,
 * smoothing filters, spectral analysis, and rolling statistics for sports analytics.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignalPoint {
  value: number;
  index: number;
}

export interface SmoothingResult {
  smoothed: number[];
  windowSize: number;
}

export interface TrendResult {
  slope: number;
  intercept: number;
  r2: number;
  direction: "up" | "down" | "flat";
}

export interface PeakResult {
  peaks: number[];
  valleys: number[];
}

export interface AutocorrResult {
  lag: number;
  correlation: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function _variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = _mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return s / arr.length;
}

function _stddev(arr: number[]): number {
  return Math.sqrt(_variance(arr));
}

function _median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// ─── Moving averages ──────────────────────────────────────────────────────────

/**
 * Simple Moving Average.
 * Returns array of same length; first (window-1) entries are NaN.
 * e.g. simpleMovingAverage([1,2,3,4,5], 3) => [NaN, NaN, 2, 3, 4]
 */
export function simpleMovingAverage(values: number[], window: number): number[] {
  const n = values.length;
  const result: number[] = new Array(n).fill(NaN);
  for (let i = window - 1; i < n; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += values[j]!;
    result[i] = sum / window;
  }
  return result;
}

/**
 * Exponential Moving Average.
 * alpha in (0,1]; EMA[0] = values[0]; EMA[i] = alpha*values[i] + (1-alpha)*EMA[i-1]
 */
export function exponentialMovingAverage(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = new Array(values.length);
  result[0] = values[0]!;
  for (let i = 1; i < values.length; i++) {
    result[i] = alpha * values[i]! + (1 - alpha) * result[i - 1]!;
  }
  return result;
}

/**
 * Weighted Moving Average.
 * weights.length must be <= values.length.
 * For each position i >= weights.length-1:
 *   WMA[i] = sum(values[i-j] * weights[weights.length-1-j]) / sum(weights)
 * Positions before window are NaN.
 */
export function weightedMovingAverage(values: number[], weights: number[]): number[] {
  const n = values.length;
  const w = weights.length;
  const result: number[] = new Array(n).fill(NaN);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return result;
  for (let i = w - 1; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < w; j++) {
      sum += values[i - j]! * weights[w - 1 - j]!;
    }
    result[i] = sum / totalWeight;
  }
  return result;
}

/**
 * Simple 1D Kalman filter (position-only state).
 * processNoise default 1e-3, observationNoise default 1e-1.
 */
export function kalmansmoother(
  values: number[],
  processNoise: number = 1e-3,
  observationNoise: number = 1e-1
): number[] {
  if (values.length === 0) return [];
  const Q = processNoise;
  const R = observationNoise;
  const result: number[] = new Array(values.length);
  let x = values[0]!;
  let P = 1;
  result[0] = x;
  for (let i = 1; i < values.length; i++) {
    // Predict
    const xPred = x;
    const pPred = P + Q;
    // Update
    const K = pPred / (pPred + R);
    x = xPred + K * (values[i]! - xPred);
    P = (1 - K) * pPred;
    result[i] = x;
  }
  return result;
}

// ─── Convolution / correlation ────────────────────────────────────────────────

/**
 * Full discrete convolution.
 * Output length = signal.length + kernel.length - 1.
 * (f*g)[n] = sum_k f[k]*g[n-k]
 */
export function convolve(signal: number[], kernel: number[]): number[] {
  const sLen = signal.length;
  const kLen = kernel.length;
  const outLen = sLen + kLen - 1;
  const result: number[] = new Array(outLen).fill(0);
  for (let n = 0; n < outLen; n++) {
    let val = 0;
    for (let k = 0; k < sLen; k++) {
      const j = n - k;
      if (j >= 0 && j < kLen) {
        val += signal[k]! * kernel[j]!;
      }
    }
    result[n] = val;
  }
  return result;
}

/**
 * Cross-correlation between arrays a and b.
 * Returns array of { lag, correlation } for lag = -maxLag..+maxLag.
 * Pearson correlation at each lag (normalized by std devs × (n - |lag|)).
 */
export function crossCorrelation(
  a: number[],
  b: number[],
  maxLag?: number
): AutocorrResult[] {
  const n = Math.min(a.length, b.length);
  const lag = maxLag !== undefined ? maxLag : n - 1;
  const aMean = _mean(a.slice(0, n));
  const bMean = _mean(b.slice(0, n));
  const aStd = _stddev(a.slice(0, n));
  const bStd = _stddev(b.slice(0, n));

  const results: AutocorrResult[] = [];
  for (let l = -lag; l <= lag; l++) {
    const count = n - Math.abs(l);
    if (count <= 0) {
      results.push({ lag: l, correlation: 0 });
      continue;
    }
    let cov = 0;
    if (l >= 0) {
      for (let i = 0; i < count; i++) {
        cov += (a[i]! - aMean) * (b[i + l]! - bMean);
      }
    } else {
      for (let i = 0; i < count; i++) {
        cov += (a[i - l]! - aMean) * (b[i]! - bMean);
      }
    }
    const denom = aStd * bStd * count;
    results.push({ lag: l, correlation: denom === 0 ? 0 : cov / denom });
  }
  return results;
}

/**
 * Autocorrelation of a series.
 * lag=0 is always 1.0.
 */
export function autocorrelation(values: number[], maxLag?: number): AutocorrResult[] {
  const results = crossCorrelation(values, values, maxLag);
  // Force lag=0 to exactly 1.0
  const zeroIdx = results.findIndex((r) => r.lag === 0);
  if (zeroIdx !== -1) results[zeroIdx] = { lag: 0, correlation: 1.0 };
  return results;
}

// ─── Trend analysis ───────────────────────────────────────────────────────────

/**
 * OLS linear regression of index→value.
 * Returns slope, intercept, r², direction.
 */
export function linearTrend(values: number[]): TrendResult {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, direction: "flat" };
  if (n === 1) return { slope: 0, intercept: values[0]!, r2: 1, direction: "flat" };

  // OLS
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    const intercept = sumY / n;
    return { slope: 0, intercept, r2: 1, direction: "flat" };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (values[i]! - yMean) ** 2;
    ssRes += (values[i]! - (slope * i + intercept)) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const direction: "up" | "down" | "flat" =
    slope > 1e-6 ? "up" : slope < -1e-6 ? "down" : "flat";

  return { slope, intercept, r2, direction };
}

/**
 * Remove linear trend from series.
 * detrended[i] = values[i] - (slope*i + intercept)
 */
export function detrend(values: number[]): number[] {
  const { slope, intercept } = linearTrend(values);
  return values.map((v, i) => v - (slope * i + intercept));
}

/**
 * Detect change points where abs(values[i] - values[i-1]) > threshold * stddev.
 * threshold defaults to 2.0; stddev is population stddev of the full series.
 */
export function detectChangePoints(values: number[], threshold: number = 2.0): number[] {
  if (values.length < 2) return [];
  const std = _stddev(values);
  const limit = threshold * std;
  const points: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i]! - values[i - 1]!) > limit) {
      points.push(i);
    }
  }
  return points;
}

// ─── Peak / valley detection ──────────────────────────────────────────────────

/**
 * Find peaks and valleys.
 * Peak at i: values[i-1] < values[i] && values[i] > values[i+1]
 * Valley at i: values[i-1] > values[i] && values[i] < values[i+1]
 * Edges (0 and n-1) are never peaks/valleys.
 * minProminence: optional filter — keeps peak only if
 *   min(values[peak]-values[nearestValleyLeft], values[peak]-values[nearestValleyRight]) >= minProminence
 */
export function findPeaks(values: number[], minProminence?: number): PeakResult {
  const n = values.length;
  const peaks: number[] = [];
  const valleys: number[] = [];

  for (let i = 1; i < n - 1; i++) {
    if (values[i - 1]! < values[i]! && values[i]! > values[i + 1]!) {
      peaks.push(i);
    }
    if (values[i - 1]! > values[i]! && values[i]! < values[i + 1]!) {
      valleys.push(i);
    }
  }

  if (minProminence === undefined) {
    return { peaks, valleys };
  }

  // Filter peaks by prominence
  const filteredPeaks = peaks.filter((peakIdx) => {
    // Find nearest valleys to the left and right
    let leftValleyVal = values[0]!;
    let rightValleyVal = values[n - 1]!;
    for (const v of valleys) {
      if (v < peakIdx) leftValleyVal = values[v]!;
    }
    for (const v of valleys) {
      if (v > peakIdx) {
        rightValleyVal = values[v]!;
        break;
      }
    }
    const prom = Math.min(
      values[peakIdx]! - leftValleyVal,
      values[peakIdx]! - rightValleyVal
    );
    return prom >= minProminence;
  });

  // Filter valleys by prominence
  const filteredValleys = valleys.filter((valleyIdx) => {
    let leftPeakVal = values[0]!;
    let rightPeakVal = values[n - 1]!;
    for (const p of peaks) {
      if (p < valleyIdx) leftPeakVal = values[p]!;
    }
    for (const p of peaks) {
      if (p > valleyIdx) {
        rightPeakVal = values[p]!;
        break;
      }
    }
    const prom = Math.min(
      leftPeakVal - values[valleyIdx]!,
      rightPeakVal - values[valleyIdx]!
    );
    return prom >= minProminence;
  });

  return { peaks: filteredPeaks, valleys: filteredValleys };
}

// ─── Smoothing / filtering ────────────────────────────────────────────────────

/**
 * Gaussian smoothing with given sigma.
 * Kernel size = ceil(6*sigma) | 1 (forced odd).
 * Same-mode: output same length as input; edges padded by replication.
 */
export function gaussianSmooth(values: number[], sigma: number): number[] {
  const n = values.length;
  if (n === 0) return [];

  // Build kernel
  let kSize = Math.ceil(6 * sigma);
  if (kSize % 2 === 0) kSize += 1;
  if (kSize < 1) kSize = 1;
  const center = Math.floor(kSize / 2);
  const kernel: number[] = new Array(kSize);
  let kSum = 0;
  for (let i = 0; i < kSize; i++) {
    const x = i - center;
    kernel[i] = Math.exp(-0.5 * (x / sigma) ** 2);
    kSum += kernel[i]!;
  }
  for (let i = 0; i < kSize; i++) kernel[i]! / kSum; // compute below
  const normKernel = kernel.map((k) => k / kSum);

  // Apply with replicate padding
  const result: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let val = 0;
    for (let k = 0; k < kSize; k++) {
      const srcIdx = Math.max(0, Math.min(n - 1, i - center + k));
      val += values[srcIdx]! * normKernel[k]!;
    }
    result[i] = val;
  }
  return result;
}

/**
 * Median filter with replicate edge padding.
 * windowSize must be odd.
 */
export function medianFilter(values: number[], windowSize: number): number[] {
  const n = values.length;
  const half = Math.floor(windowSize / 2);
  const result: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const window: number[] = [];
    for (let k = -half; k <= half; k++) {
      const idx = Math.max(0, Math.min(n - 1, i + k));
      window.push(values[idx]!);
    }
    result[i] = _median(window);
  }
  return result;
}

/**
 * Savitzky-Golay smoothing filter.
 * windowSize must be odd and > polyOrder.
 * Supports polyOrder 1 (linear) and 2 (quadratic).
 * Edges padded with boundary value (replicate).
 */
export function savitzkyGolay(
  values: number[],
  windowSize: number,
  polyOrder: number
): number[] {
  const n = values.length;
  if (n === 0) return [];
  const half = Math.floor(windowSize / 2);

  // Compute SG coefficients via least-squares for the center point
  // We fit a polynomial of degree polyOrder to uniformly spaced points [-half..half]
  const m = windowSize;
  const xs: number[] = [];
  for (let i = -half; i <= half; i++) xs.push(i);

  // Build Vandermonde matrix A (m x (polyOrder+1))
  const deg = polyOrder + 1;
  const A: number[][] = xs.map((x) => {
    const row: number[] = [];
    for (let p = 0; p < deg; p++) row.push(Math.pow(x, p));
    return row;
  });

  // Compute (A^T A)^{-1} A^T — only need first row of result (the center prediction)
  // For small matrices, compute directly
  // AtA = A^T * A  (deg x deg)
  const AtA: number[][] = Array.from({ length: deg }, () => new Array(deg).fill(0));
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < deg; j++) {
      for (let k = 0; k < m; k++) {
        AtA[i]![j]! += A[k]![i]! * A[k]![j]!;
      }
    }
  }

  // Invert AtA using Gauss-Jordan
  const inv = invertMatrix(AtA, deg);

  // Coefficients: coeff = inv * A^T; then the smoothed value for center point
  // = sum_k coeff[0][k] * y[k], where coeff[0] = (inv * A^T)[0]
  // We only need the first row of coeff
  const coeffs: number[] = new Array(m).fill(0);
  for (let k = 0; k < m; k++) {
    let val = 0;
    for (let i = 0; i < deg; i++) {
      val += inv[0]![i]! * A[k]![i]!;
    }
    coeffs[k] = val;
  }

  const result: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let val = 0;
    for (let k = 0; k < m; k++) {
      const srcIdx = Math.max(0, Math.min(n - 1, i - half + k));
      val += coeffs[k]! * values[srcIdx]!;
    }
    result[i] = val;
  }
  return result;
}

/** Gauss-Jordan matrix inversion for small square matrices. */
function invertMatrix(matrix: number[][], n: number): number[][] {
  // Augment with identity
  const aug: number[][] = matrix.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) r.push(j === i ? 1 : 0);
    return r;
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row]![col]!) > Math.abs(aug[pivotRow]![col]!)) {
        pivotRow = row;
      }
    }
    [aug[col], aug[pivotRow]] = [aug[pivotRow]!, aug[col]!];
    const pivot = aug[col]![col]!;
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = 0; j < 2 * n; j++) aug[col]![j]! /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row]![col]!;
      for (let j = 0; j < 2 * n; j++) {
        aug[row]![j]! -= factor * aug[col]![j]!;
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

// ─── Spectral / frequency ─────────────────────────────────────────────────────

/**
 * DFT magnitudes (O(n²)).
 * |X[k]| for k=0..n-1 where X[k] = sum_{n=0}^{N-1} x[n]*exp(-2πi*k*n/N)
 */
export function dftMagnitudes(values: number[]): number[] {
  const N = values.length;
  const result: number[] = new Array(N);
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += values[n]! * Math.cos(angle);
      im -= values[n]! * Math.sin(angle);
    }
    result[k] = Math.sqrt(re * re + im * im);
  }
  return result;
}

/**
 * Dominant non-DC frequency.
 * Returns { frequency, period, magnitude } for k >= 1 with max |X[k]|.
 */
export function dominantFrequency(
  values: number[]
): { frequency: number; period: number; magnitude: number } {
  const N = values.length;
  const mags = dftMagnitudes(values);
  let maxMag = -Infinity;
  let maxK = 1;
  for (let k = 1; k < N; k++) {
    if (mags[k]! > maxMag) {
      maxMag = mags[k]!;
      maxK = k;
    }
  }
  return {
    frequency: maxK / N,
    period: N / maxK,
    magnitude: maxMag,
  };
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

/**
 * Rolling population standard deviation.
 * First (window-1) entries are NaN.
 */
export function rollingStdDev(values: number[], window: number): number[] {
  const n = values.length;
  const result: number[] = new Array(n).fill(NaN);
  for (let i = window - 1; i < n; i++) {
    const slice = values.slice(i - window + 1, i + 1);
    result[i] = _stddev(slice);
  }
  return result;
}

/**
 * Rolling z-score using rolling mean and std dev.
 * If rollingStdDev == 0, z-score = 0.
 */
export function rollingZScore(values: number[], window: number): number[] {
  const n = values.length;
  const result: number[] = new Array(n).fill(NaN);
  for (let i = window - 1; i < n; i++) {
    const slice = values.slice(i - window + 1, i + 1);
    const m = _mean(slice);
    const s = _stddev(slice);
    result[i] = s === 0 ? 0 : (values[i]! - m) / s;
  }
  return result;
}

/**
 * Exponentially weighted moving average with given half-life.
 * alpha = 1 - exp(-ln(2)/halfLife)
 * ewma[0] = values[0]; ewma[i] = alpha*values[i] + (1-alpha)*ewma[i-1]
 */
export function ewma(values: number[], halfLife: number): number[] {
  const alpha = 1 - Math.exp(-Math.LN2 / halfLife);
  return exponentialMovingAverage(values, alpha);
}
