/**
 * Play-size distribution — a pure, deterministic partitioning of team yardage
 * into categorical buckets (no fit).
 *
 * This module partitions qualifying offensive and defensive plays (pass/run
 * excluding QB kneels and penalties) into six buckets by yards gained:
 * NEGATIVE (< 0), ZERO (== 0), SHORT (1-5), MEDIUM (6-10), CHUNK (11-20),
 * and EXPLOSIVE (21+). It aggregates these plays per team over specific point-in-time
 * windows (season-to-date, rolling last 4 games, rolling last 8 games).
 *
 * Definitional metric: there is no model, no correlation gate, only
 * determinism. SHADOW status only.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One play size record, mapped from an nflverse play-by-play row. */
export interface PlaySizePlay {
  /** `game_id`+"-"+`play_id` — join/audit key, not a feature. */
  readonly playId: string;
  /** `game_id`. */
  readonly gameId: string;
  /** `season`. */
  readonly season: number;
  /** `week`. */
  readonly week: number;
  /** `posteam`. */
  readonly posteam: string;
  /** `defteam`. */
  readonly defteam: string;
  /** `play_type`. */
  readonly playType: string;
  /** `yards_gained`. */
  readonly yardsGained: number;
  /** `qb_kneel`. */
  readonly qbKneel: 0 | 1;
}

export type PlaySizeBucket = "NEGATIVE" | "ZERO" | "SHORT" | "MEDIUM" | "CHUNK" | "EXPLOSIVE";

export type WindowType = "SEASON_TO_DATE" | "ROLLING_4" | "ROLLING_8";
export type GrainType = "OFFENSE" | "DEFENSE_ALLOWED";

export interface PlaySizeDistribution {
  readonly teamId: string;
  readonly window: WindowType;
  readonly grain: GrainType;
  /** Total number of qualifying plays. */
  readonly qualifyingPlays: number;

  // Counts
  readonly negativePlays: number;
  readonly zeroPlays: number;
  readonly shortPlays: number;
  readonly mediumPlays: number;
  readonly chunkPlays: number;
  readonly explosivePlays: number;

  // Yardage sums
  readonly negativeYards: number;
  readonly zeroYards: number;
  readonly shortYards: number;
  readonly mediumYards: number;
  readonly chunkYards: number;
  readonly explosiveYards: number;
  readonly totalYards: number;

  // Shares (null if qualifyingPlays < 100)
  readonly negativeShare: number | null;
  readonly zeroShare: number | null;
  readonly shortShare: number | null;
  readonly mediumShare: number | null;
  readonly chunkShare: number | null;
  readonly explosiveShare: number | null;

  // Axes (derived, null if qualifyingPlays < 100)
  readonly bigPlayShare: number | null; // EXPLOSIVE
  readonly explosivePassRate: number | null; // pass plays >= 15 / pass plays

  // Exclusions (informational, not in the denominator)
  readonly excludedPlays: number;

  readonly provenance: ExpectedMetricProvenance;
}

export const PLAY_SIZE_MODEL_VERSION = "gse-play-size-v1";
const PLAY_SIZE_FEATURE_KEYS = ["yardsGained", "playType"] as const;

export function bucketOf(yardsGained: number): PlaySizeBucket {
  if (yardsGained < 0) return "NEGATIVE";
  if (yardsGained === 0) return "ZERO";
  if (yardsGained <= 5) return "SHORT";
  if (yardsGained <= 10) return "MEDIUM";
  if (yardsGained <= 20) return "CHUNK";
  return "EXPLOSIVE";
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: PLAY_SIZE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...PLAY_SIZE_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(PLAY_SIZE_FEATURE_KEYS),
    sampleSize,
  };
}

/**
 * Returns true if the play is qualifying, false if it's an exclusion.
 * Exclusions:
 * - playType is not "pass" or "run"
 * - qbKneel is 1
 * - yardsGained is not finite
 * - posteam is empty string
 */
export function isQualifying(play: PlaySizePlay): boolean {
  if (play.playType !== "pass" && play.playType !== "run") return false;
  if (play.qbKneel === 1) return false;
  if (!Number.isFinite(play.yardsGained)) return false;
  if (play.posteam === "") return false;
  return true;
}

