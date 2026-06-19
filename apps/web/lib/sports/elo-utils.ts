/**
 * ELO rating system utilities — pure, zero dependencies.
 *
 * ELO rating calculations, K-factor selection, home field advantage,
 * margin of victory multipliers, and rating-based prediction for
 * team sports. Pure analytics — does not affect model weights.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface EloConfig {
  readonly k: number;                   // base K-factor
  readonly homeAdvantage: number;       // elo points added for home team (e.g., 65 for NFL)
  readonly initialRating: number;       // starting rating for new teams
  readonly revertToMean?: number;       // seasonal mean reversion fraction (0-1)
  readonly meanRating?: number;         // mean to revert to (default 1500)
}

export interface EloUpdate {
  readonly newRatingA: number;
  readonly newRatingB: number;
  readonly ratingChangeA: number;       // can be negative
  readonly ratingChangeB: number;
  readonly expectedA: number;           // expected score for A
  readonly expectedB: number;           // expected score for B
}

export interface TeamRating {
  readonly teamId: string;
  readonly rating: number;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
}

// ── Core ELO math ─────────────────────────────────────────────────────────

/**
 * Standard ELO expected score: 1 / (1 + 10^((ratingB - ratingA) / 400))
 * Returns value in (0, 1).
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Expected score with home-field advantage applied.
 * Adds homeAdvantage points to the home team's rating before computing expectedScore.
 */
export function expectedScoreWithHome(
  ratingA: number,
  ratingB: number,
  homeAdvantage: number,
  teamAIsHome: boolean
): number {
  if (teamAIsHome) {
    return expectedScore(ratingA + homeAdvantage, ratingB);
  }
  return expectedScore(ratingA, ratingB + homeAdvantage);
}

// ── K-factor ──────────────────────────────────────────────────────────────

/**
 * Dynamic K-factor based on experience.
 * Default: 32 for first 30 games, 20 after.
 * Configurable via config params.
 */
export function kFactor(
  gamesPlayed: number,
  config?: { newTeamK?: number; establishedK?: number; threshold?: number }
): number {
  const newTeamK = config?.newTeamK ?? 32;
  const establishedK = config?.establishedK ?? 20;
  const threshold = config?.threshold ?? 30;
  return gamesPlayed < threshold ? newTeamK : establishedK;
}

// ── ELO update ────────────────────────────────────────────────────────────

/**
 * Derive actual score for A from game scores.
 * Returns 1 if A won, 0 if A lost, 0.5 if draw.
 */
function actualScore(scoreA: number, scoreB: number): number {
  if (scoreA > scoreB) return 1;
  if (scoreA < scoreB) return 0;
  return 0.5;
}

/**
 * Update ELO ratings after a game.
 * scoreA/scoreB: 1 for win, 0 for loss, 0.5 for draw.
 * newRatingA = ratingA + k * (actualScoreA - expectedScoreA)
 */
export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  k: number
): EloUpdate {
  const expA = expectedScore(ratingA, ratingB);
  const expB = 1 - expA;
  const actA = actualScore(scoreA, scoreB);
  const actB = 1 - actA;

  const changeA = k * (actA - expA);
  const changeB = k * (actB - expB);

  return {
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
    ratingChangeA: changeA,
    ratingChangeB: changeB,
    expectedA: expA,
    expectedB: expB,
  };
}

/**
 * Full update with home advantage, dynamic K-factor, and margin-of-victory.
 * Uses expectedScoreWithHome and kFactor internally.
 */
export function updateEloWithConfig(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  config: EloConfig,
  teamAIsHome: boolean,
  teamAGamesPlayed: number
): EloUpdate {
  const expA = expectedScoreWithHome(
    ratingA,
    ratingB,
    config.homeAdvantage,
    teamAIsHome
  );
  const expB = 1 - expA;
  const actA = actualScore(scoreA, scoreB);
  const actB = 1 - actA;

  const k = kFactor(teamAGamesPlayed, { newTeamK: config.k, establishedK: config.k });

  const changeA = k * (actA - expA);
  const changeB = k * (actB - expB);

  return {
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
    ratingChangeA: changeA,
    ratingChangeB: changeB,
    expectedA: expA,
    expectedB: expB,
  };
}

// ── Margin of Victory ─────────────────────────────────────────────────────

