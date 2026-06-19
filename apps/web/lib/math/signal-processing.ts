/**
 * Signal / time-series processing utilities — pure TypeScript, zero dependencies.
 *
 * Moving averages, complex arithmetic, FFT (Cooley-Tukey radix-2 DIT),
 * convolution, correlation, FIR and IIR filters, Kalman filter, window
 * functions, signal statistics, and sports time-series helpers.
 *
 * All functions are pure (no side effects). No any types. Zero npm deps.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Complex {
  re: number;
  im: number;
}

export interface KalmanState {
  estimate: number;
  errorVariance: number;
}

export interface FilterCoefficients {
  /** feedforward coefficients */
  b: number[];
  /** feedback coefficients (a[0] = 1) */
  a: number[];
}

export interface SpectralPeak {
  frequency: number;
  magnitude: number;
  phase: number;
}

// Legacy types kept for backward compat
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

// ─── Complex number arithmetic ─────────────────────────────────────────────────

/** Create a complex number. im defaults to 0. */
export function complex(re: number, im: number = 0): Complex {
  return { re, im };
}

export function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function complexSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function complexDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: NaN, im: NaN };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

/** Magnitude |c|. */
export function complexAbs(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im);
}

/** Phase angle arg(c) in radians. */
export function complexArg(c: Complex): number {
  return Math.atan2(c.im, c.re);
}

/** Complex conjugate. */
export function complexConj(c: Complex): Complex {
  return { re: c.re, im: -c.im };
}

/** e^(re + i*im) = e^re * (cos(im) + i*sin(im)). */
export function complexExp(c: Complex): Complex {
  const r = Math.exp(c.re);
  return { re: r * Math.cos(c.im), im: r * Math.sin(c.im) };
}

/** Create a complex number from polar form: magnitude * e^(i*phase). */
export function complexPolar(magnitude: number, phase: number): Complex {
  return { re: magnitude * Math.cos(phase), im: magnitude * Math.sin(phase) };
}

// ─── FFT helpers ──────────────────────────────────────────────────────────────

export function nextPowerOf2(n: number): number {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export function zeroPadToNextPowerOf2(signal: number[]): number[] {
  const target = nextPowerOf2(signal.length);
  if (target === signal.length) return [...signal];
  return [...signal, ...new Array(target - signal.length).fill(0)];
}

/** In-place Cooley-Tukey radix-2 DIT FFT. Input length must be power of 2. */
function fftInPlace(buf: Complex[], inverse: boolean): void {
  const n = buf.length;
  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tmp = buf[i]!;
      buf[i] = buf[j]!;
      buf[j] = tmp;
    }
  }
  // FFT butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len * (inverse ? 1 : -1);
    const wn: Complex = { re: Math.cos(ang), im: Math.sin(ang) };
    for (let i = 0; i < n; i += len) {
      const w: Complex = { re: 1, im: 0 };
      for (let k = 0; k < len / 2; k++) {
        const u = buf[i + k]!;
        const v = complexMul(buf[i + k + len / 2]!, w);
        buf[i + k] = complexAdd(u, v);
        buf[i + k + len / 2] = complexSub(u, v);
        const newW = complexMul(w, wn);
        w.re = newW.re;
        w.im = newW.im;
      }
    }
  }
}

/**
 * FFT (Cooley-Tukey radix-2 DIT).
 * Input length must be power of 2; zero-pads automatically.
 */
export function fft(signal: number[]): Complex[] {
  const padded = zeroPadToNextPowerOf2(signal);
  const buf: Complex[] = padded.map((v) => ({ re: v, im: 0 }));
  fftInPlace(buf, false);
  return buf;
}

/**
 * Inverse FFT.
 * Input length must be power of 2.
 * Normalizes by N.
 */
export function ifft(spectrum: Complex[]): Complex[] {
  const n = spectrum.length;
  const buf: Complex[] = spectrum.map((c) => ({ re: c.re, im: c.im }));
  fftInPlace(buf, true);
  return buf.map((c) => ({ re: c.re / n, im: c.im / n }));
}

