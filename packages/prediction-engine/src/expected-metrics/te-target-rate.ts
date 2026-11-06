/**
 * TE Target Rate → Expected Metric (SHADOW ONLY)
 *
 * Grounded in:
 * - QB TE-target-rate tendency.
 * - Source: @FantasyPtsData, 2026-10-06 ~12:06 PM CDT
 * - "QB TE-target-rate: Huntley 34.2%, league avg 21.9%, 'all seasons'."
 *
 * Calculates the propensity of a QB to target tight ends on pass plays.
 * Features two windows with point-in-time discipline:
 *  1. Career (vintage-safe: strictly before target game).
 *  2. Rolling 16-game window (strictly before target game).
 */

export interface TeTargetRatePlay {
  readonly passerId: string;
  readonly isTeTarget: boolean;
  readonly gameId: string;
}

export interface TeTargetRateResult {
  readonly career: number | null;
  readonly rolling16: number | null;
  readonly careerN: number;
  readonly rolling16N: number;
  readonly shrunkCareer: number | null;
  readonly shrunkRolling16: number | null;
  readonly leagueMean: number;
  readonly sufficientSample: boolean;
}

/** Minimum career dropbacks required to return a non-null rate. */
export const MIN_CAREER_DROPBACKS = 200;
/** Minimum rolling 16-game dropbacks required to return a non-null rate. */
export const MIN_ROLLING_DROPBACKS = 80;
/** Pseudo-count for shrinking the career rate towards the league mean. */
export const CAREER_SHRINKAGE_WEIGHT = 100;
/** Pseudo-count for shrinking the rolling rate towards the league mean. */
export const ROLLING_SHRINKAGE_WEIGHT = 40;

function parseGameId(gameId: string) {
  const parts = gameId.split("_");
  if (parts.length < 2) return { season: 0, week: 0 };
  const season = parseInt(parts[0] || "0", 10);
  const week = parseInt(parts[1] || "0", 10);
  return { season, week };
}

function compareGames(a: string, b: string) {
  const aParsed = parseGameId(a);
  const bParsed = parseGameId(b);
  if (aParsed.season !== bParsed.season) return aParsed.season - bParsed.season;
  return aParsed.week - bParsed.week;
}

/**
 * Computes TE target rates per QB.
 *
 * Point-in-time discipline: only includes plays from games strictly BEFORE the
 * targetGameId. Shrinks small samples towards the historically-computed league
 * mean.
 */
export function computeTeTargetRate(
  plays: readonly TeTargetRatePlay[],
  targetGameId: string,
): Map<string, TeTargetRateResult> {
  let totalTargets = 0;
  let totalDropbacks = 0;

  const qbPlays = new Map<string, TeTargetRatePlay[]>();

  // Filter point-in-time and group by QB
  for (const play of plays) {
    if (compareGames(play.gameId, targetGameId) >= 0) {
      continue; // Strictly before target game
    }

    totalDropbacks++;
    if (play.isTeTarget) totalTargets++;

    let qPlays = qbPlays.get(play.passerId);
    if (!qPlays) {
      qPlays = [];
      qbPlays.set(play.passerId, qPlays);
    }
    qPlays.push(play);
  }

  const leagueMean = totalDropbacks > 0 ? totalTargets / totalDropbacks : 0;
  const results = new Map<string, TeTargetRateResult>();

  for (const [passerId, pPlays] of qbPlays.entries()) {
    // Sort plays by game to find rolling 16 games
    const games = Array.from(new Set(pPlays.map(p => p.gameId)));
    games.sort(compareGames);

    // Take the latest 16 games
    const rollingGames = new Set(games.slice(-16));

    let careerN = 0;
    let careerTargets = 0;
    let rolling16N = 0;
    let rollingTargets = 0;

    for (const play of pPlays) {
      careerN++;
      if (play.isTeTarget) careerTargets++;

      if (rollingGames.has(play.gameId)) {
        rolling16N++;
        if (play.isTeTarget) rollingTargets++;
      }
    }

    const hasSufficientSample = careerN >= MIN_CAREER_DROPBACKS || rolling16N >= MIN_ROLLING_DROPBACKS;

    const career = careerN > 0 ? careerTargets / careerN : null;
    const rolling16 = rolling16N > 0 ? rollingTargets / rolling16N : null;

    const shrunkCareer = careerN > 0
      ? (careerTargets + CAREER_SHRINKAGE_WEIGHT * leagueMean) / (careerN + CAREER_SHRINKAGE_WEIGHT)
      : null;

    const shrunkRolling16 = rolling16N > 0
      ? (rollingTargets + ROLLING_SHRINKAGE_WEIGHT * leagueMean) / (rolling16N + ROLLING_SHRINKAGE_WEIGHT)
      : null;

    results.set(passerId, {
      career: careerN >= MIN_CAREER_DROPBACKS ? career : null,
      rolling16: rolling16N >= MIN_ROLLING_DROPBACKS ? rolling16 : null,
      careerN,
      rolling16N,
      shrunkCareer: careerN >= MIN_CAREER_DROPBACKS ? shrunkCareer : null,
      shrunkRolling16: rolling16N >= MIN_ROLLING_DROPBACKS ? shrunkRolling16 : null,
      leagueMean,
      sufficientSample: hasSufficientSample,
    });
  }

  return results;
}
