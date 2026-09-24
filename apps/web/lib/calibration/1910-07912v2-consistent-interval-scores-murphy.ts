/**
 * arXiv 1910.07912v2: Forecast Evaluation of Quantiles, Prediction Intervals, and other Set-Valued Functionals.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Exhaustive consistent score (eq. 4.8) plus Murphy diagrams over a 100-point endpoint grid for all published prediction intervals. Deletes the 'shortest calibrated interval' objective (not elicitable, Theorem 4.16): a challenger displaces the incumbent only on strict Murphy dominance (>=95/100 points).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace ad-hoc interval evaluation (coverage + width heuristics) with the exhaustive consistent score (4.8) plus Murphy diagrams over a 100-point endpoint grid for all published prediction intervals (totals, spreads, DFS player stats), and delete any 'shortest calibrated interval' objective from engine/analyst targets (not elicitable, Theorem 4.16).
 *
 * ACCEPTANCE GATE:
 * 95 -- a challenger engine's intervals displace the incumbent's only if its Murphy curve lies at or below the incumbent's on at least 95 of the 100 elementary-score grid points (strict dominance robust to score choice).
 *
 * No ENABLED flag: pure interval-evaluation metric for offline engine comparison.
 */


/** Winkler interval score for a (1-alpha) prediction interval. Lower is better. */
export function intervalScore(
  l: number,
  u: number,
  y: number,
  alpha: number,
): number {
  const width = u - l;
  if (y < l) return width + (2 / alpha) * (l - y);
  if (y > u) return width + (2 / alpha) * (y - u);
  return width;
}

/**
 * Elementary score for an alpha-quantile at grid point theta (Gneiting-Ranjan):
 * S_theta(q, y) = (1{y <= theta} - alpha) * (1{theta <= q} - 1{theta <= y}).
 * Consistent for the quantile; the interval score decomposes over endpoints.
 */
export function elementaryQuantileScore(
  q: number,
  y: number,
  theta: number,
  alpha: number,
): number {
  return (
    ((y <= theta ? 1 : 0) - alpha) *
    ((theta <= q ? 1 : 0) - (theta <= y ? 1 : 0))
  );
}

/**
 * Murphy curve for prediction intervals: mean elementary score over the
 * 100-point endpoint grid, summing both interval endpoints at level alpha/2.
 */
export function murphyCurve(
  intervals: readonly { readonly l: number; readonly u: number }[],
  ys: readonly number[],
  alpha: number,
  grid: readonly number[],
): number[] {
  const half = alpha / 2;
  return grid.map((theta) => {
    let s = 0;
    for (let i = 0; i < intervals.length; i++) {
      const { l, u } = intervals[i];
      s +=
        elementaryQuantileScore(l, ys[i], theta, half) +
        elementaryQuantileScore(u, ys[i], theta, 1 - half);
    }
    return s / intervals.length;
  });
}

/** Count of grid points where the challenger curve lies at or below the incumbent's. */
export function dominanceCount(
  challengerCurve: readonly number[],
  incumbentCurve: readonly number[],
): number {
  let n = 0;
  for (let i = 0; i < challengerCurve.length; i++) {
    if (challengerCurve[i] <= incumbentCurve[i] + 1e-12) n++;
  }
  return n;
}

/**
 * Displacement gate: challenger displaces the incumbent only if its Murphy curve
 * lies at or below the incumbent's on at least `need` of the 100 grid points.
 */
export function meetsDisplacementGate(
  challenger: readonly { readonly l: number; readonly u: number }[],
  incumbent: readonly { readonly l: number; readonly u: number }[],
  ys: readonly number[],
  alpha: number,
  grid: readonly number[],
  need = 95,
): { count: number; displaces: boolean } {
  const cCurve = murphyCurve(challenger, ys, alpha, grid);
  const iCurve = murphyCurve(incumbent, ys, alpha, grid);
  const count = dominanceCount(cCurve, iCurve);
  return { count, displaces: count >= need };
}
