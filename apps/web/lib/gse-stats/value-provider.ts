/**
 * Production-path composite provider for GSE Stats API.
 * - weather: Open-Meteo live (server)
 * - nfl: memory store hydrated by workers (empty until ingest)
 * - demo: deterministic fallback (explicit non-claim)
 */

import {
  buildDefaultRouting,
  createCompositeProvider,
  createOpenMeteoProvider,
  liveOpenMeteoClient,
  createNflverseMemoryProvider,
  NflverseMemoryStore,
  hydratePlayerGameStatsToMemory,
  type PrismaPlayerGameStat,
  type ValueProvider,
} from "@sports/stats-api";

const SEED: Record<string, number> = {
  "nfl.box.pass_yds|demo_player": 287,
  "nfl.adv.epa|demo_player": 0.12,
  "gse.edge_index|demo_game": 0.041,
  "gse.clv_vs_pinnacle|demo_game": 0.018,
  "mkt.consensus.spread.novig|demo_game": 0.52,
};

const demo: ValueProvider = (metric, entityId) => {
  const loose = `${metric.id}|${entityId}`;
  if (loose in SEED) return SEED[loose]!;
  if (metric.status === "ACTIVE" && metric.publicApi && metric.family !== "calibration") {
    let h = 0;
    const s = `${metric.id}:${entityId}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const u = (Math.abs(h) % 10000) / 10000;
    if (metric.unit === "count" || metric.unit === "yds") return Math.round(u * 100);
    if (metric.unit === "rate" || metric.unit === "prob") return Math.round(u * 1000) / 1000;
    return u;
  }
  return null;
};

/** Process-local nflverse memory — workers will put rows here / Redis later. */
export const nflverseMemory = new NflverseMemoryStore();

const weather = createOpenMeteoProvider(liveOpenMeteoClient());
const nfl = createNflverseMemoryProvider(nflverseMemory);

export const demoValueProvider: ValueProvider = createCompositeProvider(
  buildDefaultRouting({
    weather,
    nflverse: nfl,
    demo,
  }),
);

/** Inject Prisma PlayerGameStat rows into process-local cold memory. */
export function hydrateLocalNflverseMemory(
  rows: readonly PrismaPlayerGameStat[],
) {
  return hydratePlayerGameStatsToMemory(nflverseMemory, rows);
}
