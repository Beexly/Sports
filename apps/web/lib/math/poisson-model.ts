/**
 * Poisson goal-expectation model for soccer / hockey.
 *
 * Given each team's attack/defense strength, computes H/D/A probabilities
 * and a full scoreline distribution. Extends the Dixon-Coles foundation
 * already in lib/math/dixon-coles.ts.
 *
 * Pure math — zero dependencies, no network calls.
 *
 * Pattern: standard Dixon-Coles Poisson extension, widely published in
 * sports analytics literature (Maher 1982, Dixon-Coles 1997).
 */

/**
 * Compute expected goals given attack/defense ratings and home advantage.
 *
 * Formula: λHome = homeAttack × awayDefense × homeAdvantage × leagueAvgGoals
 *          λAway = awayAttack × homeDefense × leagueAvgGoals
 *
 * Ratings are multiplicative factors centred on 1.0 (average team).
 * e.g. homeAttack=1.2 means 20% above-average attack strength.
 */
export function expectedGoals(params: {
  homeAttack: number;
  homeDefense: number;
  awayAttack: number;
  awayDefense: number;
  /** Multiplicative home field advantage (default: 1.15) */
  homeAdvantage?: number;
  /** League average goals per team per game (default: 1.35) */
  leagueAvgGoals?: number;
}): { lambdaHome: number; lambdaAway: number } {
  const {
    homeAttack,
    homeDefense,
    awayAttack,
    awayDefense,
    homeAdvantage = 1.15,
    leagueAvgGoals = 1.35,
  } = params;

  const lambdaHome = homeAttack * awayDefense * homeAdvantage * leagueAvgGoals;
  const lambdaAway = awayAttack * homeDefense * leagueAvgGoals;

  return { lambdaHome, lambdaAway };
}

/**
 * Poisson probability mass function: P(X = k | lambda).
 *
 * Uses log-space computation to avoid factorial overflow for large k.
 * Returns 0 for invalid inputs (lambda <= 0, k < 0, non-integer k).
 */
export function poissonProb(k: number, lambda: number): number {
  if (lambda <= 0 || k < 0 || !Number.isFinite(lambda) || !Number.isFinite(k)) return 0;
  if (!Number.isInteger(k)) return 0;

  // Log-space: ln P = -lambda + k*ln(lambda) - ln(k!)
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) {
    logP -= Math.log(i);
  }
  return Math.exp(logP);
}

/**
 * Compute H/D/A win probabilities from expected goals using independent Poisson.
 *
 * Sums over a truncated scoreline grid up to maxGoals × maxGoals,
 * then normalises to account for truncation error.
 */
export function poissonMatchProbs(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 8
): { homeWin: number; draw: number; awayWin: number } {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonProb(h, lambdaHome) * poissonProb(a, lambdaAway);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }

  // Normalise to sum to 1 (compensates for truncation)
  const total = homeWin + draw + awayWin;
  if (total <= 0) return { homeWin: 1 / 3, draw: 1 / 3, awayWin: 1 / 3 };

  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
  };
}

/**
 * Full scoreline probability grid up to maxGoals × maxGoals.
 *
 * Returns a 2D array indexed as [homeGoals][awayGoals].
 * All cells sum to approximately 1.0 (truncation means slightly less).
 */
export function scoreProbGrid(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 8
): ReadonlyArray<ReadonlyArray<number>> {
  const grid: number[][] = [];

  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      row.push(poissonProb(h, lambdaHome) * poissonProb(a, lambdaAway));
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Quick helper: given two team ratings, return match probabilities directly.
 * Combines expectedGoals + poissonMatchProbs in one call.
 */
export function teamRatingsToMatchProbs(params: {
  homeAttack: number;
  homeDefense: number;
  awayAttack: number;
  awayDefense: number;
  homeAdvantage?: number;
  leagueAvgGoals?: number;
  maxGoals?: number;
}): {
  homeWin: number;
  draw: number;
  awayWin: number;
  lambdaHome: number;
  lambdaAway: number;
} {
  const { maxGoals = 8, ...egParams } = params;
  const { lambdaHome, lambdaAway } = expectedGoals(egParams);
  const probs = poissonMatchProbs(lambdaHome, lambdaAway, maxGoals);

  return { ...probs, lambdaHome, lambdaAway };
}
