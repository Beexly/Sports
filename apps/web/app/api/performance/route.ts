import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all-time";
  const sport = searchParams.get("sport");

  // Aggregate real win/loss/push data from settled picks
  const picks = await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS", "PUSH"] },
      isPublished: true,
      ...(sport ? { game: { sport: { name: { contains: sport, mode: "insensitive" as const } } } } : {}),
    },
    include: {
      game: {
        include: { sport: { select: { name: true } } },
      },
    },
  });

  // Aggregate by sport
  const bySport: Record<
    string,
    { sport: string; wins: number; losses: number; pushes: number; total: number }
  > = {};

  for (const pick of picks) {
    const sportName = pick.game.sport.name;
    if (!bySport[sportName]) {
      bySport[sportName] = { sport: sportName, wins: 0, losses: 0, pushes: 0, total: 0 };
    }
    const entry = bySport[sportName]!;
    entry.total++;
    if (pick.result === "WIN") entry.wins++;
    else if (pick.result === "LOSS") entry.losses++;
    else if (pick.result === "PUSH") entry.pushes++;
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

  // Overall totals
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
}