/** |X[k]| for each frequency bin. */
export function fftMagnitude(spectrum: Complex[]): number[] {
  return spectrum.map(complexAbs);
}

/** angle(X[k]) for each frequency bin. */
export function fftPhase(spectrum: Complex[]): number[] {
  return spectrum.map(complexArg);
}

/**
 * Frequency for each FFT bin (0 to sampleRate, wrapping negative).
 * bin k -> freq k * sampleRate / N
 */
export function fftFrequencies(n: number, sampleRate: number): number[] {
  const result: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    result[k] = (k * sampleRate) / n;
  }
  return result;
}

/**
 * Find top N spectral peaks in the positive-frequency half.
 * Returns sorted by magnitude descending.
 */
export function spectralPeaks(
  signal: number[],
  sampleRate: number,
  topN: number = 5
): SpectralPeak[] {
  const spectrum = fft(signal);
  const n = spectrum.length;
  const half = Math.floor(n / 2);
  const freqs = fftFrequencies(n, sampleRate);

  // Collect peaks in positive frequencies (indices 1..half-1)
  const candidates: SpectralPeak[] = [];
  for (let k = 1; k < half; k++) {
    const mag = complexAbs(spectrum[k]!);
    const prevMag = complexAbs(spectrum[k - 1]!);
    const nextMag = complexAbs(spectrum[k + 1 < half ? k + 1 : k]!);
    if (mag > prevMag && mag > nextMag) {
      candidates.push({
        frequency: freqs[k]!,
        magnitude: mag,
        phase: complexArg(spectrum[k]!),
      });
    }
  }

  // Sort by magnitude descending, take top N
  candidates.sort((a, b) => b.magnitude - a.magnitude);
  return candidates.slice(0, topN);
}

// ─── Convolution and correlation ──────────────────────────────────────────────

/**
 * Full discrete linear convolution.
 * Output length = signal.length + kernel.length - 1.
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
 * Cross-correlation of a with b.
 * correlate(a, b)[n] = sum_k a[k] * b[k - n]
 * Uses convolve(a, reverse(b)).
 * Output length = a.length + b.length - 1.
 */
export function correlate(a: number[], b: number[]): number[] {
  const bRev = [...b].reverse();
  return convolve(a, bRev);
}

/**
 * Normalized autocorrelation.
 * Length = 2*N - 1. Normalized so that lag=0 term = 1.
 */
export function autocorrelate(signal: number[]): number[] {
  const n = signal.length;
  const raw = correlate(signal, signal);
  const norm = raw[n - 1]!; // lag=0 is at center index n-1
  if (norm === 0) return raw.map(() => 0);
  return raw.map((v) => v / norm);
}

/**
 * Fast convolution via FFT.
 * Zero-pads both to the next power of 2 >= signal.length + kernel.length - 1.
 */
export function fftConvolve(signal: number[], kernel: number[]): number[] {
  const outLen = signal.length + kernel.length - 1;
  const padLen = nextPowerOf2(outLen);

  const sPad = [...signal, ...new Array(padLen - signal.length).fill(0)];
  const kPad = [...kernel, ...new Array(padLen - kernel.length).fill(0)];

  const sSpec: Complex[] = sPad.map((v) => ({ re: v, im: 0 }));
  const kSpec: Complex[] = kPad.map((v) => ({ re: v, im: 0 }));

  fftInPlace(sSpec, false);
  fftInPlace(kSpec, false);

  const product = sSpec.map((s, i) => complexMul(s, kSpec[i]!));
  fftInPlace(product, true);

  return product.slice(0, outLen).map((c) => c.re / padLen);
}

// ─── FIR filters ─────────────────────────────────────────────────────────────

/**
 * Apply FIR filter via direct-form convolution (causal).
 * Output same length as signal; first (coefficients.length - 1) samples have startup effect.
 */
export function firFilter(signal: number[], coefficients: number[]): number[] {
  const n = signal.length;
  const m = coefficients.length;
  const result: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let val = 0;
    for (let k = 0; k < m; k++) {
      if (i - k >= 0) {
        val += coefficients[k]! * signal[i - k]!;
      }
    }
    result[i] = val;
  }
  return result;
}

