/**
 * Calibration evidence for synthetic signals.
 *
 * "Calibration before influence" — a probabilistic signal earns the right to influence anything only
 * once its forecasts match observed frequencies. This module builds a reliability curve and a Bayesian
 * (Beta-Binomial) posterior over a hit rate from REAL binary outcomes (1 = win, 0 = loss; pushes/voids
 * are excluded upstream). It is a generic curve builder; inside prediction-engine the adapter reuses
 * that package's own `reliabilityCurve` / `expectedCalibrationError` rather than recomputing them.
 *
 * Low sample sizes can NEVER be labelled "excellent" — small-N calibration is not evidence.
 */

import { curveIdFrom, calibrationTagFrom } from "./ids.js";
import type { CurveId, CalibrationTag } from "./brands.js";

/** A single (forecast, binary-outcome) observation. */
export interface CalibrationOutcomeSample {
  /** Forecast probability in [0,1]. */
  readonly p: number;
  /** Realized binary outcome: 1 = win, 0 = loss. */
  readonly y: 0 | 1;
}

export interface CalibrationPoint {
  binStart: number;
  binEnd: number;
  predictedProbability: number;
  observedFrequency: number;
  sampleCount: number;
  /** 1 − |predicted − observed| in the bin; 1 = perfectly calibrated bin. */
  binAccuracy: number;
}

export type ReliabilityLabel = `reliability:${"excellent" | "good" | "needs_improvement"}`;

export interface CalibrationCurveResult {
  points: CalibrationPoint[];
  expectedCalibrationError: number;
  maxCalibrationError: number;
  totalSamples: number;
  overallReliability: ReliabilityLabel;
  curveId: CurveId;
}

export interface BayesianCalibrationResult {
  priorAlpha: number;
  priorBeta: number;
  posteriorAlpha: number;
  posteriorBeta: number;
  posteriorMean: number;
  credibleIntervalLow: number;
  credibleIntervalHigh: number;
  sampleCount: number;
  calibrationTag: CalibrationTag;
}

/** Below this, calibration can never be "excellent". */
export const MIN_SAMPLES_FOR_GOOD = 50;
/** Below this, calibration can never exceed "good". */
export const MIN_SAMPLES_FOR_EXCELLENT = 200;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(value: number, digits = 4): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

function binIndex(p: number, bins: number): number {
  const i = Math.floor(clamp01(p) * bins);
  return i === bins ? bins - 1 : i; // p === 1 lands in the last bin
}

// ───────────────────────── exact Beta credible interval ─────────────────────────
// The Beta-Binomial posterior over a hit rate is Beta(a,b). A normal approximation to its interval is
// inaccurate exactly where a calibration gate operates — small samples and means near the boundary. So
// we invert the real distribution: the regularized incomplete beta I_x(a,b) (Lanczos logΓ + the
// Numerical-Recipes continued fraction) gives the CDF, and bisection inverts it for a quantile. Pure,
// deterministic, no dependencies.

