/**
 * Repair drain for PostSettlementWork TEAM_GAME_LOG rows left PENDING by a
 * crash between settleSport()'s enqueue and its settleGameLogs() write
 * (hardening 6.10). Unlike CLV_GRADE/SNAPSHOT_OUTCOME — which the free
 * settlement path already drains every cycle — TEAM_GAME_LOG had no repair
 * path anywhere: a mid-write crash left the row PENDING forever with no
 * process ever revisiting it.
 *
 * settleGameLogs() upserts on the (gameId, teamName) unique constraint, so
 * re-running it for an already-written game is a no-op-equivalent, safe to
 * retry without limit.
 */

import { settleGameLogs } from "@sports/data-ingestion";
import {
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
  type PostSettlementWorkDelegate,
} from "./post-settlement-work.js";

export type TeamGameLogRepairGame = {
  readonly id: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly dataQualityScore: number;
  readonly sport: { readonly key: string };
};

export type TeamGameLogRepairDb = {
  postSettlementWork: PostSettlementWorkDelegate & {
    findMany: (args: {
      where: { status: string; kind: string };
      take: number;
      orderBy: { createdAt: "asc" };
      select: { subjectId: true };
    }) => Promise<Array<{ subjectId: string }>>;
  };
  game: {
    findMany: (args: {
      where: { id: { in: string[] }; homeScore: { not: null }; awayScore: { not: null } };
      select: Record<string, unknown>;
    }) => Promise<TeamGameLogRepairGame[]>;
  };
  openingLine: {
    findUnique: (args: {
      where: { gameId_market: { gameId: string; market: string } };
    }) => Promise<{ spread: number | null } | null>;
  };
};

export type TeamGameLogRepairGates = {
  readonly canPersistCanonicalHistory: boolean;
  readonly minDataQualityForGameLog: number;
};

/**
 * Repair drain: complete PENDING TEAM_GAME_LOG work for games that already
 * have final scores. Call at the end of a paid-path settlement cycle.
 */
export async function drainPendingTeamGameLogs(
  db: TeamGameLogRepairDb,
  gates: TeamGameLogRepairGates,
  options: { take?: number } = {},
): Promise<{ attempted: number; done: number; failed: number }> {
  const take = options.take ?? 80;
  const pending = await db.postSettlementWork.findMany({
    where: { status: "PENDING", kind: "TEAM_GAME_LOG" },
    take,
    orderBy: { createdAt: "asc" },
    select: { subjectId: true },
  });
  if (pending.length === 0) return { attempted: 0, done: 0, failed: 0 };

  const ids = pending.map((p) => p.subjectId);
  const games = await db.game.findMany({
    where: { id: { in: ids }, homeScore: { not: null }, awayScore: { not: null } },
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      homeScore: true,
      awayScore: true,
      dataQualityScore: true,
      sport: { select: { key: true } },
    },
  });

  const isBootstrap = !gates.canPersistCanonicalHistory;
  let done = 0;
  let failed = 0;
  for (const game of games) {
    try {
      const openingSpreadOdds = await db.openingLine.findUnique({
        where: { gameId_market: { gameId: game.id, market: "SPREADS" } },
      });
      await settleGameLogs({
        gameId: game.id,
        homeTeam: game.homeTeamName,
        awayTeam: game.awayTeamName,
        sport: game.sport.key,
        gameDate: game.commenceTime,
        homeScore: game.homeScore as number,
        awayScore: game.awayScore as number,
        spread: openingSpreadOdds?.spread ?? null,
        isBootstrap,
        gameDataQualityScore: game.dataQualityScore,
        minDataQualityThreshold: gates.minDataQualityForGameLog,
      });
      await markPostSettlementWorkDone(db.postSettlementWork, game.id, "TEAM_GAME_LOG");
      done++;
    } catch (err) {
      console.warn(
        `[team-game-log-repair] failed game=${game.id}: ` +
          `${err instanceof Error ? err.message : err}`,
      );
      await markPostSettlementWorkFailed(db.postSettlementWork, game.id, "TEAM_GAME_LOG", err);
      failed++;
    }
  }

  return { attempted: games.length, done, failed };
}
