import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gates = getReadinessGates();
  if (!gates.canExposePerformanceStats) {
    return NextResponse.json(bootstrapGateResponse("Performance stats"), { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all-time";
  const sport = searchParams.get("sport");

  // Minimum-sample floor (honesty guard). Publishing a raw win rate over a
  // handful of settled picks (e.g. "66.7%" off 3 picks) is misleading. The
  // honest floor is MIN_SETTLED_PICKS_FOR_LEARNING (default 100) from
  // platform-config. Below it we WITHHOLD the rate — never fabricate one —
  // returning the same null-winRate shape this route already emits for an
  // empty sample, plus an explicit insufficientSample flag. Above it,
  // behavior is unchanged.
  const minSettledFloor = Math.max(1, gates.minSettledPicksForLearning);

  // Aggregate real win/loss/push data from settled canonical picks only.
  // Bootstrap-era picks are excluded — their win rates are uncalibrated and
  // would produce misleading public performance stats.
  //
  // Synthetic seed picks (modelVersion === "v5.0.0-seed") are also
  // excluded so a dev-only seed never inflates customer-facing stats
  // when an operator flips PERFORMANCE_STATS_ENABLED in a non-prod
  // environment to test the surface.
  const picks = await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS", "PUSH"] },
      isPublished: true,
      isBootstrap: false,
      NOT: { modelVersion: "v5.0.0-seed" },
      ...(sport ? { game: { sport: { name: { contains: sport, mode: "insensitive" as const } } } } : {}),
    },
    // Aggregate-only read: select EXACTLY the two fields the per-sport tally
    // needs (result + sport name) rather than include-ing every Pick column and
    // full Game rows for hundreds/thousands of settled picks. Prisma groupBy
    // can't group by a relation field (game.sport.name is a join, not a Pick
    // scalar), so this narrowed select is the correct minimal-transfer shape —
    // identical output, far less data over the wire.
    select: {
      result: true,
      game: { select: { sport: { select: { name: true } } } },
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

  // Settled denominator for the floor: all decided picks (wins + losses +
  // pushes). Below the floor we withhold every published rate.
  const settledCount = overall.wins + overall.losses + overall.pushes;
  const insufficientSample = settledCount < minSettledFloor;

  const overallWinRate =
    !insufficientSample && overall.wins + overall.losses > 0
      ? Math.round((overall.wins / (overall.wins + overall.losses)) * 100 * 10) / 10
      : null;

  // When below the floor, suppress per-sport rates too — the counts stay
  // visible (they're factual), only the derived rate is withheld.
  const publishedStats = (insufficientSample
    ? stats.map((s) => ({ ...s, winRate: null }))
    : stats
  ).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    success: true,
    data: {
      overall: { ...overall, winRate: overallWinRate },
      bySport: publishedStats,
      period,
      insufficientSample,
      disclaimer:
        "Past performance does not guarantee future results. For informational purposes only.",
    },
  });
}
