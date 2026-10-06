/**
 * arXiv 2005.07742: SEAM Methodology for Context-Rich Player Matchup Evaluations in Baseball
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * SEAM sparse-matchup shrinkage template as GSE's matchup-adjustment standard: any player-vs-player or player-vs-defense projection with thin direct history shrinks toward synthetic comparables (three-way KDE blend with sample-size-driven weights) rather than a flat prior; unit tests assert w_1 -> 1 as n_direct -> large and w_1 -> 0 as n_direct -> 0.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adopt the SEAM sparse-matchup shrinkage template as GSE's matchup-adjustment standard: any player-vs-player or player-vs-defense projection with thin direct history shrinks toward synthetic comparables (three-way KDE blend with sample-size-driven weights) rather than a flat prior; unit tests assert w_1 -> 1 as n_direct -> large and w_1 -> 0 as n_direct -> 0.
 *
 * ACCEPTANCE GATE (verbatim):
 * Replicate on one MLB season: SEAM-style convex blend beats batter-only and pitcher-only on 0.90-nominal conditional coverage for matchups with >= 10 holdout balls in play; improvement experiment success = 0.90-nominal conditional coverage >= 0.80 with calibration error not worse than the paper's.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Beta posterior update after s successes and f failures. */
export function betaUpdate(a: number, b: number, s: number, f: number): { a: number; b: number } {
  return { a: a + s, b: b + f };
}

/** Beta posterior mean. */
export function betaMean(a: number, b: number): number {
  return a / (a + b);
}

/** Beta posterior variance. */
export function betaVar(a: number, b: number): number {
  return (a * b) / ((a + b) ** 2 * (a + b + 1));
}

/**
 * Dynamic beta-prior win-probability blender: per-cell empirical WP with a
 * pregame-model-derived prior (alpha, beta); posterior mean (n+alpha)/(N+alpha+beta).
 */
export function wpBlendCell(wins: number, trials: number, alpha: number, beta: number): number {
  return (wins + alpha) / (trials + alpha + beta);
}

/** Logistic blend of pregame probability and cell WP with features. */
export function wpBlendLogistic(
  pregameP: number,
  cellP: number,
  coef: readonly number[],
): number {
  const z =
    coef[0]! +
    coef[1]! * pregameP +
    coef[2]! * cellP;
  return 1 / (1 + Math.exp(-z));
}

/** Hierarchical gamma shrinkage for player rate parameters (opponent-adjusted). */
export function gammaPosteriorShrink(
  x: number,
  n: number,
  globalMean: number,
  globalVar: number,
): number {
  // posterior mean under Gamma(a0,b0) prior, Poisson likelihood: (a0 + sum)/(b0 + n)
  const b0 = globalMean / Math.max(1e-9, globalVar);
  const a0 = globalMean * b0;
  return (a0 + x) / (b0 + n);
}