/**
 * Uniform FIR moving average.
 * Output same length; edge values use partial sums.
 */
export function movingAverage(signal: number[], window: number): number[] {
  const n = signal.length;
  const result: number[] = new Array(n);
  const half = Math.floor(window / 2);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(n - 1, i + half);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += signal[j]!;
    result[i] = sum / (end - start + 1);
  }
  return result;
}

/**
 * Weighted FIR moving average. Weights are normalized internally.
 * Output same length as signal; edge effects at boundaries.
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
 * Exponential moving average.
 * y[0] = signal[0]; y[i] = alpha*x[i] + (1-alpha)*y[i-1]
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

/** Normalized Gaussian kernel weights. */
export function gaussianKernel(size: number, sigma: number): number[] {
  const center = Math.floor(size / 2);
  const kernel: number[] = new Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - center;
    kernel[i] = Math.exp(-0.5 * (x / sigma) ** 2);
    sum += kernel[i]!;
  }
  return kernel.map((v) => v / sum);
}

/**
 * Gaussian smoothing with given sigma.
 * Kernel size = ceil(6*sigma) | 1 (forced odd).
 * Edge-padded by replication.
 */
export function gaussianSmooth(values: number[], sigma: number): number[] {
  const n = values.length;
  if (n === 0) return [];

  let kSize = Math.ceil(6 * sigma);
  if (kSize % 2 === 0) kSize += 1;
  if (kSize < 1) kSize = 1;
  const center = Math.floor(kSize / 2);
  const normKernel = gaussianKernel(kSize, sigma);

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

/** Hamming window: 0.54 - 0.46*cos(2π*k/(N-1)). */
export function hammingWindow(n: number): number[] {
  const result: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    result[k] = 0.54 - 0.46 * Math.cos((2 * Math.PI * k) / (n - 1));
  }
  return result;
}

/** Hann window: 0.5*(1 - cos(2π*k/(N-1))). */
export function hannWindow(n: number): number[] {
  const result: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    result[k] = 0.5 * (1 - Math.cos((2 * Math.PI * k) / (n - 1)));
  }
  return result;
}

/** Blackman window. */
export function blackmanWindow(n: number): number[] {
  const result: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    result[k] =
      0.42 -
      0.5 * Math.cos((2 * Math.PI * k) / (n - 1)) +
      0.08 * Math.cos((4 * Math.PI * k) / (n - 1));
  }
  return result;
}

/** Apply a window function to a signal (element-wise multiply). */
export function applyWindow(
  signal: number[],
  windowFn: (n: number) => number[]
): number[] {
  const w = windowFn(signal.length);
  return signal.map((v, i) => v * w[i]!);
}

// ─── IIR filters ─────────────────────────────────────────────────────────────

/**
 * Direct form II transposed IIR filter.
 * y[n] = b[0]*x[n] + b[1]*x[n-1] + ... - a[1]*y[n-1] - a[2]*y[n-2] - ...
 * a[0] is assumed to be 1 (normalized).
 */
export function iirFilter(signal: number[], b: number[], a: number[]): number[] {
  const n = signal.length;
  const nb = b.length;
  const na = a.length;
  const result: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let y = 0;
    for (let k = 0; k < nb; k++) {
      if (i - k >= 0) y += b[k]! * signal[i - k]!;
    }
    for (let k = 1; k < na; k++) {
      if (i - k >= 0) y -= a[k]! * result[i - k]!;
    }
    result[i] = y;
  }
  return result;
}

/**
 * 1st and 2nd order digital Butterworth lowpass filter.
 * Uses bilinear transform.
 */
