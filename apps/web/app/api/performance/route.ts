import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { enforcePublicApiRateLimit } from "@/lib/rate-limit";
import { parsePublicQuery, performanceQuerySchema } from "@/lib/public-query";
import {
  getReadinessGates,
  bootstrapGateResponse,
  computeClvPositiveRate,
} from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Inbound throttle first — cheapest rejection, applies even when gated.
  const limited = await enforcePublicApiRateLimit(req, "performance");
  if (limited) return limited;

  // Malformed input is the caller's fault: clean 400, never a 503.
  const query = parsePublicQuery(req, performanceQuerySchema);
  if (!query.ok) return query.response;

  const gates = getReadinessGates();
  if (!gates.canExposePerformanceStats) {
    return NextResponse.json(bootstrapGateResponse("Performance stats"), { status: 503 });
  }

  const period = query.data.period ?? "all-time";
  const sport = query.data.sport ?? null;

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

  // Rolling CLV-positive rate (ADDITIVE — does not affect win-rate above).
  // Honest proof the engine beats the close: share of settled canonical picks
  // whose bet-time line/price beat the closing reference. Only picks with a
  // computed CLV verdict count (clvComputedAt set); a missing/stale close is
  // excluded, so the rate is never inflated by absent data. Null when sample
  // is 0. This is shadow proof — it never feeds the published pick number.
  const clvPicks = await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS", "PUSH"] },
      isPublished: true,
      isBootstrap: false,
      NOT: { modelVersion: "v5.0.0-seed" },
      clvComputedAt: { not: null },
      ...(sport
        ? { game: { sport: { name: { contains: sport, mode: "insensitive" as const } } } }
        : {}),
    },
    select: { clvPositive: true, clvComputedAt: true },
  });

  const clv = computeClvPositiveRate(clvPicks);

  return NextResponse.json({
    success: true,
    data: {
      overall: { ...overall, winRate: overallWinRate },
      bySport: stats.sort((a, b) => b.total - a.total),
      // Closing-Line Value scoreboard (additive; null until closes accrue).
      clv: {
        clvPositiveRate: clv.clvPositiveRate,
        sampleSize: clv.sampleSize,
        positiveCount: clv.positiveCount,
      },
      period,
      disclaimer:
        "Past performance does not guarantee future results. For informational purposes only.",
    },
  });
}
