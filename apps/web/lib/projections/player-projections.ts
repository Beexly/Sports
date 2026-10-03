/**
 * 2026 player projections from the historical player-stats archive.
 *
 * Aggregates PlayerGameStat into per-player season lines (games + mean PPR/game),
 * projects the target season with the recency+games-weighted method, and reports
 * the method's backtest error over real history (vs a carry-forward baseline) so
 * the projections ship WITH their measured accuracy. Read-only. Honest empty
 * state until the historical backfill has run.
 *
 * These are forecasts: this surface is premium-gated, not published to free
 * users, and is NOT wired into pick confidence — that stays an owner-gated step.
 */
import { db } from "@sports/db";
import {
  projectPlayerSeason,
  backtestProjections,
  type PlayerSeasonLine,
  type ProjectionBacktest,
} from "@sports/prediction-engine";

export interface PlayerProjectionRow {
  readonly playerId: string;
  readonly name: string;
  readonly position: string | null;
  readonly team: string | null;
  readonly projectedPprPerGame: number;
  readonly basisSeasons: number;
  readonly priorGames: number;
}

export interface PlayerProjectionsReport {
  readonly status: "ok" | "no-data";
  readonly targetSeason: number;
  readonly generatedAt: string;
  readonly playerCount: number;
  readonly backtest: ProjectionBacktest;
  readonly top: readonly PlayerProjectionRow[];
  readonly note: string;
}

interface GroupRow {
  readonly playerId: string;
  readonly season: number;
  readonly _count: { readonly _all: number };
  readonly _avg: { readonly fantasyPointsPpr: number | null };
}

export async function loadPlayerProjections(targetSeason: number, limit = 100): Promise<PlayerProjectionsReport> {
  const generatedAt = new Date().toISOString();

  const grouped = (await db.playerGameStat.groupBy({
    by: ["playerId", "season"],
    _count: { _all: true },
    _avg: { fantasyPointsPpr: true },
  })) as unknown as GroupRow[] | null;

  const rows = Array.isArray(grouped) ? grouped : [];
  const byPlayer = new Map<string, PlayerSeasonLine[]>();
  for (const g of rows) {
    const ppr = g._avg.fantasyPointsPpr;
    if (ppr === null) continue;
    const lines = byPlayer.get(g.playerId) ?? [];
    lines.push({ season: g.season, games: g._count._all, pprPerGame: ppr });
    byPlayer.set(g.playerId, lines);
  }

  if (byPlayer.size === 0) {
    return {
      status: "no-data",
      targetSeason,
      generatedAt,
      playerCount: 0,
      backtest: { sampleSize: 0, mae: 0, bias: 0, naiveMae: 0, skillVsNaive: 0 },
      top: [],
      note: "No player stats loaded yet. Run the player-data backfill, then re-check.",
    };
  }

  const backtest = backtestProjections(byPlayer.values());

  const players = await db.player.findMany({ select: { id: true, fullName: true, position: true, recentTeam: true } });
  const info = new Map((Array.isArray(players) ? players : []).map((p) => [p.id, p]));

  const top: PlayerProjectionRow[] = [];
  for (const [playerId, history] of byPlayer) {
    const proj = projectPlayerSeason(history, targetSeason);
    if (proj.priorGames === 0) continue;
    const meta = info.get(playerId);
    top.push({
      playerId,
      name: meta?.fullName ?? playerId,
      position: meta?.position ?? null,
      team: meta?.recentTeam ?? null,
      projectedPprPerGame: proj.projectedPprPerGame,
      basisSeasons: proj.basisSeasons,
      priorGames: proj.priorGames,
    });
  }
  top.sort((a, b) => b.projectedPprPerGame - a.projectedPprPerGame);

  return {
    status: "ok",
    targetSeason,
    generatedAt,
    playerCount: top.length,
    backtest,
    top: top.slice(0, limit),
    note:
      `Recency+games-weighted projections regressed to a prior, backtested over real history. ` +
      `Forecasts shown with measured error (mae ${backtest.mae} PPR/game vs naive ${backtest.naiveMae}); not wired into pick confidence.`,
  };
}
