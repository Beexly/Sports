/**
 * Canonical closed-form spread → win-probability map + season simulator.
 *
 * Baseline infrastructure: Pr(win | spread p) = Φ(p / 13.588) — the paper's
 * validated analytic map (A/B vs the engine's current conversion on Brier).
 * Also ships the paper's Monte Carlo season simulator for win-total /
 * division-odds mispricing screens, and its line-movement distribution
 * (P(|move| > 1) ≈ 0.20) as the null model for the steam detector.
 *
 * @see arXiv:1211.4000 — "The Performance of Betting Lines for Predicting the Outcome of NFL Games"
 *
 * ACCEPTANCE GATE: adopt Φ(p/13.588) as the canonical closed-form baseline iff
 * its 2012–2025 Brier is within 0.002 of the engine's existing conversion.
 * Reject the home-underdog strategy as a live bet unless 2012–2025 ATS ≥
 * 52.38% with p < 0.05. The gate is a backtest concern; this module is the
 * pure math kernel, not wired into any live path.
 */

export const SPREAD_SD = 13.588;

/** Standard normal CDF via the Abramowitz–Stegun erf approximation. */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - Math.exp((-x * x) / 2) * poly * 0.3989422804014327;
  return x >= 0 ? cdf : 1 - cdf;
}

/**
 * Canonical spread → win probability: Pr(win | spread p) = Φ(p / 13.588).
 * Spread is from the team's perspective (positive = favored).
 */
export function spreadToWinProb(spread: number, sd = SPREAD_SD): number {
  if (!Number.isFinite(spread)) throw new Error("spreadToWinProb: non-finite spread");
  if (!(sd > 0)) throw new Error("spreadToWinProb: sd must be positive");
  return normalCdf(spread / sd);
}

/**
 * Monte Carlo season simulator: given per-game win probabilities for one
 * team, simulate `sims` seasons and return the win-total distribution as
 * { wins: count } frequencies.
 */
export function simulateSeasonWinTotals(
  gameWinProbs: readonly number[],
  sims: number,
  rand: () => number = Math.random,
): Map<number, number> {
  if (gameWinProbs.length === 0) throw new Error("simulateSeasonWinTotals: no games");
  if (!(sims > 0)) throw new Error("simulateSeasonWinTotals: sims must be positive");
  const dist = new Map<number, number>();
  for (let s = 0; s < sims; s++) {
    let wins = 0;
    for (const p of gameWinProbs) {
      if (rand() < p) wins++;
    }
    dist.set(wins, (dist.get(wins) ?? 0) + 1);
  }
  return dist;
}

/**
 * Probability a team's simulated win total exceeds a books' win-total line,
 * for mispricing screens.
 */
export function probOverWinTotal(
  gameWinProbs: readonly number[],
  line: number,
  sims = 20000,
  rand: () => number = Math.random,
): number {
  const dist = simulateSeasonWinTotals(gameWinProbs, sims, rand);
  let over = 0;
  let total = 0;
  for (const [wins, count] of dist) {
    total += count;
    if (wins > line) over += count;
  }
  return total === 0 ? 0 : over / total;
}

/**
 * Steam-detector null: P(|line move| > 1) ≈ 0.20 under the paper's empirical
 * line-movement distribution.
 */
export const STEAM_NULL_P_MOVE_GT_1 = 0.2;

/** True if a move is "large" relative to the null (candidate steam). */
export function isLargeLineMove(movePoints: number, nullProb = STEAM_NULL_P_MOVE_GT_1): boolean {
  void nullProb;
  return Math.abs(movePoints) > 1;
}

/** Implied fair probability that a random move exceeds the threshold under the null. */
export function steamNullExceedanceRate(moves: readonly number[], threshold = 1): number {
  if (moves.length === 0) return 0;
  return moves.filter((m) => Math.abs(m) > threshold).length / moves.length;
}
