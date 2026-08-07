/**
 * Free multi-source spine health — AI-first, no Odds key.
 * Probes free score chains + freeCoverage matrix without inventing data.
 * Auth: CRON_SECRET. Schedule: every 2h (vercel.json) so SUCCESS stays under REFRESH_STALE 240m.
 *
 * Also records an honest IngestionRun SUCCESS when the probe completes so
 * /api/health recovers under free mode (no paid THE_ODDS_API_KEY required).
 *
 * I3/I8: writes process-local free-spine-cache + Neon durable snapshot
 * (JarvisMemoryEvent) so cold isolates still score multi-source probes.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { ALL_SPORTS, freeCoverageMatrix, redundancyGaps } from "@/lib/data-sources/source-router";
import { fetchScoresMultiSource, scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import { buildWorldClassReadiness } from "@/lib/platform/world-class-readiness";
import { writeFreeSpineCache } from "@/lib/data-sources/free-spine-cache";
import { persistFreeSpineSnapshot } from "@/lib/data-sources/free-spine-durable";
import { recordFreeIngestionRun } from "@/lib/data-sources/free-ingestion-run";
import { probeNflverseSourceCurrency } from "@sports/data-ingestion";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const started = Date.now();
  // Probe each sport once (network), in parallel — free path, no Odds key.
  // Failures are reported, not fatal. Parallel keeps wall-clock under maxDuration.
  const live = await Promise.all(
    ALL_SPORTS.map(async (sport) => {
      try {
        const r = await fetchScoresMultiSource(sport);
        return {
          sport,
          chain: [...scoreSourceChain(sport)],
          used: r.used,
          games: r.games.length,
          failover: r.failover,
          errors: [...r.errors],
        };
      } catch (e) {
        return {
          sport,
          chain: [...scoreSourceChain(sport)],
          used: null as string | null,
          games: 0,
          failover: true,
          errors: [e instanceof Error ? e.message : String(e)],
        };
      }
    }),
  );


  const matrix = freeCoverageMatrix();
  const gaps = redundancyGaps(2).filter((g) =>
    ["scores", "results", "odds", "player_stats", "weather"].includes(g.need),
  );
  const readiness = buildWorldClassReadiness();

  const freeCovered = matrix.filter((r) => r.freeCovers).length;
  const requireSpend = matrix.filter((r) => r.mustSpend).length;
  const sportsWithGames = live.filter((s) => s.games > 0).length;
  const hardFailures = live.filter((s) => s.used === null && s.errors.length > 0).length;
  const probeFailed = live.length > 0 && sportsWithGames === 0 && hardFailures === live.length;

  const snap = {
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
  };

  writeFreeSpineCache(snap);

  // I3: Neon-backed so cold cockpit isolates do not see empty RAM as Critical.
  const durableWrite = await persistFreeSpineSnapshot(snap);
  if (durableWrite === "error") {
    captureError(new Error("free-spine durable persist failed"), {
      path: "free-spine-health",
      stage: "persistFreeSpineSnapshot",
    });
  }

  // Durable evidence for /api/health — free mode must not leave lastSuccess frozen.
  const ingestionRun = await recordFreeIngestionRun({
    sport: "free-spine",
    gamesUpserted: sportsWithGames,
    oddsInserted: 0,
    failed: probeFailed,
    errorMessage: probeFailed
      ? `free-spine probe: all ${live.length} sports failed to return games`
      : null,
  });

  // Lightweight nflverse currency (catalog HEAD) — evidence for operators +
  // free-spine response. Health route also probes independently; this stamps
  // the same season floor so logs stay aligned. Never invents currency.
  let nflverseCurrency: Awaited<ReturnType<typeof probeNflverseSourceCurrency>> | null = null;
  try {
    nflverseCurrency = await probeNflverseSourceCurrency({ timeoutMs: 4000 });
  } catch (err) {
    captureError(err, { path: "free-spine-health", stage: "nflverse-currency" });
    console.warn(
      `[free-spine-health] nflverse currency probe failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (probeFailed) {
    captureError(new Error("free-spine probe: all sports failed"), {
      path: "free-spine-health",
      hardFailures,
      sportsProbed: live.length,
    });
  }

  if (!ingestionRun) {
    captureError(new Error("free-spine failed to record IngestionRun"), {
      path: "free-spine-health",
      stage: "recordFreeIngestionRun",
      probeFailed,
    });
  }

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
    ingestionRun,
    durableWrite,
    nflverseCurrency,
  });
}
