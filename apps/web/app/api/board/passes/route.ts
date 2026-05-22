import { NextResponse } from "next/server";
import { db, getSamplePicks, isDemoPicksEnabled, isStubMode } from "@sports/db";

export const dynamic = "force-dynamic";

interface PassListRow {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  edgeIndex: number | null;
  reason: string;
  evaluatedAt: string;
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

export async function GET(): Promise<NextResponse> {
  const now = new Date();
  const demoActive = isStubMode() && isDemoPicksEnabled();

  if (demoActive) {
    const rows = getSamplePicks(now).slice(5, 10).map((pick, index): PassListRow => ({
      id: `sample-pass-${pick.gameId}`,
      gameId: pick.gameId,
      matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
      sport: pick.game.sport.name,
      edgeIndex: Math.round(pick.edgeScore * 10),
      reason: index % 2 === 0 ? "Consensus below publish threshold." : "Market depth too thin.",
      evaluatedAt: pick.dataFreshnessAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { date: now.toISOString().slice(0, 10), passes: rows },
      meta: { isSampleData: true },
    });
  }

  const { start, end } = todayBounds();
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
    edgeIndex: game.currentEdgeIndex,
    reason: passReason(game.bookmakerCoverageMax, game.dataQualityScore),
    evaluatedAt: game.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    success: true,
    data: { date: now.toISOString().slice(0, 10), passes },
    meta: { isSampleData: false },
  });
}
