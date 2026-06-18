/**
 * Calibration ladder — path-to-70.md Step 1, the honest way.
 *
 * THE GAPS THIS CLOSES (vs calibration-apply.ts today)
 *   1. ISOTONIC-ONLY. Isotonic/PAVA overfits below ~1000 samples — and GSN will be
 *      small-n for a long time. We add PLATT/sigmoid (regularised, small-n-safe)
 *      and a Wilson-bounded BINNED-EMPIRICAL map, and pick among them.
 *   2. IN-SAMPLE VALIDATION. buildCalibrator fits AND validates ECE on the SAME
 *      sample (calibratedEce ≤ rawEce on the fitted data) — the leakage trap. We
 *      select the method by HELD-OUT, TIME-ORDERED ECE (train on the past, score
 *      on the held-out future), then refit the winner on all data. No leakage.
 *   3. NO CONSERVATIVE FLOOR. The public "this tier wins ~70%" claim must be
 *      defensible on thin samples. We expose a WILSON LOWER-BOUND per bucket as the
 *      honest floor, alongside the point estimate.
 *
 * Same posture as the rest of the calibration toolkit: PURE, fully tested, and
 * NOT wired into live scoring. Activation is a founder-gated MODEL_VERSION step
 * (the model is frozen). Inputs are settled (forecastProbability, outcome) samples
 * assumed in CHRONOLOGICAL order (oldest → newest) so the held-out split is a real
 * out-of-sample test, not a random one.
 */

import { clamp } from "./scoring.js";
import {
  isotonicCalibration,
  expectedCalibrationError,
  type CalibrationSample,
} from "./probability-calibration.js";
import { wilsonInterval } from "./model-limitations.js";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}
function round(v: number, d = 4): number {
  const s = 10 ** d;
  const r = Math.round(v * s) / s;
  return r === 0 ? 0 : r;
}

// ============================================================
// Platt scaling (sigmoid) — the small-n calibrator
// ============================================================

export interface PlattModel {
  /** Slope on the forecast. */
  readonly a: number;
  /** Intercept. */
  readonly b: number;
  /** calibrated = sigmoid(a·forecast + b), clamped to [0,1]. */
  readonly predict: (forecast: number) => number;
}

/**
 * Fit calibrated = sigmoid(a·p + b) by minimising log-loss with Platt's target
 * smoothing (so all-win/all-loss buckets don't push the fit to ±∞). Solved by
 * averaged-gradient descent — stable even when forecasts are near-constant (where
 * a Newton step is ill-conditioned). Empty input → identity.
 */
export function plattScaling(samples: readonly CalibrationSample[]): PlattModel {
  const n = samples.length;
  if (n === 0) {
    return { a: 1, b: 0, predict: (p) => clamp01(p) };
  }
  const np = samples.reduce((s, x) => s + x.y, 0);
  const nn = n - np;
  // Platt's smoothed targets — regularise toward the prior, away from hard 0/1.
  const tPos = (np + 1) / (np + 2);
  const tNeg = 1 / (nn + 2);

  let a = 1;
  let b = 0;
  const lr = 1.0;
  for (let iter = 0; iter < 600; iter++) {
    let ga = 0;
    let gb = 0;
    for (const s of samples) {
      const f = clamp01(s.p);
      const t = s.y === 1 ? tPos : tNeg;
      const d = sigmoid(a * f + b) - t;
      ga += d * f;
      gb += d;
    }
    ga /= n;
    gb /= n;
    a -= lr * ga;
    b -= lr * gb;
    if (Math.abs(ga) < 1e-9 && Math.abs(gb) < 1e-9) break;
  }

  return {
    a: round(a, 6),
    b: round(b, 6),
    predict: (p) => clamp01(sigmoid(a * clamp01(p) + b)),
  };
}

// ============================================================
// Binned-empirical map with Wilson lower bound + base-rate shrink
// ============================================================

export interface EmpiricalBin {
  readonly lo: number;
  readonly hi: number;
  readonly count: number;
  readonly observedRate: number;
  /** Wilson lower bound on the bin's win rate — the defensible public floor. */
  readonly wilsonLow: number;
  readonly wilsonHigh: number;
  /** Observed rate shrunk toward the global base rate when the bin is thin. */
  readonly calibrated: number;
}

