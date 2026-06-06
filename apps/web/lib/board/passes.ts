import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { toEdgeIndex } from "@sports/prediction-engine";

export interface PassListRow {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  edgeIndex: number | null;
  reason: string;
  evaluatedAt: string;
}

export interface BoardPassesPayload {
  data: { date: string; passes: PassListRow[] };
  meta: { isSampleData: boolean; suppressedDemoData?: boolean; dataError?: "DB_UNREACHABLE" };
}

function todayBounds(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function passReason(bookmakerCoverageMax: number, dataQualityScore: number): string {
  if (bookmakerCoverageMax < 3) return "Market depth below publish threshold.";
  if (dataQualityScore < 70) return "Evidence health below publish threshold.";
  return "No pick cleared the publish threshold.";
}

export async function loadBoardPasses(now = new Date()): Promise<BoardPassesPayload> {
  const demoActive = isStubMode() && isDemoPicksEnabled();

  if (demoActive) {
    return {
      data: { date: now.toISOString().slice(0, 10), passes: [] },
      meta: { isSampleData: false, suppressedDemoData: true },
    };
  }

  const { start, end } = todayBounds();
  try {
    const gateDecisions = await db.gateDecision.findMany({
      where: {
        status: "GATED",
        isBootstrap: false,
        evaluatedAt: { gte: start, lt: end },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { evaluatedAt: "desc" },
      take: 100,
    });

    if (gateDecisions.length > 0) {
      return {
        data: {
          date: now.toISOString().slice(0, 10),
          passes: gateDecisions.map((decision): PassListRow => ({
            id: decision.id,
            gameId: decision.gameId,
            matchup: `${decision.game.awayTeamName} @ ${decision.game.homeTeamName}`,
            sport: decision.game.sport.name,
            edgeIndex: toEdgeIndex(decision.edgeIndex ?? decision.game.currentEdgeIndex),
            reason: decision.reason,
            evaluatedAt: decision.evaluatedAt.toISOString(),
          })),
        },
        meta: { isSampleData: false },
      };
    }

    const games = await db.game.findMany({
      where: {
        commenceTime: { gte: start, lt: end },
        picks: { none: { isPublished: true, isBootstrap: false } },
      },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: 100,
    });

    const passes = games.map((game): PassListRow => ({
      id: `pass-${game.id}`,
      gameId: game.id,
      matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
      sport: game.sport.name,
      edgeIndex: toEdgeIndex(game.currentEdgeIndex),
      reason: passReason(game.bookmakerCoverageMax, game.dataQualityScore),
      evaluatedAt: game.updatedAt.toISOString(),
    }));

    return {
      data: { date: now.toISOString().slice(0, 10), passes },
      meta: { isSampleData: false },
    };
  } catch {
    return {
      data: { date: now.toISOString().slice(0, 10), passes: [] },
      meta: { isSampleData: false, dataError: "DB_UNREACHABLE" },
    };
  }
}
