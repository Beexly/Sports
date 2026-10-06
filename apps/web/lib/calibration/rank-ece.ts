/**
 * rankECE: a ranking approach to measuring calibration — arXiv 2609.13100
 * ("A Ranking Approach for Measuring Calibration").
 *
 * ADDITIVE utility. Diagnostic only; not wired into any publish path
 * (changing the headline calibration number is a NEEDS HUMAN CALL — see
 * tracking report).
 *
 * Paper mechanism: binning-free calibration measure. Sort forecasts by
 * predicted probability, compute residuals r_i = y_i - p_i in that order,
 * and sum consecutive residual products: rankECE = (1/n) * sum_{i<n}
 * r_(i) * r_(i+1). Perfectly calibrated forecasts have mean-zero
 * uncorrelated residuals (rankECE -> 0); miscalibration induces local
 * correlation the product sum detects without any binning choice.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT rankECE as the headline
 * calibration number if on the 2022-2024 backtest it is stable across two
 * independent halves (split-half |Delta| < 0.005) AND the asymptotic test
 * rejects the deliberately-distorted copy at p < 0.01; otherwise keep
 * binned ECE and revisit.
 */

/**
 * rankECE: sort by probability, sum consecutive residual products,
 * divide by n.
 */
export function rankEce(
  probs: readonly number[],
  outcomes: ReadonlyArray<0 | 1>,
): number {
  const n = probs.length;
  if (n < 2 || outcomes.length !== n) return Number.NaN;
  const order = probs.map((p, i) => i).sort((a, b) => probs[a]! - probs[b]!);
  let s = 0;
  for (let k = 0; k < n - 1; k++) {
    const i = order[k]!;
    const j = order[k + 1]!;
    s += (outcomes[i]! - probs[i]!) * (outcomes[j]! - probs[j]!);
  }
  return s / n;
}

/**
 * Split-half stability: |rankECE(first half) - rankECE(second half)|.
 * The gate requires < 0.005 on the 2022-2024 backtest.
 */
export function splitHalfDelta(
  probs: readonly number[],
  outcomes: ReadonlyArray<0 | 1>,
): number {
  const n = probs.length;
  if (n < 4) return Number.NaN;
  const half = Math.floor(n / 2);
  const a = rankEce(probs.slice(0, half), outcomes.slice(0, half));
  const b = rankEce(probs.slice(half), outcomes.slice(half));
  return Math.abs(a - b);
}

/**
 * Deliberately distort a probability vector (push toward extremes) for
 * the gate's asymptotic rejection test: the test must reject this copy
 * at p < 0.01 while the undistorted series passes.
 */
export function distortProbs(probs: readonly number[], strength = 0.2): number[] {
  return probs.map((p) => {
    const d = p >= 0.5 ? p + strength * (1 - p) : p - strength * p;
    return Math.min(Math.max(d, 0), 1);
  });
}