/**
 * Accumulates play-size statistics for a set of plays.
 */
function aggregateDistribution(
  plays: PlaySizePlay[],
  teamId: string,
  window: WindowType,
  grain: GrainType
): PlaySizeDistribution {
  let qualifyingPlays = 0;
  let excludedPlays = 0;
  let passPlays = 0;
  let explosivePassPlays = 0; // pass plays >= 15 yards

  const counts: Record<PlaySizeBucket, number> = {
    NEGATIVE: 0, ZERO: 0, SHORT: 0, MEDIUM: 0, CHUNK: 0, EXPLOSIVE: 0
  };
  const yards: Record<PlaySizeBucket, number> = {
    NEGATIVE: 0, ZERO: 0, SHORT: 0, MEDIUM: 0, CHUNK: 0, EXPLOSIVE: 0
  };
  let totalYards = 0;

  for (const play of plays) {
    if (!isQualifying(play)) {
      excludedPlays++;
      continue;
    }

    // Check if team is relevant for this grain
    if (grain === "OFFENSE" && play.posteam !== teamId) {
      continue; // Normally shouldn't happen due to pre-filtering
    }
    if (grain === "DEFENSE_ALLOWED" && play.defteam !== teamId) {
      continue;
    }

    qualifyingPlays++;
    const bucket = bucketOf(play.yardsGained);
    counts[bucket]++;
    yards[bucket] += play.yardsGained;
    totalYards += play.yardsGained;

    if (play.playType === "pass") {
      passPlays++;
      if (play.yardsGained >= 15) {
        explosivePassPlays++;
      }
    }
  }

  const provenance = buildProvenance(qualifyingPlays);

  const meetsFloor = qualifyingPlays >= 100;

  const getShare = (count: number) => meetsFloor ? round(count / qualifyingPlays, 4) : null;

  return {
    teamId,
    window,
    grain,
    qualifyingPlays,

    negativePlays: counts.NEGATIVE,
    zeroPlays: counts.ZERO,
    shortPlays: counts.SHORT,
    mediumPlays: counts.MEDIUM,
    chunkPlays: counts.CHUNK,
    explosivePlays: counts.EXPLOSIVE,

    negativeYards: yards.NEGATIVE,
    zeroYards: yards.ZERO,
    shortYards: yards.SHORT,
    mediumYards: yards.MEDIUM,
    chunkYards: yards.CHUNK,
    explosiveYards: yards.EXPLOSIVE,
    totalYards,

    negativeShare: getShare(counts.NEGATIVE),
    zeroShare: getShare(counts.ZERO),
    shortShare: getShare(counts.SHORT),
    mediumShare: getShare(counts.MEDIUM),
    chunkShare: getShare(counts.CHUNK),
    explosiveShare: getShare(counts.CHUNK + counts.EXPLOSIVE),

    bigPlayShare: getShare(counts.EXPLOSIVE), // Same as explosiveShare but named specifically

    explosivePassRate: (meetsFloor && passPlays > 0) ? round(explosivePassPlays / passPlays, 4) : null,

    excludedPlays,
    provenance
  };
}

/**
 * Computes play-size distributions for all teams, windows, and grains,
 * relative to a target season and week (point-in-time disciplined).
 */
