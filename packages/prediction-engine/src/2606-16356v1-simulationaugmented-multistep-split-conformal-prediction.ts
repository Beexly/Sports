/**
 * arXiv:2606.16356v1 — Simulation-Augmented Multi-Step Split Conformal Prediction for Aggregated Forecasts
 *
 * Simulation-augmented multi-step split conformal for season totals: expanding-window game-level residuals,
 * horizon-wise centering, block bootstrap (b=4 weeks) of remaining-season paths, aggregated to 90/95%
 * intervals, plus conformal PID online adaptation of quantile levels.
 *
 * Improvement: Adopt simulation-augmented multi-step split conformal for GSE's season-total markets (win totals, season yards/TDs): expanding-window game-level residual collection, center horizon-wise residuals, block bootstrap (b=4 weeks) of 10,000 remaining-season paths, aggregate to 90/95% intervals, then combine with conformal PID online adaptation of quantile levels as the season progresses.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT SA-MSCP for season-total intervals if, on the 2023–2024 holdout, empirical coverage of realised win totals is ≥80% at nominal 90% AND mean interval width is no more than 1.5x the naive baseline width.
 */

/** Block bootstrap of remaining-season paths from game-level residuals. */
export function blockBootstrapPaths(
  residuals: readonly number[],
  blockSize: number,
  nPaths: number,
  gamesLeft: number,
  rand: () => number,
): number[][] {
  if (residuals.length < blockSize || blockSize < 1) {
    throw new Error("blockBootstrapPaths: residuals shorter than block");
  }
  if (nPaths < 1 || gamesLeft < 1) throw new Error("blockBootstrapPaths: positive paths/games");
  const nBlocks = Math.ceil(gamesLeft / blockSize);
  const paths: number[][] = [];
  for (let p = 0; p < nPaths; p++) {
    const path: number[] = [];
    for (let b = 0; b < nBlocks; b++) {
      const start = Math.floor(rand() * (residuals.length - blockSize + 1));
      for (let k = 0; k < blockSize && path.length < gamesLeft; k++) {
        path.push(residuals[start + k] ?? 0);
      }
    }
    paths.push(path);
  }
  return paths;
}

/** Quantile of a sample (linear interpolation). */
export function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) throw new Error("quantile: no data");
  if (q < 0 || q > 1) throw new Error("quantile: q in [0,1]");
  const s = [...xs].sort((a, b) => a - b);
  const pos = q * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (s[lo] ?? 0) + ((s[hi] ?? 0) - (s[lo] ?? 0)) * (pos - lo);
}

/**
 * SA-MSCP interval: point forecast +/- residual quantiles from simulated
 * season-total paths. Returns { lower, upper } at the nominal level.
 */
export function saMscpInterval(
  pointForecast: number,
  paths: readonly number[][],
  level: number,
): { lower: number; upper: number } {
  if (level <= 0 || level >= 1) throw new Error("saMscpInterval: level in (0,1)");
  const totals = paths.map((p) => pointForecast + p.reduce((a, b) => a + b, 0));
  const alpha = 1 - level;
  return { lower: quantile(totals, alpha / 2), upper: quantile(totals, 1 - alpha / 2) };
}

/**
 * Conformal PID online adaptation of the quantile level: err>0 means the
 * last interval missed, so widen (raise the effective level).
 */
export function conformalPidUpdate(level: number, missed: boolean, eta = 0.02): number {
  const target = 0.1; // 90% nominal miss budget
  const err = (missed ? 1 : 0) - target;
  return Math.min(0.99, Math.max(0.5, level + eta * err));
}
