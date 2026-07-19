/**
 * Empirical-Bernstein lower confidence bound for the paired Brier
 * differential (contract §2, Leg 1).
 *
 * d_i = (p_C,i - y_i)^2 - (p_K,i - y_i)^2   (positive = challenger better)
 *
 * LCB(delta) = dbar - s_d * sqrt(2 * ln(2/delta) / n) - 7 * ln(2/delta) / (3 * (n - 1))
 *
 * Non-asymptotic and variance-adaptive — deliberately not a t-test, so the
 * bound holds at every n rather than leaning on a CLT approximation in an
 * adversarial/audit setting. Pure, deterministic, no I/O.
 */

export type PairedBrierLcbResult = {
  readonly n: number;
  readonly meanD: number;
  /** Sample standard deviation (ddof = 1). 0 when n < 2. */
  readonly stdD: number;
  readonly delta: number;
  /** -Infinity when n < 2 (not enough evidence to bound anything). */
  readonly lcb: number;
};

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample standard deviation with Bessel's correction (ddof = 1). */
function sampleStd(xs: readonly number[], m: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

/**
 * Computes the empirical-Bernstein lower confidence bound on the paired
 * Brier differential mean, at confidence level (1 - delta).
 *
 * n < 2: returns lcb = -Infinity (there is no meaningful variance-adaptive
 * bound from fewer than two paired observations — this is intentionally
 * the most conservative possible answer, never a silent pass).
 */
export function pairedBrierLcb(diffs: readonly number[], delta: number): PairedBrierLcbResult {
  if (!(delta > 0 && delta < 1)) {
    throw new RangeError(`pairedBrierLcb: delta must be in (0, 1) (got ${delta})`);
  }

  const n = diffs.length;
  const meanD = mean(diffs);

  if (n < 2) {
    return { n, meanD, stdD: 0, delta, lcb: -Infinity };
  }

  const stdD = sampleStd(diffs, meanD);
  const lnTerm = Math.log(2 / delta);
  const lcb = meanD - stdD * Math.sqrt((2 * lnTerm) / n) - (7 * lnTerm) / (3 * (n - 1));

  return { n, meanD, stdD, delta, lcb };
}
