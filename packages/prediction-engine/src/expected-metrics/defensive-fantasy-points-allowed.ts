/**
 * Defensive Fantasy Points Allowed - a deterministic rolling window metric (no fit).
 *
 * Computes PPR fantasy points allowed per game by defense vs opponent position.
 * Point-in-time calculation requires that a rolling window for week W only contains
 * games strictly before week W.
 *
 * Scoring Formula (PPR):
 * 1.0 per reception, 0.1 per rushing yard, 0.1 per receiving yard, 6 per rushing TD,
 * 6 per receiving TD, 0.04 per passing yard, 4 per passing TD, -2 per interception.
 * QB points = passing + rushing. RB/WR/TE points = rushing + receiving.
 */

import { type PbpRow } from "./nflverse-pbp-mapper.js";

/** Options for fantasy points calculation. */
export interface FantasyPointsOptions {
  /**
   * Verified position source. Players whose position cannot be verified
   * are excluded from per-position sums and counted in output.
   */
  readonly positionLookup: (gsisId: string) => string | undefined;
}

/** One per-game window rollup for a given defense against a specific position. */
export interface DefensiveFantasyPointsAllowedWindow {
  readonly defteam: string;
  readonly position: string;
  /** Points per game allowed across the season. */
  readonly seasonWindow: number;
  /** Points per game allowed across the trailing 4 games. */
  readonly rolling4Window: number;
  /** Points per game allowed across the trailing 8 games. */
  readonly rolling8Window: number;
  /** Count of plays excluded because the player's position was not found. */
  readonly excludedPlayerPlays: number;
  /** Sum of fantasy points excluded for unverified players. */
  readonly excludedPoints: number;
}

export interface DefensiveFantasyPointsAllowedOutput {
  readonly week: number;
  readonly defteam: string;
  readonly position: string;
  readonly seasonWindow: number;
  readonly rolling4Window: number;
  readonly rolling8Window: number;
  readonly excludedPlayerPlays: number;
  readonly excludedPoints: number;
}

// Helpers for numeric parsing
function num(value: string | undefined): number {
  if (value === undefined || value === "") return NaN;
  return Number(value);
}

function bin(value: string | undefined): 0 | 1 {
  return value === "1" ? 1 : 0;
}

/**
 * Game identifier parsing. Expects YYYY_WW_AWAY_HOME.
 * @returns the week number, or NaN if malformed.
 */
function parseWeekFromGameId(gameId: string): number {
  if (!gameId) return NaN;
  const parts = gameId.split("_");
  if (parts.length < 2) return NaN;
  return Number(parts[1]);
}

