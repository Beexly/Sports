/**
 * Cold p-plane hydrate: Prisma PlayerGameStat → NflverseMemoryStore.
 * Does NOT require THE_ODDS_API_KEY. Run as:
 *   npx tsx workers/data-refresh/src/hydrate-cold-plane.ts
 * Or import hydrateColdPlaneFromDb() from workers / cron.
 *
 * Production: process-local memory is single-instance; multi-instance needs Redis.
 */
import { db } from "@sports/db";
import {
  NflverseMemoryStore,
  hydratePlayerGameStatsToMemory,
  type PrismaPlayerGameStat,
} from "@sports/stats-api";

export async function hydrateColdPlaneFromDb(opts?: {
  season?: number;
  week?: number;
  limit?: number;
  store?: NflverseMemoryStore;
}): Promise<{
  ok: boolean;
  written: number;
  skipped: number;
  code?: string;
  error?: string;
}> {
  const store = opts?.store ?? new NflverseMemoryStore();
  const limit = opts?.limit ?? 2000;

  const rows = await db.playerGameStat.findMany({
    where: {
      ...(opts?.season != null ? { season: opts.season } : {}),
      ...(opts?.week != null ? { week: opts.week } : {}),
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
    // PIT asOf: use week end proxy via fetchedAt (best available on row)
    asOf: r.fetchedAt.toISOString(),
    sourceId: r.sourceId,
  }));

  const result = hydratePlayerGameStatsToMemory(store, mapped);
  if (!result.ok) {
    return {
      ok: false,
      written: 0,
      skipped: 0,
      code: result.code,
      error: result.error,
    };
  }
  return { ok: true, written: result.written, skipped: result.skipped };
}

async function main() {
  console.log("[hydrate-cold-plane] start", new Date().toISOString());
  try {
    const r = await hydrateColdPlaneFromDb({
      season: Number(process.env.HYDRATE_SEASON ?? 2025),
      limit: Number(process.env.HYDRATE_LIMIT ?? 2000),
    });
    console.log("[hydrate-cold-plane] result", r);
    if (!r.ok) process.exitCode = 1;
  } catch (e) {
    console.error("[hydrate-cold-plane] failed", e);
    process.exitCode = 1;
  }
}

// only when executed directly
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("hydrate-cold-plane");
if (isMain) {
  void main();
}
