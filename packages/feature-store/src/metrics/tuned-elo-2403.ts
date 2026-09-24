/**
 * Tuned-Elo baseline: K grid + HFA + regression-to-mean on nflverse 2000-2025
 *
 * Research port: arXiv:2403.03862
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Tuned Elo baseline: all 32 teams init 1500, K-factor grid-searched (10-60) against log-loss of implied win probability on out-of-sample games, expected-outcome formula with the 400 divisor, home-field advantage, and offseason regression-to-mean. Pure rating math.
 *
 * ACCEPTANCE GATE: ADOPT the tuned-Elo spec only if grid-tuned K + HFA + regression-to-mean beats the paper's fixed recipe (init 1500, K=25, no HFA) by >=0.005 mean log-loss on 2020-2025. Live-data gate -> GSE_TUNED_ELO_ENABLED flag (default false).
 */

export interface EloConfig {
  k: number;
  hfa: number; // rating points added to the home team
  regression: number; // fraction regressed toward 1500 each offseason (0..1)
}

export const FIXED_RECIPE: EloConfig = { k: 25, hfa: 0, regression: 0 };
export const K_GRID = [10, 15, 20, 25, 30, 40, 50, 60];

/** Expected score with the 400 divisor and HFA. */
export function expectedScore(ratingA: number, ratingB: number, aHome: boolean, hfa: number): number {
  const ra = aHome ? ratingA + hfa : ratingA;
  return 1 / (1 + 10 ** ((ratingB - ra) / 400));
}

/** Single-game Elo update. */
export function updateElo(ratingA: number, ratingB: number, scoreA: number, aHome: boolean, cfg: EloConfig): [number, number] {
  const ea = expectedScore(ratingA, ratingB, aHome, cfg.hfa);
  const eb = expectedScore(ratingB, ratingA, !aHome, cfg.hfa);
  return [ratingA + cfg.k * (scoreA - ea), ratingB + cfg.k * ((1 - scoreA) - eb)];
}

/** Offseason regression-to-mean. */
export function regressToMean(ratings: Record<string, number>, cfg: EloConfig): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [t, r] of Object.entries(ratings)) out[t] = r + cfg.regression * (1500 - r);
  return out;
}

/** Mean log-loss of implied win probabilities over a game list. */
export function meanLogLoss(
  games: { a: string; b: string; aHome: boolean; aWon: boolean }[],
  ratings: Record<string, number>,
  cfg: EloConfig,
): number {
  if (games.length === 0) return 0;
  let ll = 0;
  for (const g of games) {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, expectedScore(ratings[g.a] ?? 1500, ratings[g.b] ?? 1500, g.aHome, cfg.hfa)));
    ll += g.aWon ? Math.log(p) : Math.log(1 - p);
  }
  return -ll / games.length;
}

/** Grid-search K over K_GRID; returns the best (k, log-loss). */
export function tuneK(
  games: { a: string; b: string; aHome: boolean; aWon: boolean }[],
  ratings: Record<string, number>,
  hfa: number,
  regression: number,
): { k: number; logLoss: number } {
  let best = { k: K_GRID[0] ?? 0, logLoss: Infinity };
  for (const k of K_GRID) {
    const ll = meanLogLoss(games, ratings, { k, hfa, regression });
    if (ll < best.logLoss) best = { k, logLoss: ll };
  }
  return best;
}

/** Live-data gate: >=0.005 log-loss gain over the fixed recipe on 2020-2025. */
export const GSE_TUNED_ELO_ENABLED = false;

