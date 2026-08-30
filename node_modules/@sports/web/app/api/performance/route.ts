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
  //
  // GSE-SEC-031 fix: this query previously used db.pick.findMany(), which
  // loaded EVERY settled pick row into the Node process and aggregated in
  // JavaScript — O(picks) data transfer that grows unbounded as the pick
  // count scales toward 10k+. Instead, we push the GROUP BY to the database
  // so it returns one row per (sport, result) combination — O(sports × results)
  // rows regardless of how many picks exist. Prisma's groupBy cannot group by
  // a relation field (game.sport.name is a join, not a Pick scalar), so we use
  // a parameterized raw SQL query. The ${sportPattern} interpolation is safely
  // parameterized by Prisma's tagged template (never string-concatenated).
  const sportPattern = sport ? `%${sport}%` : null;
  const rows = await db.$queryRaw<
    Array<{ sport: string; result: string; count: number }>
  >`
    SELECT s.name AS sport, p.result, COUNT(*)::int AS count
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    JOIN sports s ON g."sportId" = s.id
    WHERE p.result IN ('WIN', 'LOSS', 'PUSH')
      AND p."isPublished" = true
      AND p."isBootstrap" = false
      AND p."modelVersion" <> 'v5.0.0-seed'
      AND (CAST(${sportPattern} AS TEXT) IS NULL OR s.name ILIKE ${sportPattern})
    GROUP BY s.name, p.result
  `;

  // Fold the (sport, result, count) rows into the per-sport tally.
  const bySport: Record<
    string,
    { sport: string; wins: number; losses: number; pushes: number; total: number }
  > = {};

  for (const row of rows) {
    const sportName = row.sport;
    if (!bySport[sportName]) {
      bySport[sportName] = { sport: sportName, wins: 0, losses: 0, pushes: 0, total: 0 };
    }
    const entry = bySport[sportName]!;
    entry.total += row.count;
    if (row.result === "WIN") entry.wins += row.count;
    else if (row.result === "LOSS") entry.losses += row.count;
    else if (row.result === "PUSH") entry.pushes += row.count;
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

  // Per-slice honesty: withhold a per-sport win rate whenever THAT sport's own
  // decided sample is below the floor — even when the global sample clears it.
  // Otherwise a thin slice (e.g. "NBA 0% on 7") publishes a misleading rate off
  // a handful of picks while the healthy global total masks it. The COUNTS stay
  // visible for every sport (they're factual); only the derived rate is withheld.
  const publishedStats = stats
    .map((s) => ({
      ...s,
      winRate:
        insufficientSample || s.wins + s.losses < minSettledFloor ? null : s.winRate,
    }))
    .sort((a, b) => b.total - a.total);

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
