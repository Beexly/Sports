/**
 * Multi-horizon Sequential Conformal Prediction (MSCP) — arXiv 2601.18509
 * ("Conformal Prediction Algorithms for Time Series Forecasting: Methods
 * and Benchmarking").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: wrap every engine point forecast in a multi-horizon
 * conformal layer — per-horizon rolling residual windows with the
 * finite-sample conformal quantile (unclamped rank, fail-closed to
 * +Infinity), with an ACI fallback when the residual window is too thin:
 * the caller supplies per-horizon ACI-adapted alphas (produced by the
 * weekly step in ./aci-online-controller) and the quantile is recomputed
 * at the adapted level. Winkler score is the sharpness-aware
 * comparison metric against the parametric Gaussian benchmark.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT MSCP as the default interval
 * layer if it achieves >=90% empirical coverage with Winkler score >=5%
 * below the parametric Gaussian benchmark on the engine backtest; adopt
 * ACI instead if it significantly beats MSCP (Conover test).
 */

import { conformalQuantile } from "./cqr";

/**
 * Per-horizon MSCP interval: for each horizon h, q_h = conformal quantile
 * of the rolling absolute residuals at level alpha; interval =
 * [forecast_h - q_h, forecast_h + q_h]. Thin windows (fail-closed q_h =
 * +Infinity) fall back to the ACI-updated alpha for that horizon.
 */
export function mscpIntervals(
  pointForecasts: readonly number[],
  residualsByHorizon: ReadonlyArray<readonly number[]>,
  alpha: number,
  aciAlphas?: readonly number[],
): Array<{ readonly lo: number; readonly hi: number; readonly q: number }> {
  return pointForecasts.map((f, h) => {
    const residuals = residualsByHorizon[h] ?? [];
    let q = conformalQuantile(residuals, alpha);
    if (!Number.isFinite(q) && aciAlphas && aciAlphas[h] !== undefined) {
      // ACI fallback: recompute the quantile at the online-adapted level.
      q = conformalQuantile(residuals, aciAlphas[h]!);
    }
    if (!Number.isFinite(q)) return { lo: -Infinity, hi: Infinity, q };
    return { lo: f - q, hi: f + q, q };
  });
}

/**
 * Winkler (interval) score at miscoverage level alpha: width plus
 * (2/alpha) penalty per unit of violation outside the interval.
 */
export function winklerScore(
  lo: number,
  hi: number,
  y: number,
  alpha: number,
): number {
  const width = hi - lo;
  if (y < lo) return width + (2 / alpha) * (lo - y);
  if (y > hi) return width + (2 / alpha) * (y - hi);
  return width;
}

/** Mean Winkler score over a set of interval forecasts. */
export function meanWinklerScore(
  intervals: ReadonlyArray<{ readonly lo: number; readonly hi: number }>,
  actuals: readonly number[],
  alpha: number,
): number {
  if (intervals.length === 0 || actuals.length === 0) return Number.NaN;
  const n = Math.min(intervals.length, actuals.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += winklerScore(intervals[i]!.lo, intervals[i]!.hi, actuals[i]!, alpha);
  }
  return s / n;
}

/** Empirical coverage of intervals. */
export function intervalCoverage(
  intervals: ReadonlyArray<{ readonly lo: number; readonly hi: number }>,
  actuals: readonly number[],
): number {
  const n = Math.min(intervals.length, actuals.length);
  if (n === 0) return Number.NaN;
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (actuals[i]! >= intervals[i]!.lo && actuals[i]! <= intervals[i]!.hi) c++;
  }
  return c / n;
}