export interface BinnedEmpiricalModel {
  readonly bins: readonly EmpiricalBin[];
  readonly baseRate: number;
  /** Point estimate: the containing bin's base-rate-shrunk observed win rate. */
  readonly predict: (forecast: number) => number;
  /** Conservative floor: the containing bin's Wilson lower bound. */
  readonly predictLowerBound: (forecast: number) => number;
}

export interface BinnedEmpiricalOptions {
  /** Number of equal-width bins over [0,1]. Default 10. */
  readonly bins?: number;
  /** Pseudo-count for base-rate shrinkage: weight = n/(n+shrinkK). Default 20. */
  readonly shrinkK?: number;
}

function binIndexFor(p: number, bins: number): number {
  const i = Math.floor(clamp01(p) * bins);
  return i === bins ? bins - 1 : i;
}

/**
 * Empirical reliability map: each forecast is mapped to the observed win rate of
 * its bucket, shrunk toward the base rate when the bucket is thin, with a Wilson
 * lower bound retained as the honest public floor.
 */
export function binnedEmpiricalCalibration(
  samples: readonly CalibrationSample[],
  opts: BinnedEmpiricalOptions = {},
): BinnedEmpiricalModel {
  const binCount = Math.max(1, Math.floor(opts.bins ?? 10));
  const shrinkK = Math.max(0, opts.shrinkK ?? 20);
  const n = samples.length;
  const baseRate = n > 0 ? samples.reduce((s, x) => s + x.y, 0) / n : 0;

  const counts = new Array<number>(binCount).fill(0);
  const wins = new Array<number>(binCount).fill(0);
  for (const s of samples) {
    const b = binIndexFor(s.p, binCount);
    counts[b] = (counts[b] ?? 0) + 1;
    wins[b] = (wins[b] ?? 0) + s.y;
  }

  const bins: EmpiricalBin[] = [];
  for (let b = 0; b < binCount; b++) {
    const c = counts[b] ?? 0;
    const observedRate = c > 0 ? (wins[b] ?? 0) / c : baseRate;
    const { low, high } = wilsonInterval(observedRate, c);
    const w = c + shrinkK > 0 ? c / (c + shrinkK) : 0;
    const calibrated = clamp01(w * observedRate + (1 - w) * baseRate);
    bins.push({
      lo: round(b / binCount),
      hi: round((b + 1) / binCount),
      count: c,
      observedRate: round(observedRate),
      wilsonLow: round(low),
      wilsonHigh: round(high),
      calibrated: round(calibrated),
    });
  }

  const predict = (p: number): number => bins[binIndexFor(p, binCount)]!.calibrated;
  const predictLowerBound = (p: number): number => bins[binIndexFor(p, binCount)]!.wilsonLow;

  return { bins, baseRate: round(baseRate), predict, predictLowerBound };
}

// ============================================================
// Ladder — held-out, time-ordered method selection
// ============================================================

export type CalibrationMethod = "identity" | "isotonic" | "platt" | "binned";

export interface CalibratedLadderProbability {
  readonly probability: number;
  readonly calibrated: boolean;
  readonly method: CalibrationMethod;
}

export interface CalibrationLadder {
  readonly isActive: boolean;
  /** The method selected by held-out ECE (or "identity" when nothing improves). */
  readonly method: CalibrationMethod;
  readonly sampleSize: number;
  readonly minSample: number;
  readonly trainSize: number;
  readonly validationSize: number;
  /** Held-out ECE per method (identity = raw). Lower is better. */
  readonly heldOutEce: Readonly<Record<CalibrationMethod, number>>;
  readonly inactiveReason: string;
  /** confidence 0–100 → calibrated win probability (identity passthrough when inactive). */
  readonly apply: (confidence0to100: number) => CalibratedLadderProbability;
  /** confidence 0–100 → the Wilson conservative floor for that bucket (always available). */
  readonly lowerBound: (confidence0to100: number) => number;
}

export const DEFAULT_LADDER_MIN_SAMPLE = 100;
const MIN_SPLIT_PER_SIDE = 10;

function eceOf(forecasts: readonly CalibrationSample[], map: (p: number) => number): number {
  return expectedCalibrationError(forecasts.map((s) => ({ p: clamp01(map(s.p)), y: s.y })));
}

