/**
 * Free multi-source spine health — AI-first, no Odds key.
 * Probes free score chains + freeCoverage matrix without inventing data.
 * Auth: CRON_SECRET. Schedule: daily with player-stats window.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { ALL_SPORTS, freeCoverageMatrix, redundancyGaps } from "@/lib/data-sources/source-router";
import { fetchScoresMultiSource, scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import { buildWorldClassReadiness } from "@/lib/platform/world-class-readiness";
import { writeFreeSpineCache } from "@/lib/data-sources/free-spine-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const started = Date.now();
  const live: Array<{
    sport: string;
    chain: string[];
    used: string | null;
    games: number;
    failover: boolean;
    errors: string[];
  }> = [];

  // Probe each sport once (network). Failures are reported, not fatal.
  for (const sport of ALL_SPORTS) {
    try {
      const r = await fetchScoresMultiSource(sport);
      live.push({
        sport,
        chain: [...scoreSourceChain(sport)],
        used: r.used,
        games: r.games.length,
        failover: r.failover,
        errors: [...r.errors],
      });
    } catch (e) {
      live.push({
        sport,
        chain: [...scoreSourceChain(sport)],
        used: null,
        games: 0,
        failover: true,
        errors: [e instanceof Error ? e.message : String(e)],
      });
    }
  }

  const matrix = freeCoverageMatrix();
  const gaps = redundancyGaps(2).filter((g) =>
    ["scores", "results", "odds", "player_stats", "weather"].includes(g.need),
  );
  const readiness = buildWorldClassReadiness();

  const freeCovered = matrix.filter((r) => r.freeCovers).length;
  const requireSpend = matrix.filter((r) => r.mustSpend).length;
  const sportsWithGames = live.filter((s) => s.games > 0).length;

  writeFreeSpineCache({
    probedAt: new Date().toISOString(),
    sportsProbed: live.length,
    sportsWithGames,
    criticalGaps: gaps.length,
    requireSpend,
    freeCovered,
    live: live.map((s) => ({
      sport: s.sport,
      used: s.used,
      games: s.games,
      failover: s.failover,
    })),
  });

  return NextResponse.json({
    ok: true,
    path: "free-spine-health",
    oddsApiRequired: false as const,
    elapsedMs: Date.now() - started,
    live,
    summary: {
      freeCovered,
      requireSpend,
      criticalGaps: gaps.length,
      sportsProbed: live.length,
      sportsWithGames,
    },
    gaps: gaps.slice(0, 20),
    readinessLanes: readiness.lanes.map((l) => ({
      lane: l.lane,
      status: l.status,
      summary: l.summary,
    })),
    agentPrime: readiness.agentPrime,
  });
}
