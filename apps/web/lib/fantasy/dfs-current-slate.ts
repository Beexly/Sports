/**
 * Current NFL DFS slate — real players, real games, no fixture.
 *
 * This module is the ONLY thing that may feed the /fantasy/dfs board. It:
 *   1. resolves the NFL slate being played (games rows in the next 8 days),
 *   2. maps those games' team names to team abbreviations,
 *   3. builds the board from MEASURED per-game production (buildEngineSlate),
 *      filtered to the teams actually on the slate.
 *
 * What it will not do: invent a player, invent a salary, or present a
 * hand-written slate as DraftKings' board. Salaries exist only when a licensed
 * feed passes `salaryByPlayerId`; until then every row carries `salary: 0` and
 * `salaryIsReal: false`, and the surface must say so.
 */

import { db } from "@sports/db";
import { normalizeTeamAlias } from "@/lib/nfl/team-resolver";
import { buildEngineSlate, type EngineSlateReport } from "./engine-slate";
import type { DfsPlayer } from "./dfs-slate";

const NFL_SPORT_KEY = "americanfootball_nfl";
const SLATE_WINDOW_DAYS = 8;

export interface CurrentDfsSlate extends EngineSlateReport {
  /** NFL games in the slate window. Zero means there is no slate to price. */
  readonly slateGames: number;
  /** Latest week with measured production feeding the projection window. */
  readonly measuredThroughWeek: number;
  /** True when the board is the games being played, not the whole season table. */
  readonly filteredToSlate: boolean;
  readonly players: readonly DfsPlayer[];
}

/**
 * "Philadelphia Eagles" → "PHI". Tries the whole string, then the mascot (last
 * word). Null when nothing in the alias table matches — an unresolved team is
 * skipped, never guessed.
 */
export function resolveTeamAbbr(fullName: string): string | null {
  const direct = normalizeTeamAlias(fullName);
  if (direct) return direct;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return normalizeTeamAlias(parts[parts.length - 1] ?? "") ?? null;
}

export async function loadCurrentDfsSlate(
  now: Date = new Date(),
  salaryByPlayerId?: Readonly<Record<string, number>>,
): Promise<CurrentDfsSlate> {
  const seasonRow = await db.playerGameStat.findFirst({
    where: { fantasyPointsPpr: { not: null } },
    orderBy: [{ season: "desc" }, { week: "desc" }],
    select: { season: true, week: true },
  });
  const season = seasonRow?.season ?? new Date(now).getUTCFullYear();
  const measuredThroughWeek = seasonRow?.week ?? 0;

  const sport = await db.sport.findFirst({
    where: { key: NFL_SPORT_KEY },
    select: { id: true },
  });

  const windowEnd = new Date(now.getTime() + SLATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const games = sport
    ? await db.game.findMany({
        where: {
          sportId: sport.id,
          commenceTime: { gte: now, lte: windowEnd },
          mergedIntoGameId: null,
        },
        select: { homeTeamName: true, awayTeamName: true },
        orderBy: { commenceTime: "asc" },
      })
    : [];

  const opponentByTeam: Record<string, string> = {};
  for (const g of games) {
    const home = resolveTeamAbbr(g.homeTeamName);
    const away = resolveTeamAbbr(g.awayTeamName);
    if (!home || !away) continue;
    opponentByTeam[home] = away;
    opponentByTeam[away] = home;
  }
  const slateTeams = Object.keys(opponentByTeam);

  // The season's live depth chart is the only populated team association for the
  // current cohort (player_game_stats.team and players.recentTeam are both NULL),
  // so it is what puts a player on a slate team. No depth row = no team = no row.
  const depth = await db.depthChartEntry.findMany({
    where: { season },
    select: { playerId: true, team: true, depthRank: true },
  });
  const teamByPlayerId: Record<string, string> = {};
  for (const d of depth) {
    if (!d.playerId || !d.team) continue;
    // Prefer the starter's team if a player has multiple rows this season.
    if (teamByPlayerId[d.playerId] === undefined || d.depthRank === 1) {
      teamByPlayerId[d.playerId] = d.team;
    }
  }

  const report = await buildEngineSlate({
    season,
    week: measuredThroughWeek,
    now: now.toISOString(),
    salaryByPlayerId,
    teams: slateTeams.length > 0 ? slateTeams : undefined,
    opponentByTeam,
    teamByPlayerId,
  });

  const players = [...report.players].sort((a, b) => b.proj - a.proj);

  return {
    ...report,
    players,
    slateGames: games.length,
    measuredThroughWeek,
    filteredToSlate: slateTeams.length > 0,
  };
}
