// @ts-nocheck
/**
 * arXiv 1904.06019: Conformal Prediction Under Covariate Shift.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Likelihood-ratio-weighted split-conformal intervals for margin/total under known covariate shift (playoffs, QB-injury weeks). Effective-sample-size guardrail: n-hat < 100 falls back to unweighted intervals and flags the regime as an abstention signal.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Implement likelihood-ratio-weighted split-conformal intervals for margin/total on known-shift slates (playoffs, QB-injury weeks), with the effective-sample-size n-hat guardrail: n-hat < 100 falls back to unweighted intervals and flags the regime as an abstention signal.
 *
 * ACCEPTANCE GATE:
 * ADAPT if: weighted coverage lands within +/-2pp of nominal on the playoff-shift experiment while unweighted undercovers by >=4pp (replicating the 82.2% -> 90.8% pattern), at mean width <= 130% of unweighted.
 *
 * ENABLED=false: interval method for known-shift slates; deployment as a publish-path interval needs a human call.
 */


export const ENABLED = false;

/** Effective sample size of importance weights: (sum w)^2 / sum w^2. */
export function effectiveSampleSize(weights: readonly number[]): number {
  const s1 = weights.reduce((a, b) => a + b, 0);
  const s2 = weights.reduce((a, b) => a + b * b, 0);
  return s2 > 0 ? (s1 * s1) / s2 : 0;
}

/** Weighted quantile with finite-sample correction: q-th weighted quantile of values. */
export function weightedQuantile(
  values: readonly number[],
  weights: readonly number[],
  q: number,
): number {
  const n = values.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const order = values.map((_, i) => i).sort((a, b) => values[a]! - values[b]!);
  const wTotal = weights.reduce((a, b) => a + b, 0);
  if (wTotal <= 0) return Number.POSITIVE_INFINITY;
  const level = q * (1 + 1 / n);
  let cum = 0;
  for (const i of order) {
    cum += weights[i]! / wTotal;
    if (cum >= level) return values[i]!;
  }
  return values[order[order.length - 1]!]!;
}

/** Unweighted split-conformal interval around a point prediction. */
export function splitConformalInterval(
  prediction: number,
  absResiduals: readonly number[],
  alpha: number,
): { lo: number; hi: number } {
  const q = weightedQuantile(
    absResiduals,
    absResiduals.map(() => 1),
    1 - alpha,
  );
  return { lo: prediction - q, hi: prediction + q };
}

export interface WeightedIntervalResult {
  readonly lo: number;
  readonly hi: number;
  readonly nHat: number;
  readonly usedWeighting: boolean;
  readonly abstentionFlag: boolean;
}

/**
 * Likelihood-ratio-weighted split-conformal interval. Falls back to the
 * unweighted interval and raises an abstention flag when n-hat < nHatMin (100).
 */
export function weightedSplitConformalInterval(
  prediction: number,
  absResiduals: readonly number[],
  likelihoodRatios: readonly number[],
  alpha: number,
  nHatMin = 100,
): WeightedIntervalResult {
  const nHat = effectiveSampleSize(likelihoodRatios);
  if (nHat < nHatMin) {
    const base = splitConformalInterval(prediction, absResiduals, alpha);
    return { ...base, nHat, usedWeighting: false, abstentionFlag: true };
  }
  const q = weightedQuantile(absResiduals, likelihoodRatios, 1 - alpha);
  return {
    lo: prediction - q,
    hi: prediction + q,
    nHat,
    usedWeighting: true,
    abstentionFlag: false,
  };
}
