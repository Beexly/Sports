import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  freeCoverageMatrix,
  planIngestion,
  redundancyGaps,
  PLATFORM_SOURCES,
  ALL_SPORTS,
  type StatNeed,
} from "@/lib/data-sources/source-router";
import { scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import { buildWorldClassReadiness } from "@/lib/platform/world-class-readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Free-first + multi-source coverage for cockpit/sources.
 * Admin-only. Pure policy + readiness rollup; score chains listed without live fetch.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  const matrix = freeCoverageMatrix();
  const gaps = redundancyGaps(2);
  const criticalNeeds = new Set([
    "scores", "results", "odds", "standings", "schedules", "weather", "player_stats",
  ]);
  const criticalGaps = gaps.filter((g) => criticalNeeds.has(g.need));
  const spendNeeds = Array.from(
    new Set(matrix.filter((r) => r.mustSpend).map((r) => r.need)),
  ) as StatNeed[];
  const unlock = spendNeeds.map((need) => {
    const byId = new Map<string, string>();
    for (const sport of ALL_SPORTS) {
      for (const s of planIngestion(need, sport).unlockToGoFree) byId.set(s.id, s.name);
    }
    return { need, clearToGoFree: Array.from(byId, ([id, name]) => ({ id, name })) };
  });

  const scoreChains = ALL_SPORTS.map((sport) => ({
    sport,
    chain: [...scoreSourceChain(sport)],
    dual: scoreSourceChain(sport).length >= 2,
  }));

  const readiness = buildWorldClassReadiness();

  return NextResponse.json({
    ok: true,
    success: true,
    oddsApiRequired: false as const,
    data: {
      summary: {
        total: matrix.length,
        freeCovered: matrix.filter((r) => r.freeCovers).length,
        requireSpend: matrix.filter((r) => r.mustSpend).length,
        clearedSources: PLATFORM_SOURCES.filter((s) => s.cleared).length,
        totalSources: PLATFORM_SOURCES.length,
        criticalGaps: criticalGaps.length,
        dualScoreSports: scoreChains.filter((s) => s.dual).length,
      },
      matrix,
      gaps: criticalGaps,
      unlock,
      scoreChains,
      readinessLanes: readiness.lanes,
      agentPrime: readiness.agentPrime,
    },
  });
}
