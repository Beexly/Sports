import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";

type MarketTwinPosture = "READY_TO_SCORE" | "WATCH_ONLY" | "CONFLICT" | "QUIET";

function postureForGame(game: {
  bookmakerCoverageMax: number;
  contextComputedAt: Date | null;
  lineMovementSpread: number | null;
}): MarketTwinPosture {
  const freshnessMinutes = game.contextComputedAt
    ? (Date.now() - game.contextComputedAt.getTime()) / 60_000
    : null;
  if (game.lineMovementSpread !== null && Math.abs(game.lineMovementSpread) >= 3) {
    return "CONFLICT";
  }
  if (game.bookmakerCoverageMax >= 5 && freshnessMinutes !== null && freshnessMinutes <= 120) {
    return "READY_TO_SCORE";
  }
  if (game.bookmakerCoverageMax > 0) return "WATCH_ONLY";
  return "QUIET";
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const games = await db.game
    .findMany({
      where: {
        commenceTime: { gte: now, lte: cutoff },
        status: "SCHEDULED",
      },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: 50,
    })
    .catch(() => []);

  return NextResponse.json(
    {
      generatedAt: now.toISOString(),
      rows: games.map((game) => ({
        gameId: game.id,
        sport: game.sport.name,
        matchup: `${game.awayTeamName} at ${game.homeTeamName}`,
        commenceTime: game.commenceTime,
        posture: postureForGame(game),
        bookmakerCoverageMax: game.bookmakerCoverageMax,
        lineMovementSpread: game.lineMovementSpread,
        contextComputedAt: game.contextComputedAt,
      })),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
