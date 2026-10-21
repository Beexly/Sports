/**
 * Offensive-minus-defensive scrimmage-play differential.
 *
 * This metric aggregates nflverse play-by-play (pbp) rows to compute a
 * team's per-game possession pace/differential: how long the offense stays
 * on the field vs the defense.
 *
 * POPULATION: The universe of plays is strictly limited to rows with
 * `play_type === "pass"` or `play_type === "run"`. This EXCLUDES
 * `no_play` (penalty-nullified snaps), `punt`, `field_goal`, `kickoff`,
 * and extra points. It specifically INCLUDES `qb_kneel` (which nflverse
 * types as "run") and `qb_spike` (typed as "pass") because those represent
 * true elapsed scrimmage downs, unlike nullified penalty snaps.
 *
 * This is a pbp scrimmage-play differential, NOT official NFL snap counts.
 * Official snap counts include penalty-nullified snaps. Do not present or
 * document this module as yielding official snap counts.
 *
 * WINDOWING: Strict point-in-time (PIT). A target game's window includes only
 * games STRICTLY BEFORE it, sorted by `season * 100 + week`. A game is never
 * included in its own window.
 */

import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { round } from "./numeric.js";

/** One scrimmage play (pass or run) mapped from nflverse. */
export interface ScrimmagePlayRow {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly playType: string;
}

export interface SnapDifferentialWindowResult {
  readonly games: number;
  readonly offScrimmagePlays: number;
  readonly defScrimmagePlays: number;
  /** (offScrimmagePlays - defScrimmagePlays) / games. null if games < 3. */
  readonly scrimmagePlayDifferentialPerGame: number | null;
}

export interface TeamSnapDifferential {
  readonly teamId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly std: SnapDifferentialWindowResult;
  readonly l4: SnapDifferentialWindowResult;
  readonly l8: SnapDifferentialWindowResult;
  readonly provenance: ExpectedMetricProvenance;
}

export const SNAP_DIFFERENTIAL_MODEL_VERSION = "gse-snap-diff-v1";

const SNAP_DIFF_FEATURE_KEYS = ["teamId", "gameId", "season", "week"] as const;

export function computeSnapDifferential(plays: readonly ScrimmagePlayRow[]): TeamSnapDifferential[] {
  const provenance: ExpectedMetricProvenance = {
    modelVersion: SNAP_DIFFERENTIAL_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...SNAP_DIFF_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(SNAP_DIFF_FEATURE_KEYS),
    sampleSize: plays.length,
  };

  // Group plays by gameId, strictly enforcing population discipline
  const playsByGame = new Map<string, ScrimmagePlayRow[]>();
  for (const play of plays) {
    if (play.playType !== "pass" && play.playType !== "run") continue;

    let bucket = playsByGame.get(play.gameId);
    if (!bucket) {
      bucket = [];
      playsByGame.set(play.gameId, bucket);
    }
    bucket.push(play);
  }

  // Pre-aggregate team play counts per game
  interface GameStats {
    gameId: string;
    season: number;
    week: number;
    pitKey: number; // season * 100 + week
    offPlays: Map<string, number>;
    defPlays: Map<string, number>;
  }

  const gameStatsList: GameStats[] = [];

  for (const [gameId, gamePlays] of playsByGame.entries()) {
    if (gamePlays.length === 0) continue;
    const firstPlay = gamePlays[0]!;

    const stats: GameStats = {
      gameId,
      season: firstPlay.season,
      week: firstPlay.week,
      pitKey: firstPlay.season * 100 + firstPlay.week,
      offPlays: new Map<string, number>(),
      defPlays: new Map<string, number>(),
    };

    for (const p of gamePlays) {
      stats.offPlays.set(p.posteam, (stats.offPlays.get(p.posteam) || 0) + 1);
      stats.defPlays.set(p.defteam, (stats.defPlays.get(p.defteam) || 0) + 1);
    }

    gameStatsList.push(stats);
  }

  // Teams are all keys in offPlays and defPlays across all games
  const allTeams = new Set<string>();
  for (const stats of gameStatsList) {
    for (const team of stats.offPlays.keys()) allTeams.add(team);
    for (const team of stats.defPlays.keys()) allTeams.add(team);
  }

  // Sort games strictly by pitKey (season * 100 + week), then tie-break on gameId
  gameStatsList.sort((a, b) => {
    if (a.pitKey !== b.pitKey) return a.pitKey - b.pitKey;
    return a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0;
  });

  const results: TeamSnapDifferential[] = [];

  for (const team of allTeams) {
    // Collect all games involving this team
    const teamGames = gameStatsList.filter(g => g.offPlays.has(team) || g.defPlays.has(team));

    // teamGames is already sorted by pitKey asc, gameId asc
    for (let i = 0; i < teamGames.length; i++) {
      const targetGame = teamGames[i]!;

      // Window is strictly games before targetGame
      // Since teamGames is sorted, we only look at games from 0 to i-1
      // BUT we must also strictly enforce PIT: do not include games from the SAME week
      // (Even if sorted earlier by gameId tie-breaker)

      const priorGames: GameStats[] = [];
      for (let j = 0; j < i; j++) {
        if (teamGames[j]!.pitKey < targetGame.pitKey) {
          priorGames.push(teamGames[j]!);
        }
      }

      // Helper to compute window result
      const buildWindow = (windowGames: GameStats[]): SnapDifferentialWindowResult => {
        let offTotal = 0;
        let defTotal = 0;
        for (const g of windowGames) {
          offTotal += (g.offPlays.get(team) || 0);
          defTotal += (g.defPlays.get(team) || 0);
        }

        const count = windowGames.length;
        let diffPerGame: number | null = null;
        if (count >= 3) {
          diffPerGame = round((offTotal - defTotal) / count, 4);
        }

        return {
          games: count,
          offScrimmagePlays: offTotal,
          defScrimmagePlays: defTotal,
          scrimmagePlayDifferentialPerGame: diffPerGame
        };
      };

      const stdGames = priorGames.filter(g => g.season === targetGame.season);
      const l4Games = priorGames.slice(-4);
      const l8Games = priorGames.slice(-8);

      results.push({
        teamId: team,
        gameId: targetGame.gameId,
        season: targetGame.season,
        week: targetGame.week,
        std: buildWindow(stdGames),
        l4: buildWindow(l4Games),
        l8: buildWindow(l8Games),
        provenance
      });
    }
  }

  // Sort final output for determinism
  results.sort((a, b) => {
    if (a.teamId !== b.teamId) return a.teamId < b.teamId ? -1 : 1;
    if (a.season !== b.season) return a.season - b.season;
    if (a.week !== b.week) return a.week - b.week;
    return a.gameId < b.gameId ? -1 : 1;
  });

  return results;
}