/**
 * Build a calibration map by HONEST selection: fit isotonic / Platt / binned on a
 * time-ordered TRAIN split, score each on the held-out FUTURE split, pick the
 * lowest held-out ECE that beats the raw (identity) forecast, then refit the
 * winner on ALL samples. Inactive (identity passthrough) until there is enough
 * data AND a method genuinely improves out-of-sample calibration.
 *
 * `samples` MUST be chronological (oldest → newest).
 */
export function buildCalibrationLadder(
  samples: readonly CalibrationSample[],
  opts: { readonly minSample?: number; readonly holdoutFraction?: number } = {},
): CalibrationLadder {
  const minSample = opts.minSample ?? DEFAULT_LADDER_MIN_SAMPLE;
  const holdoutFraction = clamp(opts.holdoutFraction ?? 0.3, 0.1, 0.5);
  const sampleSize = samples.length;

  // Full-data binned model is always available for the conservative floor.
  const fullBinned = binnedEmpiricalCalibration(samples);
  const lowerBound = (confidence: number): number =>
    fullBinned.predictLowerBound(clamp01((Number.isFinite(confidence) ? confidence : 0) / 100));

  const identityApply = (reason: string): CalibrationLadder => ({
    isActive: false,
    method: "identity",
    sampleSize,
    minSample,
    trainSize: 0,
    validationSize: 0,
    heldOutEce: { identity: 0, isotonic: 0, platt: 0, binned: 0 },
    inactiveReason: reason,
    apply: (confidence: number) => ({
      probability: clamp01((Number.isFinite(confidence) ? confidence : 0) / 100),
      calibrated: false,
      method: "identity",
    }),
    lowerBound,
  });

  if (sampleSize < minSample) {
    return identityApply(`settled sample ${sampleSize} is below the minimum ${minSample}`);
  }

  const splitAt = Math.floor(sampleSize * (1 - holdoutFraction));
  const train = samples.slice(0, splitAt);
  const validation = samples.slice(splitAt);
  if (train.length < MIN_SPLIT_PER_SIDE || validation.length < MIN_SPLIT_PER_SIDE) {
    return identityApply(
      `insufficient split (train ${train.length}, validation ${validation.length})`,
    );
  }

  // Fit each candidate on TRAIN only.
  const isoTrain = isotonicCalibration(train);
  const plattTrain = plattScaling(train);
  const binnedTrain = binnedEmpiricalCalibration(train);

  const heldOutEce: Record<CalibrationMethod, number> = {
    identity: round(eceOf(validation, (p) => p), 4),
    isotonic: round(eceOf(validation, (p) => isoTrain.predict(p)), 4),
    platt: round(eceOf(validation, (p) => plattTrain.predict(p)), 4),
    binned: round(eceOf(validation, (p) => binnedTrain.predict(p)), 4),
  };

  // Prefer the more-regularised method on small samples (research: Platt until
  // ~1000 settled, then isotonic). Scan in preference order, keep strict best.
  const order: CalibrationMethod[] =
    sampleSize >= 1000 ? ["isotonic", "platt", "binned"] : ["platt", "isotonic", "binned"];
  let best: CalibrationMethod = "identity";
  let bestEce = heldOutEce.identity;
  for (const m of order) {
    if (heldOutEce[m] < bestEce - 1e-9) {
      best = m;
      bestEce = heldOutEce[m];
    }
  }

  if (best === "identity") {
    return {
      ...identityApply("no method improves held-out calibration over the raw forecast"),
      trainSize: train.length,
      validationSize: validation.length,
      heldOutEce,
    };
  }

  // Refit the winner on ALL samples (select out-of-sample, fit on everything).
  const isoFull = best === "isotonic" ? isotonicCalibration(samples) : null;
  const plattFull = best === "platt" ? plattScaling(samples) : null;
  const binnedFull = best === "binned" ? fullBinned : null;

  const mapFull = (p: number): number => {
    const base = clamp01(p);
    if (isoFull) return clamp01(isoFull.predict(base));
    if (plattFull) return clamp01(plattFull.predict(base));
    if (binnedFull) return clamp01(binnedFull.predict(base));
    return base;
  };

  return {
    isActive: true,
    method: best,
    sampleSize,
    minSample,
    trainSize: train.length,
    validationSize: validation.length,
    heldOutEce,
    inactiveReason: "",
    apply: (confidence: number) => {
      const base = clamp01((Number.isFinite(confidence) ? confidence : 0) / 100);
      return { probability: round(mapFull(base)), calibrated: true, method: best };
    },
    lowerBound,
  };
}