export function butterworthLowpass(
  order: 1 | 2,
  cutoffFreq: number,
  sampleRate: number
): FilterCoefficients {
  const wc = 2 * Math.PI * cutoffFreq;
  const T = 1 / sampleRate;
  // Bilinear transform: s -> 2/T * (z-1)/(z+1); warp frequency
  const wd = (2 / T) * Math.tan(wc * T / 2);

  if (order === 1) {
    // H(s) = wd / (s + wd)
    // After bilinear: b = [wd, wd], a = [(2/T + wd), (-2/T + wd)]
    const k = wd * T / 2;
    const b0 = k / (1 + k);
    const b1 = k / (1 + k);
    const a1 = (k - 1) / (1 + k);
    return { b: [b0, b1], a: [1, a1] };
  } else {
    // 2nd order: H(s) = wd^2 / (s^2 + sqrt(2)*wd*s + wd^2)
    const k = wd * T / 2;
    const k2 = k * k;
    const sqrt2k = Math.SQRT2 * k;
    const norm = 1 + sqrt2k + k2;
    const b0 = k2 / norm;
    const b1 = 2 * k2 / norm;
    const b2 = k2 / norm;
    const a1 = (2 * k2 - 2) / norm;
    const a2 = (1 - sqrt2k + k2) / norm;
    return { b: [b0, b1, b2], a: [1, a1, a2] };
  }
}

/**
 * 1st and 2nd order digital Butterworth highpass filter.
 * Uses bilinear transform.
 */
export function butterworthHighpass(
  order: 1 | 2,
  cutoffFreq: number,
  sampleRate: number
): FilterCoefficients {
  const wc = 2 * Math.PI * cutoffFreq;
  const T = 1 / sampleRate;
  const wd = (2 / T) * Math.tan(wc * T / 2);

  if (order === 1) {
    // H(s) = s / (s + wd) -> highpass
    const k = wd * T / 2;
    const b0 = 1 / (1 + k);
    const b1 = -1 / (1 + k);
    const a1 = (k - 1) / (1 + k);
    return { b: [b0, b1], a: [1, a1] };
  } else {
    // 2nd order highpass
    const k = wd * T / 2;
    const k2 = k * k;
    const sqrt2k = Math.SQRT2 * k;
    const norm = 1 + sqrt2k + k2;
    const b0 = 1 / norm;
    const b1 = -2 / norm;
    const b2 = 1 / norm;
    const a1 = (2 * k2 - 2) / norm;
    const a2 = (1 - sqrt2k + k2) / norm;
    return { b: [b0, b1, b2], a: [1, a1, a2] };
  }
}

// ─── Kalman filter (scalar 1D) ────────────────────────────────────────────────

/** Kalman predict step: error variance increases by processNoise. */
export function kalmanPredict(state: KalmanState, processNoise: number): KalmanState {
  return {
    estimate: state.estimate,
    errorVariance: state.errorVariance + processNoise,
  };
}

/** Kalman update step: incorporate a measurement. */
export function kalmanUpdate(
  state: KalmanState,
  measurement: number,
  measurementNoise: number
): KalmanState {
  const K = state.errorVariance / (state.errorVariance + measurementNoise);
  return {
    estimate: state.estimate + K * (measurement - state.estimate),
    errorVariance: (1 - K) * state.errorVariance,
  };
}

/**
 * Run a full 1D Kalman filter over a measurements array.
 * Defaults: processNoise=0.01, measurementNoise=1.0
 * Initial estimate = measurements[0], initialVariance = 1.0
 */
export function kalmanFilter(
  measurements: number[],
  processNoise: number = 0.01,
  measurementNoise: number = 1.0,
  initialEstimate?: number,
  initialVariance: number = 1.0
): number[] {
  if (measurements.length === 0) return [];
  const est = initialEstimate !== undefined ? initialEstimate : measurements[0]!;
  let state: KalmanState = { estimate: est, errorVariance: initialVariance };
  const result: number[] = new Array(measurements.length);
  for (let i = 0; i < measurements.length; i++) {
    state = kalmanPredict(state, processNoise);
    state = kalmanUpdate(state, measurements[i]!, measurementNoise);
    result[i] = state.estimate;
  }
  return result;
}

// ─── Signal statistics ────────────────────────────────────────────────────────

/** Sum of squares. */
export function signalEnergy(signal: number[]): number {
  return signal.reduce((s, v) => s + v * v, 0);
}

/** Mean of squares. */
export function signalPower(signal: number[]): number {
  if (signal.length === 0) return 0;
  return signalEnergy(signal) / signal.length;
}

