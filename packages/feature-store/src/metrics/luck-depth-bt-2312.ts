/**
 * Luck+depth Bradley-Terry rating layer (engine-honesty infrastructure)
 *
 * Research port: arXiv:2312.04711
 * Normalized lane: markets | Doctrine: BASELINE
 *
 * Fits alpha (league irreducible upset rate) and beta (depth) per league/season on GSE game data: P(i beats j) = alpha/2 + (1-alpha) * sigmoid(beta * (theta_i - theta_j)). Alpha becomes the league's irreducible upset rate and a minimum-honesty floor for engine claims.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if luck+depth BT beats plain BT on 2025 NFL walk-forward log-likelihood by >=0.003/game with alpha-hat stable across halves of the season. Live-data gate -> GSE_LUCK_DEPTH_BT_ENABLED flag (default false).
 */

export interface LuckDepthParams {
  alpha: number; // irreducible upset rate in [0, 1)
  beta: number; // depth (positive)
}

export interface RatedPair {
  i: number;
  j: number;
  /** 1 if i won, 0 if j won */
  y: number;
}

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** P(i beats j) under luck+depth BT. */
export function luckDepthProb(thetaI: number, thetaJ: number, p: LuckDepthParams): number {
  const a = Math.min(0.999, Math.max(0, p.alpha));
  const b = Math.max(1e-6, p.beta);
  return a / 2 + (1 - a) * sigmoid(b * (thetaI - thetaJ));
}

/** Mean log-likelihood per game for a set of pairs. */
export function meanLogLikelihood(pairs: RatedPair[], theta: number[], p: LuckDepthParams): number {
  if (pairs.length === 0) return 0;
  let ll = 0;
  for (const { i, j, y } of pairs) {
    const pr = Math.min(1 - 1e-12, Math.max(1e-12, luckDepthProb(theta[i] ?? 0, theta[j] ?? 0, p)));
    ll += y * Math.log(pr) + (1 - y) * Math.log(1 - pr);
  }
  return ll / pairs.length;
}

/** Grid-search fit of (alpha, beta) maximizing mean log-likelihood. */
export function fitLuckDepth(
  pairs: RatedPair[],
  theta: number[],
  alphas: number[] = [0, 0.05, 0.1, 0.15, 0.2],
  betas: number[] = [0.5, 1, 2, 4],
): LuckDepthParams {
  let best: LuckDepthParams = { alpha: 0, beta: 1 };
  let bestLl = -Infinity;
  for (const alpha of alphas) {
    for (const beta of betas) {
      const ll = meanLogLikelihood(pairs, theta, { alpha, beta });
      if (ll > bestLl) { bestLl = ll; best = { alpha, beta }; }
    }
  }
  return best;
}

/** Gate: improvement per game of luck+depth BT over plain BT. */
export function luckDepthGainPerGame(
  pairs: RatedPair[],
  theta: number[],
  fitted: LuckDepthParams,
): number {
  return meanLogLikelihood(pairs, theta, fitted) - meanLogLikelihood(pairs, theta, { alpha: 0, beta: 1 });
}

/** Live-data gate: >=0.003/game walk-forward gain with stable alpha-hat. */
export const GSE_LUCK_DEPTH_BT_ENABLED = false;

