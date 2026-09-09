/**
 * Production-path composite provider for GSE Stats API.
 * - weather: Open-Meteo live (server)
 * - nfl: memory store hydrated by workers (empty until ingest)
 *
 * There is deliberately NO fallback provider. A metric with no wired loader
 * routes to nothing, `createCompositeProvider` returns null, and
 * `handleGetMetricValue` refuses with 404 `no_value`. An earlier revision
 * carried a `demo` provider that returned a hash of "<metricId>:<entityId>"
 * for any ACTIVE public metric — a made-up number wrapped in a provenance
 * block naming real sources, served to paying subscribers. CLAUDE.md rule 1
 * (no fake data) and AGENTS.md law 8 (never fabricate product data) forbid
 * it; refusing is the honest answer and it was already written.
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

/** Process-local nflverse memory — workers will put rows here / Redis later. */
export const nflverseMemory = new NflverseMemoryStore();

const weather = createOpenMeteoProvider(liveOpenMeteoClient());
const nfl = createNflverseMemoryProvider(nflverseMemory);

export const wiredValueProvider: ValueProvider = createCompositeProvider(
  buildDefaultRouting({
    weather,
    nflverse: nfl,
  }),
);

/** Inject Prisma PlayerGameStat rows into process-local cold memory. */
export function hydrateLocalNflverseMemory(
  rows: readonly PrismaPlayerGameStat[],
) {
  return hydratePlayerGameStatsToMemory(nflverseMemory, rows);
}