/**
 * FiveThirtyEight-style MOV multiplier for NFL.
 * multiplier = ln(abs(scoreDiff) + 1) * (2.2 / (eloDiff * 0.001 + 2.2))
 * scoreDiff: winning team's score - losing team's score (always positive)
 * eloDiff: winning team's elo - losing team's elo
 * Returns minimum of 1.0.
 */
export function marginOfVictoryMultiplier(
  scoreDiff: number,
  eloDiff: number
): number {
  const raw =
    Math.log(Math.abs(scoreDiff) + 1) * (2.2 / (eloDiff * 0.001 + 2.2));
  return Math.max(1.0, raw);
}

/**
 * ELO update incorporating margin of victory.
 * Apply MOV multiplier to the winning team's K-factor.
 * If draw, use standard update (no MOV multiplier).
 */
export function updateEloWithMov(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  pointsA: number,
  pointsB: number,
  k: number
): EloUpdate {
  const expA = expectedScore(ratingA, ratingB);
  const expB = 1 - expA;
  const actA = actualScore(scoreA, scoreB);
  const actB = 1 - actA;

  // Only apply MOV multiplier when there's a winner
  let kA = k;
  let kB = k;

  if (actA !== actB) {
    // There is a winner — not a draw
    const scoreDiff = Math.abs(pointsA - pointsB);
    if (actA === 1) {
      // A won
      const eloDiff = ratingA - ratingB;
      const mov = marginOfVictoryMultiplier(scoreDiff, eloDiff);
      kA = k * mov;
      kB = k * mov;
    } else {
      // B won
      const eloDiff = ratingB - ratingA;
      const mov = marginOfVictoryMultiplier(scoreDiff, eloDiff);
      kA = k * mov;
      kB = k * mov;
    }
  }

  const changeA = kA * (actA - expA);
  const changeB = kB * (actB - expB);

  return {
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
    ratingChangeA: changeA,
    ratingChangeB: changeB,
    expectedA: expA,
    expectedB: expB,
  };
}

// ── Prediction utilities ──────────────────────────────────────────────────

/**
 * Win probability for team A (excluding draws).
 * Uses expectedScoreWithHome.
 */
export function predictWinProbability(
  ratingA: number,
  ratingB: number,
  homeAdvantage = 0,
  teamAIsHome = false
): number {
  return expectedScoreWithHome(ratingA, ratingB, homeAdvantage, teamAIsHome);
}

/**
 * Seasonal mean reversion: rating + fraction * (mean - rating)
 * fraction = 0 → no reversion; fraction = 1 → full reversion to mean
 */
export function revertToMean(
  rating: number,
  fraction: number,
  mean = 1500
): number {
  return rating + fraction * (mean - rating);
}

/**
 * Convert ELO difference to predicted point spread.
 * NFL: approximately 25 ELO points ≈ 1 point on spread.
 * pointsPerElo = 0.04 → 25 elo = 1 point.
 * Positive eloDiff means A is favored → negative spread for A (A gives points).
 * Returns spread for team A: -eloDiff * pointsPerElo.
 */
export function spreadFromElo(
  eloDiff: number,
  pointsPerElo = 0.04
): number {
  return -eloDiff * pointsPerElo;
}

/**
 * Convert spread to win probability using normal distribution approximation.
 * P(favorite wins) ≈ normalCdf(-spread / stdDev)
 * Use inline approximation: P ≈ 0.5 + (-spread) * (1 / (stdDev * 2.507))
 * Clamp to [0.05, 0.95].
 */
export function winProbFromSpread(spread: number, stdDev = 13.86): number {
  const raw = 0.5 + (-spread) * (1 / (stdDev * 2.507));
  return Math.max(0.05, Math.min(0.95, raw));
}

// ── Leaderboard / utilities ───────────────────────────────────────────────

/**
 * Sort teams by rating descending.
 * Returns new sorted array.
 */
export function buildLeaderboard(teams: readonly TeamRating[]): TeamRating[] {
  return [...teams].sort((a, b) => b.rating - a.rating);
}

/**
 * Simply ratingA - ratingB.
 */
export function ratingDifference(ratingA: number, ratingB: number): number {
  return ratingA - ratingB;
}

/**
 * What fraction of teams does this team beat (in rating)?
 * Returns value in [0, 1].
 */
export function eloToPercentile(
  rating: number,
  allRatings: readonly number[]
): number {
  if (allRatings.length === 0) return 0;
  const beaten = allRatings.filter((r) => rating > r).length;
  return beaten / allRatings.length;
}