/** 10*log10(energy(signal)/energy(noise)). */
export function snrDb(signal: number[], noise: number[]): number {
  const es = signalEnergy(signal);
  const en = signalEnergy(noise);
  if (en === 0) return Infinity;
  return 10 * Math.log10(es / en);
}

/** Rate of sign changes per sample. */
export function zeroCrossingRate(signal: number[]): number {
  if (signal.length < 2) return 0;
  let count = 0;
  for (let i = 1; i < signal.length; i++) {
    if (signal[i - 1]! * signal[i]! < 0) count++;
  }
  return count / (signal.length - 1);
}

/** Root mean square. */
export function rms(signal: number[]): number {
  return Math.sqrt(signalPower(signal));
}

export function signalMean(signal: number[]): number {
  return _mean(signal);
}

export function signalVariance(signal: number[]): number {
  return _variance(signal);
}

export function signalStd(signal: number[]): number {
  return _stddev(signal);
}

/**
 * Normalize signal to [-1, 1].
 * If max abs value is 0, return zeros.
 */
export function normalize(signal: number[]): number[] {
  if (signal.length === 0) return [];
  const maxAbs = Math.max(...signal.map(Math.abs));
  if (maxAbs === 0) return signal.map(() => 0);
  return signal.map((v) => v / maxAbs);
}

/**
 * Subtract linear trend from series.
 * detrended[i] = values[i] - (slope*i + intercept)
 */
export function detrend(values: number[]): number[] {
  const { slope, intercept } = linearTrend(values);
  return values.map((v, i) => v - (slope * i + intercept));
}

// ─── Sports time-series applications ─────────────────────────────────────────

/**
 * EMA smoothing of odds movement.
 * Default alpha = 0.3.
 */
export function smoothOddsTimeSeries(odds: number[], alpha: number = 0.3): number[] {
  return exponentialMovingAverage(odds, alpha);
}

/**
 * Detect indices where |diff| > threshold (default 3.0 points).
 * Returns indices of the odds array where a spike occurs.
 */
export function detectLineMovementSpikes(
  odds: number[],
  threshold: number = 3.0
): number[] {
  const spikes: number[] = [];
  for (let i = 1; i < odds.length; i++) {
    if (Math.abs(odds[i]! - odds[i - 1]!) > threshold) {
      spikes.push(i);
    }
  }
  return spikes;
}

/** First difference array (length = N-1). */
export function oddsVelocity(odds: number[]): number[] {
  if (odds.length === 0) return [];
  const result: number[] = new Array(odds.length - 1);
  for (let i = 1; i < odds.length; i++) {
    result[i - 1] = odds[i]! - odds[i - 1]!;
  }
  return result;
}

/** Second difference (length = N-2). */
export function oddsAcceleration(odds: number[]): number[] {
  const v = oddsVelocity(odds);
  return oddsVelocity(v);
}

/**
 * Detect dominant period in performance time-series via FFT.
 * confidence = peak magnitude / mean magnitude ratio.
 * Default sampleRate = 1.
 */
export function performanceCycle(
  scores: number[],
  sampleRate: number = 1
): { dominant: number; confidence: number } {
  if (scores.length < 2) return { dominant: 0, confidence: 0 };

  const spectrum = fft(scores);
  const n = spectrum.length;
  const half = Math.floor(n / 2);
  const magnitudes: number[] = [];
  for (let k = 1; k <= half; k++) {
    magnitudes.push(complexAbs(spectrum[k]!));
  }

  if (magnitudes.length === 0) return { dominant: 0, confidence: 0 };

  const maxMag = Math.max(...magnitudes);
  const maxIdx = magnitudes.indexOf(maxMag);
  const binK = maxIdx + 1; // offset by 1 since we started at k=1
  const freq = (binK * sampleRate) / n;
  const dominant = freq === 0 ? 0 : 1 / freq;

  const meanMag = magnitudes.reduce((s, v) => s + v, 0) / magnitudes.length;
  const confidence = meanMag === 0 ? 0 : maxMag / meanMag;

  return { dominant, confidence };
}

