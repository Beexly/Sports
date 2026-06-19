/**
 * Conformal prediction intervals — pure math, zero dependencies.
 *
 * Split conformal prediction (Venn-Abers / inductive CP) gives honest
 * coverage guarantees for probability estimates. This implementation
 * follows the MAPIE paper (Angelopoulos & Bates 2021) patterns but
 * is re-implemented TS-native.
 *
 * INERT: these are analytical utilities, not connected to the prediction
 * model. They compute intervals on arbitrary probability sequences.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Quantile of a sorted array at level q in [0,1]. */
function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface ConformalCalibrationResult {
  /** The nonconformity scores (|y - p_hat| for regression-style CP) */
  readonly scores: readonly number[];
  /** Empirical quantile at the target coverage level */
  readonly qHat: number;
  /** Achieved coverage level */
  readonly coverageLevel: number;
}

export interface ConformalInterval {
  readonly lower: number; // 0–1
  readonly upper: number; // 0–1
  readonly width: number; // upper - lower
}

// ---------------------------------------------------------------------------
// calibrateConformal
// ---------------------------------------------------------------------------

/**
 * Calibrate conformal nonconformity scores from a calibration set.
 *
 * For binary outcomes:
 * - scores[i] = |true_outcome[i] - predicted_prob[i]|
 * - qHat = ceil((n+1)*(1-alpha)) / n quantile of scores
 *
 * @param predictedProbs - Model's predicted probabilities (0–1)
 * @param trueOutcomes   - Actual outcomes (0 or 1)
 * @param alpha          - Miscoverage level (default 0.1 = 90% coverage)
 */
export function calibrateConformal(
  predictedProbs: readonly number[],
  trueOutcomes: readonly (0 | 1)[],
  alpha = 0.1,
): ConformalCalibrationResult {
  if (predictedProbs.length !== trueOutcomes.length) {
    throw new Error(
      `calibrateConformal: predictedProbs.length (${predictedProbs.length}) !== trueOutcomes.length (${trueOutcomes.length})`,
    );
  }
  if (predictedProbs.length === 0) {
    return { scores: [], qHat: 0, coverageLevel: 1 - alpha };
  }

  const n = predictedProbs.length;
  const scores = predictedProbs.map((p, i) => Math.abs((trueOutcomes[i] as number) - p));

  // The MAPIE formula: qHat = ceil((n+1)*(1-alpha)) / n quantile.
  // We compute the index as ceil((n+1)*(1-alpha)) - 1 (0-based), capped at n-1.
  const rawIdx = Math.ceil((n + 1) * (1 - alpha));
  const idx = Math.min(rawIdx - 1, n - 1);

  const sorted = [...scores].sort((a, b) => a - b);
  const qHat = sorted[idx]!;

  return {
    scores,
    qHat,
    coverageLevel: 1 - alpha,
  };
}

// ---------------------------------------------------------------------------
// conformalInterval
// ---------------------------------------------------------------------------

/**
 * Compute a conformal prediction interval for a new prediction.
 *
 * Given a calibrated qHat, the interval is [p_hat - qHat, p_hat + qHat]
 * clipped to [0, 1].
 */
export function conformalInterval(predictedProb: number, qHat: number): ConformalInterval {
  const lower = clamp01(predictedProb - qHat);
  const upper = clamp01(predictedProb + qHat);
  return { lower, upper, width: upper - lower };
}

// ---------------------------------------------------------------------------
// conformalPrediction — full pipeline
// ---------------------------------------------------------------------------

/**
 * Full pipeline: calibrate from hold-out set, then predict interval
 * for a new probability estimate.
 */
export function conformalPrediction(params: {
  calPredictedProbs: readonly number[];
  calTrueOutcomes: readonly (0 | 1)[];
  newPredictedProb: number;
  alpha?: number;
}): { interval: ConformalInterval; calibration: ConformalCalibrationResult } {
  const { calPredictedProbs, calTrueOutcomes, newPredictedProb, alpha = 0.1 } = params;

  const calibration = calibrateConformal(calPredictedProbs, calTrueOutcomes, alpha);
  const interval = conformalInterval(newPredictedProb, calibration.qHat);

  return { interval, calibration };
}

// ---------------------------------------------------------------------------
// reliabilityCurve
// ---------------------------------------------------------------------------

/**
 * Reliability curve data points for plotting.
 * Groups predicted probabilities into bins and computes actual frequency.
 */
export function reliabilityCurve(params: {
  predictedProbs: readonly number[];
  trueOutcomes: readonly (0 | 1)[];
  nBins?: number; // default 10
}): ReadonlyArray<{
  readonly binCenter: number;
  readonly predictedMean: number;
  readonly actualFrequency: number;
  readonly count: number;
}> {
  const { predictedProbs, trueOutcomes, nBins = 10 } = params;

  const binCount = new Array<number>(nBins).fill(0);
  const binPredSum = new Array<number>(nBins).fill(0);
  const binOutcomeSum = new Array<number>(nBins).fill(0);

  for (let i = 0; i < predictedProbs.length; i++) {
    const p = clamp01(predictedProbs[i]!);
    const y = trueOutcomes[i]!;
    const rawBin = Math.floor(p * nBins);
    const b = rawBin === nBins ? nBins - 1 : rawBin;
    binCount[b]! += 1;
    binPredSum[b]! += p;
    binOutcomeSum[b]! += y;
  }

  return Array.from({ length: nBins }, (_, b) => {
    const count = binCount[b]!;
    const binCenter = (b + 0.5) / nBins;
    if (count === 0) {
      return { binCenter, predictedMean: binCenter, actualFrequency: 0, count: 0 };
    }
    return {
      binCenter,
      predictedMean: binPredSum[b]! / count,
      actualFrequency: binOutcomeSum[b]! / count,
      count,
    };
  });
}

// ---------------------------------------------------------------------------
// expectedCalibrationError
// ---------------------------------------------------------------------------

/**
 * Expected Calibration Error (ECE) — mean absolute difference between
 * predicted probability and actual frequency, weighted by bin size.
 */
export function expectedCalibrationError(
  predictedProbs: readonly number[],
  trueOutcomes: readonly (0 | 1)[],
  nBins = 10,
): number {
  const n = predictedProbs.length;
  if (n === 0) return 0;

  const bins = reliabilityCurve({ predictedProbs, trueOutcomes, nBins });
  let ece = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    ece += (bin.count / n) * Math.abs(bin.predictedMean - bin.actualFrequency);
  }
  return ece;
}

// ---------------------------------------------------------------------------
// brierScore
// ---------------------------------------------------------------------------

/** Brier score: mean squared error for probability forecasts. */
export function brierScore(
  predictedProbs: readonly number[],
  trueOutcomes: readonly (0 | 1)[],
): number {
  const n = predictedProbs.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const diff = predictedProbs[i]! - trueOutcomes[i]!;
    sum += diff * diff;
  }
  return sum / n;
}
