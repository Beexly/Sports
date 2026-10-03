/**
 * Empirical-Bernstein lower confidence bound for the paired Brier
 * differential (contract §2, Leg 1).
 *
 * d_i = (p_C,i - y_i)^2 - (p_K,i - y_i)^2   (positive = challenger better)
 *
 * Each squared error lies in [0, 1], so the differential lies in [-1, 1] —
 * RANGE WIDTH 2, not 1. Maurer–Pontil's empirical-Bernstein bound is stated
 * for [0, 1] variables; rescaling X' = (X - a)/(b - a) leaves the
 * variance-adaptive term unchanged (sample SD scales back out) but the
 * additive finite-sample penalty scales by the range width (b - a):
 *
 * LCB(delta) = dbar - s_d * sqrt(2 * ln(2/delta) / n)
 *                    - (b - a) * 7 * ln(2/delta) / (3 * (n - 1)),  (b - a) = 2
 *
 * Hard-coding the unit-range penalty here would understate uncertainty by
 * 7*ln(2/delta)/(3*(n-1)) — about 0.017 at n = 500, delta = 0.05, which is
 * more than 8x the contract's deltaPrac = 0.002 practical floor, in the
 * direction that produces FALSE eligibility. Caught in external review of
 * the frozen contract; the contract text is amended to match.
 *
 * Non-asymptotic and variance-adaptive — deliberately not a t-test, so the
 * bound holds at every n rather than leaning on a CLT approximation in an
 * adversarial/audit setting. Pure, deterministic, no I/O.
 */

/** Width of the paired-Brier-differential support [-1, 1]. */
const RANGE_WIDTH = 2;

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
  const lcb =
    meanD - stdD * Math.sqrt((2 * lnTerm) / n) - (RANGE_WIDTH * 7 * lnTerm) / (3 * (n - 1));

  return { n, meanD, stdD, delta, lcb };
}
