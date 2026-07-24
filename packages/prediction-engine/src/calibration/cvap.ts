/**
 * Cross Venn-Abers Predictor (CVAP)
 *
 * K-fold inductive Venn-Abers with log-space geometric-mean aggregation.
 * For a test score, each fold trains an IVAP on the complementary calibration
 * points and produces a multiprobability; the fold multiprobabilities are
 * then aggregated via the minimax (log-space geometric mean) rule from
 * aggregation.ts. Yields tighter intervals than single IVAP while preserving
 * finite-sample validity under exchangeability (within the usual caveats of
 * the inductive/cross construction).
 *
 * Pure TypeScript, side-effect free. Does not modify existing IVAP/PAV.
 *
 * Reference: Vovk et al. Inductive / Cross Venn-Abers predictors.
 */

import {
  InductiveVennAbers,
  type IvapCalibrationPoint,
  type IvapPrediction,
} from "./ivap.js";
import {
  logSpaceGeometricMeanAggregation,
  arithmeticMeanAggregation,
  toFull,
  type Multiprobability,
  type FullMultiprobability,
} from "./aggregation.js";

export type CvapAggregationMode = "geometric" | "arithmetic";

export interface CvapOptions {
  /** Number of folds (default 5). Must be >= 2 and <= calibration size. */
  readonly folds?: number;
  /** Aggregation rule across folds (default geometric / minimax). */
  readonly aggregation?: CvapAggregationMode;
  /** Optional seed for deterministic fold assignment (simple LCG). */
  readonly seed?: number;
}

export interface CvapPrediction extends FullMultiprobability {
  readonly foldPredictions: readonly Multiprobability[];
  readonly aggregation: CvapAggregationMode;
  readonly foldsUsed: number;
}

/**
 * Deterministic fold assignment via a tiny LCG so results are reproducible
 * given the same seed and point order. Not cryptographic.
 */
function assignFolds(n: number, k: number, seed: number): number[] {
  let state = seed >>> 0;
  const folds = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    folds[i] = state % k;
  }
  // Ensure every fold receives at least one point when n >= k
  if (n >= k) {
    const seen = new Set(folds);
    let next = 0;
    for (let f = 0; f < k; f++) {
      if (!seen.has(f)) {
        folds[next % n] = f;
        next += 1;
      }
    }
  }
  return folds;
}

/**
 * Fit / predict with Cross Venn-Abers.
 *
 * @param calibration Full calibration set of (score, label) pairs.
 * @param testScore Score for which multiprobability is required.
 * @param options folds, aggregation mode, seed.
 */
export function cvapPredict(
  calibration: readonly IvapCalibrationPoint[],
  testScore: number,
  options: CvapOptions = {},
): CvapPrediction {
  const n = calibration.length;
  if (n === 0) {
    return {
      p0: 0.5,
      p1: 0.5,
      midpoint: 0.5,
      width: 0,
      foldPredictions: [],
      aggregation: options.aggregation ?? "geometric",
      foldsUsed: 0,
    };
  }

  const requestedFolds = options.folds ?? Math.min(5, n);
  const K = Math.max(2, Math.min(requestedFolds, n));
  const aggregation: CvapAggregationMode = options.aggregation ?? "geometric";
  const seed = options.seed ?? 0xC0FFEE;

  const foldIds = assignFolds(n, K, seed);

  const foldPredictions: Multiprobability[] = [];

  for (let f = 0; f < K; f++) {
    const train: IvapCalibrationPoint[] = [];
    for (let i = 0; i < n; i++) {
      if (foldIds[i] !== f) {
        train.push(calibration[i]!);
      }
    }
    // If a fold ends up empty of training points (pathological), fall back to full set
    const trainSet = train.length > 0 ? train : [...calibration];
    const ivap = new InductiveVennAbers(trainSet);
    const pred = ivap.predict(testScore);
    foldPredictions.push({ p0: pred.p0, p1: pred.p1 });
  }

  const aggregated =
    aggregation === "geometric"
      ? logSpaceGeometricMeanAggregation(foldPredictions)
      : arithmeticMeanAggregation(foldPredictions);

  const full = toFull(aggregated);

  return {
    ...full,
    foldPredictions,
    aggregation,
    foldsUsed: K,
  };
}

/**
 * Convenience class mirroring InductiveVennAbers API for drop-in use.
 */
export class CrossVennAbers {
  private readonly calibration: readonly IvapCalibrationPoint[];
  private readonly options: CvapOptions;

  constructor(calibration: readonly IvapCalibrationPoint[], options: CvapOptions = {}) {
    this.calibration = calibration;
    this.options = options;
  }

  predict(testScore: number): CvapPrediction {
    return cvapPredict(this.calibration, testScore, this.options);
  }
}

/** Factory */
export function fitCvap(
  calibration: readonly IvapCalibrationPoint[],
  options: CvapOptions = {},
): CrossVennAbers {
  return new CrossVennAbers(calibration, options);
}
