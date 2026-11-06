/**
 * QB Scramble EPA — a pure, deterministic expected-metrics module that computes, per QB,
 * the scramble count, rate, EPA/scramble, total scramble EPA, and non-scramble dropback
 * equivalents from nflverse play-by-play.
 *
 * Scramble: a play with `qb_scramble == 1`.
 * Dropback: a play with `play_type === "pass"` or a scramble.
 */

import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { round } from "./numeric.js";

/** One scramble or dropback play, mapped from an nflverse play-by-play row. */
export interface ScramblePlay {
  /** `game_id`+"-"+`play_id` */
  readonly playId: string;
  /** `game_id` */
  readonly gameId: string;
  /** `season` */
  readonly season: number;
  /** `week` */
  readonly week: number;
  /** `rusher_player_id` for scrambles, `passer_player_id` otherwise */
  readonly playerId: string;
  /** `posteam` */
  readonly posteam: string;
  /** 1 if qb_scramble == 1, 0 otherwise */
  readonly isScramble: 0 | 1;
  /** 1 if it's a dropback (play_type == 'pass' or qb_scramble == 1) */
  readonly isDropback: 0 | 1;
  /** Our EPA for the play (attached later via attachOwnEpa); null means unratable */
  readonly epa: number | null;
}

export const QB_SCRAMBLE_EPA_MODEL_VERSION = "gse-qb-scramble-epa-v1";
export const SCRAMBLE_WINDOW_MIN_DROPBACKS_4 = 40;
export const SCRAMBLE_WINDOW_MIN_DROPBACKS_8_SEASON = 80;

const FEATURE_KEYS = [
  "playId",
  "gameId",
  "season",
  "week",
  "playerId",
  "posteam",
  "isScramble",
  "isDropback",
  "epa",
] as const;

export interface QbScrambleEpaResult {
  readonly playerId: string;
  readonly scrambleCount: number;
  readonly dropbackCount: number;
  readonly scrambleRate: number;
  readonly scrambleEpaPerPlay: number;
  readonly scrambleEpaTotal: number;
  readonly nonScrambleDropbackEpaPerPlay: number;
  readonly nonScrambleDropbackEpaTotal: number;
  readonly scrambleVsNonScrambleEpaDifferential: number;
  readonly diagnosticsNullEpaScrambles: number;
  readonly provenance: ExpectedMetricProvenance;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: QB_SCRAMBLE_EPA_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(FEATURE_KEYS),
    sampleSize,
  };
}

export interface QbScrambleEpaOptions {
  /** Target season (inclusive). */
  readonly targetSeason: number;
  /**
   * Target week (exclusive). Point-in-time discipline: only plays strictly
   * before `targetWeek` in `targetSeason` are used.
   */
  readonly targetWeek: number;
  /** Maximum number of previous games to look back. */
  readonly windowGames?: number;
  /** Minimum dropbacks in the window to be included. */
  readonly minDropbacks: number;
}

/**
 * Computes the point-in-time QB scramble EPA metrics.
 */
export function computeQbScrambleEpa(
  plays: readonly ScramblePlay[],
  options: QbScrambleEpaOptions
): QbScrambleEpaResult[] {
  // Point-in-time filtering: only plays from the target season, strictly before the target week.
  const eligible = plays.filter((p) => p.season === options.targetSeason && p.week < options.targetWeek);

  // Group by playerId. We need to group games by week (or gameId) to slice the last N games.
  const byPlayer = new Map<string, ScramblePlay[]>();
  for (const p of eligible) {
    if (p.isDropback === 1 && p.playerId !== "") {
      let bucket = byPlayer.get(p.playerId);
      if (!bucket) {
        bucket = [];
        byPlayer.set(p.playerId, bucket);
      }
      bucket.push(p);
    }
  }

  let leagueScrambleEpaSum = 0;
  let leagueScrambleCount = 0;

  // Calculate league mean from all eligible plays across all players
  for (const p of eligible) {
    if (p.isDropback === 1 && p.isScramble === 1 && p.epa !== null) {
      leagueScrambleEpaSum += p.epa;
      leagueScrambleCount += 1;
    }
  }

  const leagueMeanEpaPerScramble = leagueScrambleCount > 0 ? leagueScrambleEpaSum / leagueScrambleCount : 0;

  const results: QbScrambleEpaResult[] = [];

  for (const [playerId, playerPlays] of byPlayer.entries()) {
    // Sort player's plays by week asc, then gameId, then playId
    playerPlays.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      if (a.gameId !== b.gameId) return a.gameId.localeCompare(b.gameId);
      return a.playId.localeCompare(b.playId);
    });

    let windowPlays = playerPlays;
    if (options.windowGames !== undefined) {
      // Find distinct gameIds for this player
      const gameIds = new Set<string>();
      for (const p of playerPlays) {
        gameIds.add(p.gameId);
      }

      const distinctGames = Array.from(gameIds);
      if (distinctGames.length > options.windowGames) {
        const keptGames = new Set(distinctGames.slice(-options.windowGames));
        windowPlays = playerPlays.filter((p) => keptGames.has(p.gameId));
      }
    }

    const dropbackCount = windowPlays.length;
    if (dropbackCount < options.minDropbacks) continue;

    let scrambleCount = 0;
    let scrambleEpaSum = 0;
    let nonScrambleDropbackCount = 0;
    let nonScrambleEpaSum = 0;
    let nullEpaScrambles = 0;

    for (const p of windowPlays) {
      if (p.isScramble === 1) {
        scrambleCount += 1;
        if (p.epa !== null) {
          scrambleEpaSum += p.epa;
        } else {
          nullEpaScrambles += 1;
        }
      } else {
        // Dropback but not a scramble
        nonScrambleDropbackCount += 1;
        if (p.epa !== null) {
          nonScrambleEpaSum += p.epa;
        }
      }
    }

    const scrambleRate = dropbackCount > 0 ? scrambleCount / dropbackCount : 0;
    const ratableScrambles = scrambleCount - nullEpaScrambles;

    // Shrinkage: n/(n+k), k=20
    const shrunkScrambleEpaPerPlay =
      (scrambleEpaSum + leagueMeanEpaPerScramble * 20) / (ratableScrambles + 20);

    const nonScrambleDropbackEpaPerPlay =
      nonScrambleDropbackCount > 0 ? nonScrambleEpaSum / nonScrambleDropbackCount : 0;

    const differential = shrunkScrambleEpaPerPlay - nonScrambleDropbackEpaPerPlay;

    results.push({
      playerId,
      scrambleCount,
      dropbackCount,
      scrambleRate: round(scrambleRate, 4),
      scrambleEpaPerPlay: round(shrunkScrambleEpaPerPlay, 4),
      scrambleEpaTotal: round(scrambleEpaSum, 4),
      nonScrambleDropbackEpaPerPlay: round(nonScrambleDropbackEpaPerPlay, 4),
      nonScrambleDropbackEpaTotal: round(nonScrambleEpaSum, 4),
      scrambleVsNonScrambleEpaDifferential: round(differential, 4),
      diagnosticsNullEpaScrambles: nullEpaScrambles,
      provenance: buildProvenance(windowPlays.length),
    });
  }

  // Sort deterministically: by scrambleEpaTotal desc, then playerId asc
  results.sort((a, b) => b.scrambleEpaTotal - a.scrambleEpaTotal || a.playerId.localeCompare(b.playerId));

  return results;
}