export function computePlaySizeDistributions(
  allPlays: readonly PlaySizePlay[],
  targetSeason: number,
  targetWeek: number
): PlaySizeDistribution[] {
  const targetTime = targetSeason * 100 + targetWeek;

  // Group plays by game for rolling windows (requires distinct games)
  const playsByGameAndTeam = new Map<string, {
    offensePlays: Map<string, PlaySizePlay[]>,
    defensePlays: Map<string, PlaySizePlay[]>
  }>();

  // Also collect all distinct teams seen
  const distinctTeams = new Set<string>();

  // Filter plays strictly before the target time within the same season
  const eligiblePlays = allPlays.filter(play => {
    const playTime = play.season * 100 + play.week;
    return play.season === targetSeason && playTime < targetTime;
  });

  for (const play of eligiblePlays) {
    if (play.posteam) distinctTeams.add(play.posteam);
    if (play.defteam) distinctTeams.add(play.defteam);

    if (!playsByGameAndTeam.has(play.gameId)) {
      playsByGameAndTeam.set(play.gameId, {
        offensePlays: new Map(),
        defensePlays: new Map()
      });
    }

    const gameRecord = playsByGameAndTeam.get(play.gameId)!;

    if (play.posteam) {
      if (!gameRecord.offensePlays.has(play.posteam)) gameRecord.offensePlays.set(play.posteam, []);
      gameRecord.offensePlays.get(play.posteam)!.push(play);
    }

    if (play.defteam) {
      if (!gameRecord.defensePlays.has(play.defteam)) gameRecord.defensePlays.set(play.defteam, []);
      gameRecord.defensePlays.get(play.defteam)!.push(play);
    }
  }

  // Sort game IDs to ensure chronological processing for rolling windows.
  // Game IDs often contain week/season info or we sort by play order.
  // Since we need it chronological by player/team, we can collect games
  // per team and sort them by an embedded week/season or by looking at
  // the first play's season/week.

  // Better approach for distinct games per team:
  // For each team, find all games they participated in (offense or defense)
  // Sort those games by play.season * 100 + play.week, then by gameId to be deterministic.

  const distributions: PlaySizeDistribution[] = [];
  const teams = Array.from(distinctTeams).sort();

  for (const team of teams) {
    // Gather all games for this team
    const teamGames = new Set<string>();
    for (const play of eligiblePlays) {
      if (play.posteam === team || play.defteam === team) {
        teamGames.add(play.gameId);
      }
    }

    // Sort team games chronologically
    const sortedGames = Array.from(teamGames).sort((gameA, gameB) => {
      // Find a play from gameA and gameB to extract season/week
      const playA = eligiblePlays.find(p => p.gameId === gameA)!;
      const playB = eligiblePlays.find(p => p.gameId === gameB)!;
      const timeA = playA.season * 100 + playA.week;
      const timeB = playB.season * 100 + playB.week;
      if (timeA !== timeB) return timeA - timeB;
      return gameA < gameB ? -1 : (gameA > gameB ? 1 : 0);
    });

    // Helper to get plays for a specific set of games and grain
    const getPlaysForGames = (games: string[], grain: GrainType): PlaySizePlay[] => {
      const plays: PlaySizePlay[] = [];
      for (const game of games) {
        const gameRecord = playsByGameAndTeam.get(game);
        if (gameRecord) {
          if (grain === "OFFENSE" && gameRecord.offensePlays.has(team)) {
            plays.push(...gameRecord.offensePlays.get(team)!);
          } else if (grain === "DEFENSE_ALLOWED" && gameRecord.defensePlays.has(team)) {
            plays.push(...gameRecord.defensePlays.get(team)!);
          }
        }
      }
      return plays;
    };

    // Calculate distributions for OFFENSE and DEFENSE_ALLOWED
    for (const grain of ["OFFENSE", "DEFENSE_ALLOWED"] as GrainType[]) {
      // SEASON_TO_DATE (all eligible plays)
      const allTeamPlays = getPlaysForGames(sortedGames, grain);
      distributions.push(aggregateDistribution(allTeamPlays, team, "SEASON_TO_DATE", grain));

      // ROLLING_4
      const rolling4Games = sortedGames.slice(-4);
      const rolling4Plays = getPlaysForGames(rolling4Games, grain);
      distributions.push(aggregateDistribution(rolling4Plays, team, "ROLLING_4", grain));

      // ROLLING_8
      const rolling8Games = sortedGames.slice(-8);
      const rolling8Plays = getPlaysForGames(rolling8Games, grain);
      distributions.push(aggregateDistribution(rolling8Plays, team, "ROLLING_8", grain));
    }
  }

  // Sort deterministically: team ascending, then window, then grain
  distributions.sort((a, b) => {
    if (a.teamId !== b.teamId) return a.teamId < b.teamId ? -1 : 1;
    if (a.window !== b.window) return a.window < b.window ? -1 : 1;
    if (a.grain !== b.grain) return a.grain < b.grain ? -1 : 1;
    return 0;
  });

  return distributions;
}
