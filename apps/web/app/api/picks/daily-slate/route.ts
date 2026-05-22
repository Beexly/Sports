import { NextResponse } from "next/server";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  db,
  isStubMode,
  isDemoPicksEnabled,
  getSamplePicks,
} from "@sports/db";

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

  const totalPicks = await db.pick
    .count({ where: { isPublished: true, result: "PENDING" } })
    .catch(() => 0);

  const samples = demoActive ? getSamplePicks() : [];
  const totalGames = new Set(samples.map((p) => p.gameId)).size;
  const freePickCount = samples.filter((p) => p.tier === "FREE").length;
  const premiumPickCount = totalPicks - freePickCount;

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
