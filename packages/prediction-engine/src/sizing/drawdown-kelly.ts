/**
 * Drawdown-constrained Bayesian Kelly staking (arXiv 2010.15779v2).
 *
 * "Learn the edge under a drawdown cap": per pick-category
 * (spread/ML/total x league) keep a Beta-Binomial posterior over the true
 * win probability, updated as picks settle. Stake = Kelly fraction from
 * the posterior mean, shrunk by posterior uncertainty; a hard cap scales
 * stakes to minimum-viable when bankroll drawdown from peak exceeds q
 * (e.g. 30%); new categories start at reduced stakes until the posterior
 * tightens.
 *
 * ACCEPTANCE GATE: ADAPT if the Learning staker beats the Non-Learning
 * staker on 2025-holdout ROI with worst drawdown no worse (replicating the
 * paper's dual win) — else the Bayesian layer adds complexity without edge
 * and GSE keeps fixed edge estimates with the simple drawdown cap.
 *
 * Research-only module. Not wired into any live staking path.
 */

export interface CategoryPosterior {
  category: string;
  alpha: number;
  beta: number;
  /** Picks observed (for the new-category reduced-stake rule). */
  n: number;
}

/** Fresh posterior for a new category (uniform prior). */
export function newCategory(
  category: string,
  priorAlpha = 1,
  priorBeta = 1,
): CategoryPosterior {
  return { category, alpha: priorAlpha, beta: priorBeta, n: 0 };
}

/** Beta-Binomial update as a pick settles (won = true/false). */
export function updatePosterior(
  post: CategoryPosterior,
  won: boolean,
): CategoryPosterior {
  return {
    ...post,
    alpha: post.alpha + (won ? 1 : 0),
    beta: post.beta + (won ? 0 : 1),
    n: post.n + 1,
  };
}

export function posteriorMean(post: CategoryPosterior): number {
  return post.alpha / (post.alpha + post.beta);
}

/** Posterior variance of the win probability. */
export function posteriorVar(post: CategoryPosterior): number {
  const a = post.alpha;
  const b = post.beta;
  return (a * b) / ((a + b) ** 2 * (a + b + 1));
}

export interface StakeQuote {
  /** Fraction of bankroll to stake. */
  frac: number;
  kellyRaw: number;
  shrinkage: number;
  drawdownScaled: boolean;
}

/**
 * Kelly fraction from the posterior mean at decimal odds, shrunk by
 * posterior uncertainty (shrinkage = 1 - z * cv, floored at 0), then by
 * the drawdown cap: if drawdown from peak exceeds q, scale to
 * minStakeFrac. New categories (n < warmupPicks) stake at newCatFrac of
 * the computed fraction.
 */
export function kellyStake(
  post: CategoryPosterior,
  decimalOdds: number,
  opts: {
    bankroll: number;
    peakBankroll: number;
    drawdownQ?: number;
    minStakeFrac?: number;
    uncertaintyZ?: number;
    warmupPicks?: number;
    newCatFrac?: number;
  },
): StakeQuote {
  if (decimalOdds <= 1) throw new Error("kellyStake: decimal odds must exceed 1");
  if (opts.bankroll <= 0) throw new Error("kellyStake: bankroll must be positive");
  const p = posteriorMean(post);
  const b = decimalOdds - 1;
  const kellyRaw = Math.max(0, (b * p - (1 - p)) / b);
  const sd = Math.sqrt(posteriorVar(post));
  const cv = p > 1e-9 ? sd / p : 1;
  const shrinkage = Math.max(0, 1 - (opts.uncertaintyZ ?? 1) * cv);
  let frac = kellyRaw * shrinkage;
  let drawdownScaled = false;
  const peak = Math.max(opts.peakBankroll, opts.bankroll);
  const drawdown = 1 - opts.bankroll / peak;
  if (drawdown > (opts.drawdownQ ?? 0.3)) {
    frac = opts.minStakeFrac ?? 0.001;
    drawdownScaled = true;
  }
  if (post.n < (opts.warmupPicks ?? 20)) {
    frac *= opts.newCatFrac ?? 0.25;
  }
  return { frac, kellyRaw, shrinkage, drawdownScaled };
}

/** Worst (max) drawdown of an equity curve. */
export function maxDrawdown(equity: readonly number[]): number {
  if (equity.length === 0) throw new Error("maxDrawdown: no equity");
  let peak = equity[0] as number;
  let worst = 0;
  for (const e of equity) {
    if ((e as number) > peak) peak = e as number;
    worst = Math.max(worst, 1 - (e as number) / peak);
  }
  return worst;
}