export function computeDefensiveFantasyPointsAllowed(
  rows: readonly PbpRow[],
  options: FantasyPointsOptions,
): DefensiveFantasyPointsAllowedOutput[] {
  // 1. Group by game_id to get distinct games and their weeks
  const gameWeeks = new Map<string, number>();
  for (const row of rows) {
    const gameId = row["game_id"] ?? "";
    if (gameId && !gameWeeks.has(gameId)) {
      const week = parseWeekFromGameId(gameId);
      if (Number.isFinite(week)) {
        gameWeeks.set(gameId, week);
      }
    }
  }

  // Define our nested grouping structure: team -> game -> { positions: Map, exclusions: { plays, points } }
  interface GameStats {
    readonly gameId: string;
    readonly week: number;
    positions: Map<string, number>; // position -> points
    exclusions: { plays: number; points: number };
  }

  const teamGames = new Map<string, Map<string, GameStats>>();

  function getGameStats(defteam: string, gameId: string): GameStats {
    let gamesForTeam = teamGames.get(defteam);
    if (!gamesForTeam) {
      gamesForTeam = new Map<string, GameStats>();
      teamGames.set(defteam, gamesForTeam);
    }
    let stats = gamesForTeam.get(gameId);
    if (!stats) {
      stats = {
        gameId,
        week: gameWeeks.get(gameId)!,
        positions: new Map<string, number>(),
        exclusions: { plays: 0, points: 0 },
      };
      gamesForTeam.set(gameId, stats);
    }
    return stats;
  }

  // 2. Accumulate points per game per defteam per position
  for (const row of rows) {
    const gameId = row["game_id"] ?? "";
    const defteam = row["defteam"] ?? "";
    if (!gameId || !defteam || !gameWeeks.has(gameId)) continue;

    const playType = row["play_type"];
    if (playType !== "pass" && playType !== "run") continue;

    const isPass = playType === "pass";
    const yardsGained = num(row["yards_gained"]);
    const touchdown = bin(row["touchdown"]);
    const interception = bin(row["interception"]);
    const completePass = bin(row["complete_pass"]);

    const stats = getGameStats(defteam, gameId);

    function addPoints(playerId: string, pts: number) {
      if (!playerId || !Number.isFinite(pts) || pts === 0) return;
      const position = options.positionLookup(playerId);
      if (!position) {
        stats.exclusions.plays += 1;
        stats.exclusions.points += pts;
      } else {
        const current = stats.positions.get(position) ?? 0;
        stats.positions.set(position, current + pts);
      }
    }

    if (isPass) {
      const passerId = row["passer_player_id"] ?? "";
      const receiverId = row["receiver_player_id"] ?? "";

      let passYards = 0;
      let passTd = 0;

      if (completePass === 1) {
        passYards = yardsGained;
        passTd = touchdown;

        // Receiver gets 1 PPR, Rec Yards, Rec TD
        let recPts = 1.0;
        if (Number.isFinite(yardsGained)) recPts += 0.1 * yardsGained;
        if (touchdown === 1) recPts += 6;
        addPoints(receiverId, recPts);
      }

      // Passer gets Pass Yards, Pass TD, INT ONLY if they are a QB.
      // RB/WR/TE points = rushing + receiving lines only.
      if (passerId) {
        const passerPosition = options.positionLookup(passerId);
        if (passerPosition === "QB") {
          let passPts = 0;
          if (Number.isFinite(passYards)) passPts += 0.04 * passYards;
          if (passTd === 1) passPts += 4;
          if (interception === 1) passPts += -2;
          addPoints(passerId, passPts);
        } else if (!passerPosition) {
          // If position is unverified, exclude the play for the passer
          stats.exclusions.plays += 1;
        }
      }

    } else {
      const rusherId = row["rusher_player_id"] ?? "";
      let rushPts = 0;
      if (Number.isFinite(yardsGained)) rushPts += 0.1 * yardsGained;
      if (touchdown === 1) rushPts += 6;
      addPoints(rusherId, rushPts);
    }
  }

  // 3. Compute rolling windows point-in-time
  const results: DefensiveFantasyPointsAllowedOutput[] = [];

  // Find all unique weeks across the dataset
  const allWeeks = Array.from(new Set(gameWeeks.values())).sort((a, b) => a - b);

  for (const [defteam, games] of teamGames.entries()) {
    // Sort games by week for this team
    const sortedGames = Array.from(games.values()).sort((a, b) => a.week - b.week);

    // Find all unique positions this team faced
    const allPositions = new Set<string>();
    for (const game of sortedGames) {
      for (const pos of game.positions.keys()) {
        allPositions.add(pos);
      }
    }

    for (const currentWeek of allWeeks) {
      // Strictly before current week
      const pastGames = sortedGames.filter(g => g.week < currentWeek);
      if (pastGames.length === 0) continue;

      const seasonGames = pastGames;
      const rolling4Games = pastGames.slice(-4);
      const rolling8Games = pastGames.slice(-8);

      for (const position of allPositions) {
        let seasonPts = 0;
        let rolling4Pts = 0;
        let rolling8Pts = 0;

        for (const g of seasonGames) seasonPts += g.positions.get(position) ?? 0;
        for (const g of rolling4Games) rolling4Pts += g.positions.get(position) ?? 0;
        for (const g of rolling8Games) rolling8Pts += g.positions.get(position) ?? 0;

        let excludedPlays = 0;
        let excludedPts = 0;
        for (const g of seasonGames) {
          excludedPlays += g.exclusions.plays;
          excludedPts += g.exclusions.points;
        }

        results.push({
          week: currentWeek,
          defteam,
          position,
          seasonWindow: seasonGames.length > 0 ? seasonPts / seasonGames.length : 0,
          rolling4Window: rolling4Games.length > 0 ? rolling4Pts / rolling4Games.length : 0,
          rolling8Window: rolling8Games.length > 0 ? rolling8Pts / rolling8Games.length : 0,
          excludedPlayerPlays: excludedPlays,
          excludedPoints: excludedPts,
        });
      }
    }
  }

  return results;
}
