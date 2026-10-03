/**
 * Multiprobability aggregation utilities for Cross Venn-Abers (CVAP)
 * and related ensemble calibrators.
 *
 * Includes log-space geometric mean (minimax) with Neumaier compensated summation
 * and a simple arithmetic mean fallback.
 */

export interface Multiprobability {
  p0: number;
  p1: number;
}

export interface FullMultiprobability extends Multiprobability {
  midpoint: number;
  width: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Neumaier compensated summation — robust when terms differ in magnitude. */
export function neumaierSum(values: readonly number[]): number {
  let sum = 0;
  let compensation = 0;

  for (const value of values) {
    const t = sum + value;
    if (Math.abs(sum) >= Math.abs(value)) {
      compensation += (sum - t) + value;
    } else {
      compensation += (value - t) + sum;
    }
    sum = t;
  }

  return sum + compensation;
}

/**
 * Log-space geometric-mean aggregation of CVAP fold multiprobabilities.
 * Numerically stable via Neumaier summation of the logs.
 */
export function logSpaceGeometricMeanAggregation(
  foldPredictions: readonly Multiprobability[],
  eps: number = 1e-12,
): Multiprobability {
  const K = foldPredictions.length;
  if (K === 0) {
    throw new Error("foldPredictions must contain at least one entry");
  }

  const logOneMinusP0: number[] = [];
  const logP1: number[] = [];

  for (const pred of foldPredictions) {
    const p0 = clamp(pred.p0, eps, 1 - eps);
    const p1 = clamp(pred.p1, eps, 1 - eps);
    logOneMinusP0.push(Math.log(1 - p0));
    logP1.push(Math.log(p1));
  }

  const sumLogOneMinusP0 = neumaierSum(logOneMinusP0);
  const sumLogP1 = neumaierSum(logP1);

  const geoMeanOneMinusP0 = Math.exp(sumLogOneMinusP0 / K);
  const P0 = 1 - geoMeanOneMinusP0;
  const P1 = Math.exp(sumLogP1 / K);

  return {
    p0: Math.min(P0, P1),
    p1: Math.max(P0, P1),
  };
}

/** Arithmetic mean aggregation (simple, stable baseline). */
export function arithmeticMeanAggregation(
  foldPredictions: readonly Multiprobability[],
): Multiprobability {
  const K = foldPredictions.length;
  if (K === 0) throw new Error("foldPredictions must contain at least one entry");

  let sum0 = 0;
  let sum1 = 0;
  for (const pred of foldPredictions) {
    sum0 += pred.p0;
    sum1 += pred.p1;
  }
  const P0 = sum0 / K;
  const P1 = sum1 / K;
  return {
    p0: Math.min(P0, P1),
    p1: Math.max(P0, P1),
  };
}

export function toFull(mp: Multiprobability): FullMultiprobability {
  return {
    ...mp,
    midpoint: (mp.p0 + mp.p1) / 2,
    width: mp.p1 - mp.p0,
  };
}

export type PointConversionMode = "midpoint" | "lower" | "upper" | "minimax";

/**
 * Convert a multiprobability interval to a single point estimate.
 * - midpoint: (p0 + p1) / 2  (convenience, no validity claim)
 * - lower: p0 (conservative for positive edge claims)
 * - upper: p1
 * - minimax: chooses the endpoint that minimises the worst-case absolute loss
 *   relative to a 0-1 outcome (equivalent to the midpoint of the interval
 *   under 0-1 loss for binary, but kept explicit for clarity).
 */
export function multiprobToPoint(
  mp: Multiprobability,
  mode: PointConversionMode = "midpoint",
): number {
  const lo = Math.min(mp.p0, mp.p1);
  const hi = Math.max(mp.p0, mp.p1);
  switch (mode) {
    case "lower":
      return lo;
    case "upper":
      return hi;
    case "minimax":
      // For absolute loss the minimax point is the midpoint of [lo, hi]
      return (lo + hi) / 2;
    case "midpoint":
    default:
      return (lo + hi) / 2;
  }
}
