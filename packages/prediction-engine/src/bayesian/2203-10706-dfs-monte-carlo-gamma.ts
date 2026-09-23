/**
 * arXiv 2203.10706: Predicting Cricket Outcomes using Bayesian Priors (arXiv:2203.10706) — replaces [1539]
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build the opponent-specific player-distribution DFS Monte Carlo: per-player fantasy-point distributions (hierarchical Bayesian gamma with player x opponent random effects, partial pooling, fit by MCMC -- fixing the paper's 'Bayesian in name only' gap) keyed to matchup tables (WR yards vs coverage-shell-specific CB history), stratified sampling -> lineup construction under salary-cap/positional constraints, 10,000+ replications per slate -> lineup score distributions and field-adjusted win probability for GPP ownership optimization; score distributions with proper scoring rules vs an Elo baseline.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the opponent-specific player-distribution DFS Monte Carlo: per-player fantasy-point distributions (hierarchical Bayesian gamma with player x opponent random effects, partial pooling, fit by MCMC — fixing the paper's 'Bayesian in name only' gap) keyed to matchup tables (WR yards vs coverage-shell-specific CB history), stratified sampling -> lineup construction under salary-cap/positional constraints, 10,000+ replications per slate -> lineup score distributions and field-adjusted win probability for GPP ownership optimization; score distributions with proper scoring rules vs an Elo baseline.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the opponent-specific player-distribution + Monte Carlo aggregation pattern iff the hierarchical gamma beats pooled baselines on 2025 held-out log-likelihood by >=3%; REJECT the paper's literal estimation procedure (moment + 5% tail rule, no pooling).
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

function phiStd(x: number): number {
  return Math.exp(-0.5 * x * x) / 2.5066282746310002;
}

function PhiStd(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/**
 * Closed-form E[max(X, Y)] for bivariate Gaussian (mu1, mu2, s1, s2, rho).
 * Used for the 2-entry Showdown duel optimizer.
 */
export function expectedMax2(
  mu1: number,
  mu2: number,
  s1: number,
  s2: number,
  rho: number,
): number {
  const sd = Math.sqrt(Math.max(1e-12, s1 * s1 + s2 * s2 - 2 * rho * s1 * s2));
  const d = (mu1 - mu2) / sd;
  return mu1 * PhiStd(d) + mu2 * PhiStd(-d) + sd * phiStd(d);
}

/** Greedy sequential n-entry portfolio via moment-matched Gaussian conditioning. */
export function emaxPortfolioGreedy(
  mus: number[],
  sigmas: number[],
  rhos: number[][],
  k: number,
): number[] {
  const n = mus.length;
  const chosen: number[] = [];
  const remaining = new Set(Array.from({ length: n }, (_, i) => i));
  // running max approximated as Gaussian with matched moments
  let mMean = -Infinity;
  let mVar = 0;
  for (let t = 0; t < k && remaining.size > 0; t++) {
    let best = -1;
    let bestV = -Infinity;
    for (const i of remaining) {
      const rho = chosen.length === 0 ? 0 : avgCorr(i, chosen, rhos);
      const sd = Math.sqrt(Math.max(1e-12, sigmas[i]! ** 2 + mVar - 2 * rho * sigmas[i]! * Math.sqrt(mVar)));
      const d = chosen.length === 0 ? Infinity : (mus[i]! - mMean) / sd;
      const gain = chosen.length === 0 ? mus[i]! : sd * phiStd(d) + (mus[i]! - mMean) * PhiStd(d);
      if (gain > bestV) {
        bestV = gain;
        best = i;
      }
    }
    chosen.push(best);
    remaining.delete(best);
    // moment-match the new running max (assume independence for the update)
    if (t === 0) {
      mMean = mus[best]!;
      mVar = sigmas[best]! ** 2;
    } else {
      const sd = Math.sqrt(Math.max(1e-12, sigmas[best]! ** 2 + mVar));
      const d = (mus[best]! - mMean) / sd;
      const newMean = mus[best]! * PhiStd(d) + mMean * PhiStd(-d) + sd * phiStd(d);
      mVar = Math.max(1e-9, mVar * 0.9); // shrink: max concentrates
      mMean = newMean;
    }
  }
  return chosen;
}

function avgCorr(i: number, chosen: number[], rhos: number[][]): number {
  if (chosen.length === 0) return 0;
  return chosen.reduce((s, j) => s + rhos[i]![j]!, 0) / chosen.length;
}
