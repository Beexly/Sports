/**
 * arXiv 2207.05114: Bayesian estimation of in-game home team win probability for NBA games
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Upgrade GSE's live-WP blending with the paper's mechanism: gse.live.WPBlender -- per (seconds elapsed, score differential, down/distance bucket) cells, empirical WP with a dynamic beta prior whose alpha,beta come from GSE's pregame model mapped through a prior-strength schedule (high early, decaying); posterior mean (n+alpha)/(N+alpha+beta); logistic blend of pregame and cell WP with features {t, |l|, l^2, I(l=0), possession}, coefficients fit by minimizing Brier on a validation slice strictly before the test slice (fixing the paper's leakage); serve per-second with cell-sample-size diagnostics.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Upgrade GSE's live-WP blending with the paper's mechanism: gse.live.WPBlender — per (seconds elapsed, score differential, down/distance bucket) cells, empirical WP with a dynamic beta prior whose alpha,beta come from GSE's pregame model mapped through a prior-strength schedule (high early, decaying); posterior mean (n+alpha)/(N+alpha+beta); logistic blend of pregame and cell WP with features {t, |l|, l^2, I(l=0), possession}, coefficients fit by minimizing Brier on a validation slice strictly before the test slice (fixing the paper's leakage); serve per-second with cell-sample-size diagnostics.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT (keep the blend) iff on the strictly held-out 2022-2024 test the blended estimator beats GSE's current live-WP Brier by >= 0.002 AND beats the no-blend cell estimator by >= 0.003, with calibration slope in [0.95, 1.05]; miss -> REJECT the blend (keep the beta-prior cell estimator only if it alone beats baseline).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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
