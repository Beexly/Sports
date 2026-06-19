/**
 * Dixon-Coles Poisson correction for association football (soccer).
 * Pure math, zero dependencies.
 *
 * Fixes the well-known underestimation of low-score draws (0–0, 1–0, 0–1, 1–1)
 * in standard Poisson goal models. The correction adds a small dependency
 * between home and away goals for these four score combinations.
 *
 * Reference: Dixon & Coles (1997), "Modelling Association Football Scores
 * and Inefficiencies in the Football Betting Market", Applied Statistics.
 *
 * Attribution: Pattern also from world-cup-2026-prediction-model (MIT,
 * github.com/Hicruben/world-cup-2026-prediction-model)
 */

/**
 * Dixon-Coles correction factor τ(homeGoals, awayGoals, λHome, λAway, rho).
 *
 * Applied to P(homeGoals, awayGoals) from the Poisson model.
 * Only adjusts the four low-score cells; returns 1 for all others.
 *
 * @param h Home team goals
 * @param a Away team goals
 * @param lambdaHome Expected home goals (Poisson mean)
 * @param lambdaAway Expected away goals (Poisson mean)
 * @param rho Correction strength, typically in [0.05, 0.20]. Higher = stronger correction.
 */
export function dixonColesTau(
  h: number,
  a: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number
): number {
  if (h === 0 && a === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (h === 0 && a === 1) return 1 + lambdaHome * rho;
  if (h === 1 && a === 0) return 1 + lambdaAway * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

/** Poisson PMF: P(X = k) = (λ^k · e^−λ) / k! */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0 || k < 0) return 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * Compute the Dixon-Coles–corrected probability for a given scoreline.
 */
export function dixonColesScoreProb(
  h: number,
  a: number,
  lambdaHome: number,
  lambdaAway: number,
  rho = 0.1
): number {
  const tau = dixonColesTau(h, a, lambdaHome, lambdaAway, rho);
  return tau * poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
}

/**
 * Compute the probability of home win, draw, or away win using Dixon-Coles.
 * Uses a truncated sum up to `maxGoals` per team.
 */
export function dixonColesOutcomes(
  lambdaHome: number,
  lambdaAway: number,
  rho = 0.1,
  maxGoals = 10
): { homeWin: number; draw: number; awayWin: number } {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = dixonColesScoreProb(h, a, lambdaHome, lambdaAway, rho);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }

  // Normalize to sum to 1 (truncation error)
  const total = homeWin + draw + awayWin;
  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
  };
}
