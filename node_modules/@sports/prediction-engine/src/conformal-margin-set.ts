/**
 * Split-conformal prediction SET for game margin — first-party, not wired.
 *
 * Existing conformal-intervals.ts / tweedie-aci.ts cover FANTASY POINTS
 * (Mondrian by position, Adaptive Conformal Inference). This module is the
 * betting-margin analogue: given a predicted mean margin and a calibration
 * sample of (predicted, actual) margins, return the smallest integer set
 * {m : |m − pred| ≤ q} that has finite-sample coverage 1 − α.
 *
 * Honesty:
 *   - n < MIN_SAMPLES_MARGIN_SET → status insufficient_sample, empty set.
 *   - Quantile is the split-conformal ceil((n+1)(1−α)) order statistic
 *     (same correction as conformal-intervals.ts). Without it, small-n
 *     sets undercover.
 *   - Mondrian by sportKey so NHL residuals never price an NFL spread.
 *   - Pure. No I/O. Not a live pick input.
 *
 * Reference: Vovk, Gammerman, Shafer — Algorithmic Learning in a Random World
 * (split conformal); Lei, G'Sell, Rinaldo, Tibshirani, Wasserman (2018).
 */

export const MIN_SAMPLES_MARGIN_SET = 64;
export const DEFAULT_MARGIN_SET_ALPHA = 0.1;

export interface MarginCalibrationRow {
  readonly predictedMean: number;
  readonly actualMargin: number;
  readonly sportKey: string;
}

export interface MarginPredictionSet {
  readonly predictedMean: number;
  readonly sportKey: string;
  readonly halfWidth: number;
  readonly lower: number;
  readonly upper: number;
  /** Integer margins inside the set, ascending. Empty when we refuse. */
  readonly integers: readonly number[];
  readonly alpha: number;
  readonly n: number;
  readonly status: "ok" | "insufficient_sample";
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Split-conformal finite-sample quantile: ceil((n+1) * p)-th order statistic,
 * 1-indexed, clamped to the sample. Matches conformal-intervals.ts.
 */
export function splitConformalQuantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  if (!Number.isFinite(probability) || probability <= 0) return values[0] ?? 0;
  if (probability >= 1) {
    const sortedAll = [...values].sort((a, b) => a - b);
    return sortedAll[sortedAll.length - 1] ?? 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((sorted.length + 1) * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
}

function integersInClosedInterval(lower: number, upper: number): number[] {
  const start = Math.ceil(lower);
  const end = Math.floor(upper);
  if (end < start) return [];
  const out: number[] = [];
  for (let m = start; m <= end; m++) out.push(m);
  return out;
}

export function conformalMarginSet(args: {
  readonly predictedMean: number;
  readonly sportKey: string;
  readonly calibration: readonly MarginCalibrationRow[];
  readonly alpha?: number;
  readonly minSamples?: number;
}): MarginPredictionSet {
  const alpha = args.alpha ?? DEFAULT_MARGIN_SET_ALPHA;
  const minSamples = args.minSamples ?? MIN_SAMPLES_MARGIN_SET;
  const empty = (n: number): MarginPredictionSet => ({
    predictedMean: args.predictedMean,
    sportKey: args.sportKey,
    halfWidth: 0,
    lower: args.predictedMean,
    upper: args.predictedMean,
    integers: [],
    alpha,
    n,
    status: "insufficient_sample",
  });

  if (!Number.isFinite(args.predictedMean)) return empty(0);
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) return empty(0);

  const sport = args.sportKey.toLowerCase();
  const rows = args.calibration.filter((row) => {
    if (row.sportKey.toLowerCase() !== sport) return false;
    return Number.isFinite(row.predictedMean) && Number.isFinite(row.actualMargin);
  });
  if (rows.length < minSamples) return empty(rows.length);

  const residuals = rows.map((row) => Math.abs(row.actualMargin - row.predictedMean));
  const halfWidth = splitConformalQuantile(residuals, 1 - alpha);
  const lower = round4(args.predictedMean - halfWidth);
  const upper = round4(args.predictedMean + halfWidth);

  return {
    predictedMean: args.predictedMean,
    sportKey: args.sportKey,
    halfWidth: round4(halfWidth),
    lower,
    upper,
    integers: integersInClosedInterval(lower, upper),
    alpha,
    n: rows.length,
    status: "ok",
  };
}

/** True when the realised margin landed inside the published set. */
export function marginSetCovers(set: MarginPredictionSet, actualMargin: number): boolean {
  if (set.status !== "ok") return false;
  if (!Number.isFinite(actualMargin)) return false;
  return actualMargin >= set.lower && actualMargin <= set.upper;
}