/**
 * Detect winning streaks (consecutive 1s).
 * Returns start indices and lengths of each streak.
 */
export function streakDetection(wins: (0 | 1)[]): {
  starts: number[];
  lengths: number[];
} {
  const starts: number[] = [];
  const lengths: number[] = [];
  let i = 0;
  while (i < wins.length) {
    if (wins[i] === 1) {
      const start = i;
      while (i < wins.length && wins[i] === 1) i++;
      starts.push(start);
      lengths.push(i - start);
    } else {
      i++;
    }
  }
  return { starts, lengths };
}

// ─── Moving averages (legacy exports) ────────────────────────────────────────

/**
 * Simple Moving Average.
 * Returns array of same length; first (window-1) entries are NaN.
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
 * Simple 1D Kalman smoother (legacy interface).
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
    const xPred = x;
    const pPred = P + Q;
    const K = pPred / (pPred + R);
    x = xPred + K * (values[i]! - xPred);
    P = (1 - K) * pPred;
    result[i] = x;
  }
  return result;
}

/**
 * Cross-correlation between arrays a and b.
 * Returns array of { lag, correlation } for lag = -maxLag..+maxLag.
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
 * Autocorrelation of a series (legacy interface).
 * lag=0 is always 1.0.
 */
export function autocorrelation(values: number[], maxLag?: number): AutocorrResult[] {
  const results = crossCorrelation(values, values, maxLag);
  const zeroIdx = results.findIndex((r) => r.lag === 0);
  if (zeroIdx !== -1) results[zeroIdx] = { lag: 0, correlation: 1.0 };
  return results;
}

// ─── Trend analysis (legacy) ──────────────────────────────────────────────────

/**
 * OLS linear regression of index→value.
 * Returns slope, intercept, r², direction.
 */
export function linearTrend(values: number[]): TrendResult {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, direction: "flat" };
  if (n === 1) return { slope: 0, intercept: values[0]!, r2: 1, direction: "flat" };

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
 * Detect change points where abs(values[i] - values[i-1]) > threshold * stddev.
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

/**
 * Find peaks and valleys.
 * Edges (0 and n-1) are never peaks/valleys.
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

  const filteredPeaks = peaks.filter((peakIdx) => {
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

// ─── Spectral (legacy) ────────────────────────────────────────────────────────

/**
 * DFT magnitudes (O(n²)).
 * |X[k]| for k=0..n-1
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
 * Dominant non-DC frequency (legacy).
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

// ─── Rolling statistics (legacy) ──────────────────────────────────────────────

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
 * Median filter with replicate edge padding.
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
 */
export function savitzkyGolay(
  values: number[],
  windowSize: number,
  polyOrder: number
): number[] {
  const n = values.length;
  if (n === 0) return [];
  const half = Math.floor(windowSize / 2);
  const m = windowSize;
  const xs: number[] = [];
  for (let i = -half; i <= half; i++) xs.push(i);

  const deg = polyOrder + 1;
  const A: number[][] = xs.map((x) => {
    const row: number[] = [];
    for (let p = 0; p < deg; p++) row.push(Math.pow(x, p));
    return row;
  });

  const AtA: number[][] = Array.from({ length: deg }, () => new Array(deg).fill(0));
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < deg; j++) {
      for (let k = 0; k < m; k++) {
        AtA[i]![j]! += A[k]![i]! * A[k]![j]!;
      }
    }
  }

  const inv = invertMatrix(AtA, deg);

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

/**
 * Exponentially weighted moving average with given half-life.
 * alpha = 1 - exp(-ln(2)/halfLife)
 */
export function ewma(values: number[], halfLife: number): number[] {
  const alpha = 1 - Math.exp(-Math.LN2 / halfLife);
  return exponentialMovingAverage(values, alpha);
}

// ─── Gauss-Jordan matrix inversion (internal) ─────────────────────────────────

function invertMatrix(matrix: number[][], n: number): number[][] {
  const aug: number[][] = matrix.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) r.push(j === i ? 1 : 0);
    return r;
  });

  for (let col = 0; col < n; col++) {
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
