import { NextResponse } from "next/server";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  db,
  isStubMode,
  isDemoPicksEnabled,
  getSamplePicks,
} from "@sports/db";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";
import {
  getFreshPublicOddsSportKeys,
  isPublicPicksSurfaceStale,
} from "@/lib/data-reliability/public-freshness-gate";
import { canonicalSettledPickWhere } from "@/lib/performance/canonical-population";

/**
 * Daily slate API — stub-safe and demo-aware.
 *
 * Response shape matches @sports/types `DailySlate` so /picks SlateBar
 * renders correctly. recentRecord stays null when the performance gate
 * is closed — closes the leak documented in the prior session.
 */
export const dynamic = "force-dynamic";

type RecentRecord = {
  wins: number;
  losses: number;
  pushes: number;
  period: string;
};

async function loadRecentRecord(): Promise<RecentRecord | null> {
  try {
    const grouped = await db.pick.groupBy({
      by: ["result"],
      where: canonicalSettledPickWhere({
        settledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      _count: { _all: true },
    });
    const count = (result: "WIN" | "LOSS" | "PUSH") =>
      grouped.find((row) => row.result === result)?._count._all ?? 0;
    const wins = count("WIN");
    const losses = count("LOSS");
    const pushes = count("PUSH");
    return wins + losses + pushes > 0
      ? { wins, losses, pushes, period: "Last 7 days" }
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const gates = getReadinessGates();
  const demoActive = isStubMode() && isDemoPicksEnabled();

  // Stale-Data Kill Switch (default ON via FORCE_NO_BET_IF_STALE). The /picks
  // page reads this slate alongside /api/picks; without this guard the SlateBar
  // would still count published rows and stamp a fresh "updated now" even when
  // /api/picks has collapsed to its dark/collecting state. When the flag is ON
  // and the latest successful ingestion is "stale" per the shared Refresh SLA,
  // return the SAME zeroed/demo-suppressed slate shape — but with
  // lastUpdatedAt: null so we never imply a fresh refresh (CLAUDE.md rule #5).
  // Fail CLOSED on a DB error because freshness that cannot be proven is stale.
  let freshSportKeys: string[] | null = null;
  if (gates.forceNoBetIfStale && !demoActive) {
    let suppress = await isPublicPicksSurfaceStale().catch(() => true);
    if (!suppress) {
      const freshSports = await getFreshPublicOddsSportKeys().catch(() => null);
      suppress = !freshSports || freshSports.size === 0;
      freshSportKeys = freshSports ? [...freshSports] : null;
    }
    if (suppress) {
      return NextResponse.json({
        success: true,
        data: {
          date: new Date().toISOString().slice(0, 10),
          totalGames: 0,
          totalPicks: 0,
          premiumPickCount: 0,
          freePickCount: 0,
          topEdgePick: null,
          lastUpdatedAt: null,
          sportBreakdown: [],
          recentRecord: null,
          isSampleData: demoActive,
        },
        meta: { isSampleData: demoActive },
      });
    }
  }

  // Match /api/picks and the board: in production, drop dev seed rows
  // (modelVersion="v5.0.0-seed") so this slate's counts agree with the picks the
  // /api/picks route actually returns. No-op in dev/test.
  const excludeSeedInProd =
    process.env["NODE_ENV"] === "production" ? { NOT: { modelVersion: "v5.0.0-seed" } } : {};

  // Shared published-pick filter for every count on this slate (matches /api/picks).
  const baseWhere = {
    isPublished: true,
    result: "PENDING" as const,
    isBootstrap: false,
    game: {
      dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE },
      ...(freshSportKeys ? { sport: { key: { in: freshSportKeys } } } : {}),
    },
    ...excludeSeedInProd,
  };

  let totalPicks = await db.pick.count({ where: baseWhere }).catch(() => 0);

  const samples = demoActive ? getSamplePicks() : [];
  let totalGames: number;
  let freePickCount: number;
  // Sport breakdown accumulator (demo counts samples; prod counts real picks).
  const sportCount = new Map<string, number>();
  if (demoActive) {
    totalPicks = samples.length;
    totalGames = new Set(samples.map((p) => p.gameId)).size;
    freePickCount = samples.filter((p) => p.tier === "FREE").length;
    for (const p of samples) {
      sportCount.set(p.game.sport.name, (sportCount.get(p.game.sport.name) ?? 0) + 1);
    }
  } else {
    // Production: derive the counts from the REAL DB, not the (empty) demo array.
    // Deriving totalGames/free/premium from `samples` in prod published a
    // self-contradictory "Games Today: 0" next to a non-zero Total Picks and
    // mislabelled every FREE-tier pick as premium (premium = total − 0).
    //
    // ONE scan over today's published picks feeds BOTH the distinct-game count
    // AND the per-sport breakdown (was two separate findMany calls on this public
    // path). Prisma groupBy can't traverse the pick→game→sport relation, so a
    // narrowed select + in-process tally is the correct shape; a day's slate is
    // bounded. On a DB error, fall back to empty — never fabricate.
    freePickCount = await db.pick
      .count({ where: { ...baseWhere, tier: "FREE" } })
      .catch(() => 0);
    const rows = await db.pick
      .findMany({
        where: baseWhere,
        select: { gameId: true, game: { select: { sport: { select: { name: true } } } } },
      })
      .catch(() => [] as { gameId: string; game: { sport: { name: string } } }[]);
    const gameIds = new Set<string>();
    for (const row of rows) {
      gameIds.add(row.gameId);
      const name = row.game.sport.name;
      sportCount.set(name, (sportCount.get(name) ?? 0) + 1);
    }
    totalGames = gameIds.size;
  }
  const premiumPickCount = Math.max(0, totalPicks - freePickCount);
  const sportBreakdown = Array.from(sportCount.entries())
    .map(([sport, pickCount]) => ({ sport, pickCount }))
    .sort((a, b) => b.pickCount - a.pickCount || a.sport.localeCompare(b.sport));
  let recentRecord: RecentRecord | null = null;
  if (gates.canExposePerformanceStats) {
    recentRecord = await loadRecentRecord();
  }

  return NextResponse.json({
    success: true,
    data: {
      date: new Date().toISOString().slice(0, 10),
      totalGames,
      totalPicks,
      premiumPickCount,
      freePickCount,
      topEdgePick: null,
      lastUpdatedAt: new Date().toISOString(),
      sportBreakdown,
      recentRecord,
      isSampleData: demoActive,
    },
    meta: { isSampleData: demoActive },
  });
}
