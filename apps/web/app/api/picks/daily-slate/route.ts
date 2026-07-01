import { NextResponse } from "next/server";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  db,
  isStubMode,
  isDemoPicksEnabled,
  getSamplePicks,
} from "@sports/db";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";

/**
 * Daily slate API — stub-safe and demo-aware.
 *
 * Response shape matches @sports/types `DailySlate` so /picks SlateBar
 * renders correctly. recentRecord stays null when the performance gate
 * is closed — closes the leak documented in the prior session.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const gates = getReadinessGates();
  const demoActive = isStubMode() && isDemoPicksEnabled();

  // Stale-Data Kill Switch (default OFF via FORCE_NO_BET_IF_STALE). The /picks
  // page reads this slate alongside /api/picks; without this guard the SlateBar
  // would still count published rows and stamp a fresh "updated now" even when
  // /api/picks has collapsed to its dark/collecting state. When the flag is ON
  // and the latest successful ingestion is "stale" per the shared Refresh SLA,
  // return the SAME zeroed/demo-suppressed slate shape — but with
  // lastUpdatedAt: null so we never imply a fresh refresh (CLAUDE.md rule #5).
  // Fail OPEN on a DB error — a transient blip must not black out a fresh
  // surface; freshness is enforced separately by /api/health.
  if (gates.forceNoBetIfStale) {
    const stale = await isPublicPicksSurfaceStale().catch(() => false);
    if (stale) {
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

  const totalPicks = await db.pick
    .count({
      where: {
        isPublished: true,
        result: "PENDING",
        isBootstrap: false,
        game: { dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } },
      },
    })
    .catch(() => 0);

  const samples = demoActive ? getSamplePicks() : [];
  let totalGames: number;
  let freePickCount: number;
  if (demoActive) {
    totalGames = new Set(samples.map((p) => p.gameId)).size;
    freePickCount = samples.filter((p) => p.tier === "FREE").length;
  } else {
    // Production: derive the counts from the REAL DB, not the (empty) demo array.
    // Deriving totalGames/free/premium from `samples` in prod published a
    // self-contradictory "Games Today: 0" next to a non-zero Total Picks and
    // mislabelled every FREE-tier pick as premium (premium = total − 0).
    const baseWhere = {
      isPublished: true,
      result: "PENDING" as const,
      isBootstrap: false,
      game: { dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } },
    };
    freePickCount = await db.pick
      .count({ where: { ...baseWhere, tier: "FREE" } })
      .catch(() => 0);
    const distinctGames = await db.pick
      .findMany({ where: baseWhere, select: { gameId: true }, distinct: ["gameId"] })
      .catch(() => [] as { gameId: string }[]);
    totalGames = distinctGames.length;
  }
  const premiumPickCount = Math.max(0, totalPicks - freePickCount);

  // Sport breakdown
  const sportCount = new Map<string, number>();
  for (const p of samples) {
    sportCount.set(p.game.sport.name, (sportCount.get(p.game.sport.name) ?? 0) + 1);
  }
  const sportBreakdown = Array.from(sportCount.entries()).map(
    ([sport, pickCount]) => ({ sport, pickCount })
  );
  let recentRecord: { wins: number; losses: number; pushes: number; period: string } | null = null;
  if (gates.canExposePerformanceStats) {
    recentRecord = { wins: 0, losses: 0, pushes: 0, period: "Last 7 days" };
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
      // recentRecord stays null when stats are gated.
      recentRecord,
      isSampleData: demoActive,
    },
    meta: { isSampleData: demoActive },
  });
}
