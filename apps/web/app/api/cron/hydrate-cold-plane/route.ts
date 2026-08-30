/**
 * Vercel cron — cold p-plane write-through.
 *
 * PlayerGameStat (Prisma SoR) → NflverseMemoryStore.put
 * Does NOT require THE_ODDS_API_KEY. Complements /api/cron/ingest-player-stats
 * (which fills Prisma) by hydrating the in-process memory provider used by
 * GET /api/gse/v1/values for nfl.* metrics.
 *
 * Law: oddsApiRequired=false · refuse-default · LIVE_BOARD independent
 *
 * Schedule: daily 09:30 UTC (30m after ingest-player-stats at 09:00).
 * Auth: Bearer <CRON_SECRET>
 *
 * Note: process-local memory is single-instance. Multi-instance needs Redis
 * (ops hydrate-force step redis_online). This cron is still valuable for:
 *   - single-instance / preview deploys
 *   - verifying the pure engine path in production logs
 *   - future swap of store backend without changing the route contract
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  NflverseMemoryStore,
  hydratePlayerGameStatsToMemory,
  type PrismaPlayerGameStat,
} from "@sports/stats-api";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** Module-scoped store for this serverless isolate (honest single-process). */
const memoryStore = new NflverseMemoryStore();

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  const limitParam = url.searchParams.get("limit");
  const season =
    seasonParam !== null && Number.isInteger(Number(seasonParam))
      ? Number(seasonParam)
      : undefined;
  const limit =
    limitParam !== null && Number.isInteger(Number(limitParam))
      ? Math.min(10_000, Math.max(1, Number(limitParam)))
      : 2000;

  try {
    const rows = await db.playerGameStat.findMany({
      where: {
        ...(season != null ? { season } : {}),
      },
      take: limit,
      orderBy: [{ season: "desc" }, { week: "desc" }],
    });

    const mapped: PrismaPlayerGameStat[] = rows.map((r) => ({
      playerId: r.playerId,
      season: r.season,
      week: r.week,
      seasonType: r.seasonType,
      attempts: r.attempts,
      carries: r.carries,
      receptions: r.receptions,
      targets: r.targets,
      targetShare: r.targetShare,
      receivingYards: r.receivingYards,
      rushingYards: r.rushingYards,
      fantasyPointsPpr: r.fantasyPointsPpr,
      passingEpa: r.passingEpa,
      rushingEpa: r.rushingEpa,
      receivingEpa: r.receivingEpa,
      asOf: r.fetchedAt.toISOString(),
      sourceId: r.sourceId,
    }));

    const result = hydratePlayerGameStatsToMemory(memoryStore, mapped);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.error,
          oddsApiRequired: false,
          storeSize: memoryStore.size(),
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        written: result.written,
        skipped: result.skipped,
        rowsRead: rows.length,
        season: season ?? "latest_available",
        limit,
        oddsApiRequired: false,
        note:
          "Cold p-plane write-through. Process-local memory; multi-instance requires Redis online store.",
      },
      { status: 200, headers: { "X-GSE-API": "stats.v1.hydrate" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: message,
        oddsApiRequired: false,
        code: "hydrate_failed",
      },
      { status: 500 },
    );
  }
}