function logGamma(x: number): number {
  const c = [
    0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const xx = x - 1;
  const t = xx + 7.5;
  let a = c[0]!;
  for (let i = 1; i < 9; i++) a += c[i]! / (xx + i);
  return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** The regularized incomplete beta function I_x(a,b) — the CDF of Beta(a,b). */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

/** The p-quantile of Beta(a,b) via bisection on its CDF. */
export function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (regularizedIncompleteBeta(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Reliability label from ECE + sample count. Small samples are capped: below the "good" threshold the
 * label is always `needs_improvement`; "excellent" additionally requires a large sample.
 */
export function reliabilityLabel(ece: number, sampleCount: number): ReliabilityLabel {
  if (sampleCount < MIN_SAMPLES_FOR_GOOD) return "reliability:needs_improvement";
  if (ece <= 0.02 && sampleCount >= MIN_SAMPLES_FOR_EXCELLENT) return "reliability:excellent";
  if (ece <= 0.05) return "reliability:good";
  return "reliability:needs_improvement";
}

/** Build the reliability curve over `bins` equal-width bins. */
export function buildCalibrationCurve(
  samples: readonly CalibrationOutcomeSample[],
  bins = 10,
): CalibrationCurveResult {
  const nBins = Math.max(1, Math.trunc(bins));
  const counts: number[] = new Array<number>(nBins).fill(0);
  const forecastSums: number[] = new Array<number>(nBins).fill(0);
  const outcomeSums: number[] = new Array<number>(nBins).fill(0);

  for (const s of samples) {
    if (s.y !== 0 && s.y !== 1) {
      throw new Error("buildCalibrationCurve: outcomes must be binary 0/1 (exclude pushes/voids upstream)");
    }
    const b = binIndex(s.p, nBins);
    counts[b] = (counts[b] ?? 0) + 1;
    forecastSums[b] = (forecastSums[b] ?? 0) + clamp01(s.p);
    outcomeSums[b] = (outcomeSums[b] ?? 0) + s.y;
  }

  const points: CalibrationPoint[] = [];
  for (let b = 0; b < nBins; b++) {
    const nk = counts[b] ?? 0;
    const predicted = nk > 0 ? round((forecastSums[b] ?? 0) / nk) : 0;
    const observed = nk > 0 ? round((outcomeSums[b] ?? 0) / nk) : 0;
    points.push({
      binStart: round(b / nBins),
      binEnd: round((b + 1) / nBins),
      predictedProbability: predicted,
      observedFrequency: observed,
      sampleCount: nk,
      binAccuracy: nk > 0 ? round(1 - Math.abs(predicted - observed)) : 0,
    });
  }

  const totalSamples = samples.length;
  const ece = expectedCalibrationErrorFromPoints(points);
  const mce = maxCalibrationErrorFromPoints(points);
  const overallReliability = reliabilityLabel(ece, totalSamples);
  const curveId = curveIdFrom(`n${totalSamples}-ece${Math.round(ece * 1000)}-b${nBins}`);

  return { points, expectedCalibrationError: ece, maxCalibrationError: mce, totalSamples, overallReliability, curveId };
}

/** Sample-weighted mean gap between predicted and observed across populated bins. */
export function expectedCalibrationErrorFromPoints(points: readonly CalibrationPoint[]): number {
  const total = points.reduce((sum, p) => sum + p.sampleCount, 0);
  if (total === 0) return 0;
  let ece = 0;
  for (const p of points) {
    if (p.sampleCount === 0) continue;
    ece += (p.sampleCount / total) * Math.abs(p.predictedProbability - p.observedFrequency);
  }
  return round(ece);
}

/** Largest predicted-vs-observed gap across populated bins. */
export function maxCalibrationErrorFromPoints(points: readonly CalibrationPoint[]): number {
  let mce = 0;
  for (const p of points) {
    if (p.sampleCount === 0) continue;
    mce = Math.max(mce, Math.abs(p.predictedProbability - p.observedFrequency));
  }
  return round(mce);
}

export interface BetaPosteriorArgs {
  /** Prior pseudo-wins (default 1 — a uniform Beta(1,1) prior). */
  priorAlpha?: number;
  /** Prior pseudo-losses (default 1). */
  priorBeta?: number;
  /** Observed wins. */
  successes: number;
  /** Observed binary trials. */
  trials: number;
  /** Optional label for the calibration tag. */
  label?: string;
}

/**
 * Beta-Binomial posterior over a hit rate. The 95% credible interval uses the normal approximation to
 * the Beta (mean ± 1.96·sd, clamped to [0,1]) — adequate for a governance gate and fully deterministic.
 */
export function betaPosteriorCalibration(args: BetaPosteriorArgs): BayesianCalibrationResult {
  const priorAlpha = args.priorAlpha ?? 1;
  const priorBeta = args.priorBeta ?? 1;
  const trials = Math.max(0, Math.trunc(args.trials));
  const successes = Math.max(0, Math.min(trials, Math.trunc(args.successes)));
  if (priorAlpha <= 0 || priorBeta <= 0) {
    throw new Error("betaPosteriorCalibration: prior alpha/beta must be > 0");
  }

  const posteriorAlpha = priorAlpha + successes;
  const posteriorBeta = priorBeta + (trials - successes);
  const a = posteriorAlpha;
  const b = posteriorBeta;
  const posteriorMean = a / (a + b);
  // Exact 95% equal-tailed credible interval from the Beta posterior (not a normal approximation).
  const credibleIntervalLow = round(clamp01(betaQuantile(0.025, a, b)));
  const credibleIntervalHigh = round(clamp01(betaQuantile(0.975, a, b)));

  return {
    priorAlpha,
    priorBeta,
    posteriorAlpha,
    posteriorBeta,
    posteriorMean: round(posteriorMean),
    credibleIntervalLow,
    credibleIntervalHigh,
    sampleCount: trials,
    calibrationTag: calibrationTagFrom(args.label ?? `n${trials}`),
  };
}
