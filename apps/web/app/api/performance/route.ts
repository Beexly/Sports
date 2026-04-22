import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const gates = getReadinessGates();
    if (!gates.canExposePerformanceStats) {
      return NextResponse.json(bootstrapGateResponse("Performance stats"), { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "all-time";
    const sport = searchParams.get("sport")?.slice(0, 32) ?? null;

    // Aggregate win/loss/push data via SQL (scales with volume; no in-memory scan).
    // Bootstrap-era picks are excluded — their win rates are uncalibrated and
    // would produce misleading public performance stats.
    // groupBy requires the sport name, which lives on the related sport row,
    // so we group by sportId then join once to map IDs → names.
    const groups = await db.pick.groupBy({
      by: ["gameId", "result"],
      where: {
        result: { in: ["WIN", "LOSS", "PUSH"] },
        isPublished: true,
        isBootstrap: false,
        ...(sport
          ? { game: { sport: { name: { contains: sport, mode: "insensitive" as const } } } }
          : {}),
      },
      _count: { _all: true },
    });

    if (groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overall: { wins: 0, losses: 0, pushes: 0, total: 0, winRate: null },
          bySport: [],
          period,
          disclaimer:
            "Past performance does not guarantee future results. For informational purposes only.",
        },
      });
    }

    // Map gameIds → sport name in a single query
    const gameIds = Array.from(new Set(groups.map((g) => g.gameId)));
    const games = await db.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, sport: { select: { name: true } } },
    });
    const gameSportName = new Map(games.map((g) => [g.id, g.sport.name]));

    // Aggregate by sport
    const bySport: Record<
      string,
      { sport: string; wins: number; losses: number; pushes: number; total: number }
    > = {};

    for (const g of groups) {
      const sportName = gameSportName.get(g.gameId);
      if (!sportName) continue;
      if (!bySport[sportName]) {
        bySport[sportName] = { sport: sportName, wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      const entry = bySport[sportName]!;
      const count = g._count._all;
      entry.total += count;
      if (g.result === "WIN") entry.wins += count;
      else if (g.result === "LOSS") entry.losses += count;
      else if (g.result === "PUSH") entry.pushes += count;
    }

    const stats = Object.values(bySport).map((s) => ({
      sport: s.sport,
      wins: s.wins,
      losses: s.losses,
      pushes: s.pushes,
      total: s.total,
      winRate:
        s.wins + s.losses > 0
          ? Math.round((s.wins / (s.wins + s.losses)) * 100 * 10) / 10
          : null,
    }));

    const overall = stats.reduce(
      (acc, s) => ({
        wins: acc.wins + s.wins,
        losses: acc.losses + s.losses,
        pushes: acc.pushes + s.pushes,
        total: acc.total + s.total,
      }),
      { wins: 0, losses: 0, pushes: 0, total: 0 }
    );

    const overallWinRate =
      overall.wins + overall.losses > 0
        ? Math.round((overall.wins / (overall.wins + overall.losses)) * 100 * 10) / 10
        : null;

    return NextResponse.json({
      success: true,
      data: {
        overall: { ...overall, winRate: overallWinRate },
        bySport: stats.sort((a, b) => b.total - a.total),
        period,
        disclaimer:
          "Past performance does not guarantee future results. For informational purposes only.",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/performance] ${message}`);
    return NextResponse.json(
      { success: false, error: "Failed to load performance data" },
      { status: 500 }
    );
  }
}
