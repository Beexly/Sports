/**
 * Built-in hydration runners (testable, injectable I/O).
 */

import type { HydrationJob, HydrationRunner } from "./orchestrator.js";
import type { NflverseMemoryStore, NflverseRow } from "../providers/nflverse-memory.js";
import type { OpenMeteoClient } from "../providers/open-meteo.js";
import { parseLatLon } from "../providers/open-meteo.js";

/** Write-through runner: accepts precomputed rows (from Prisma/cron) into memory. */
export function createWriteThroughNflverseRunner(
  store: NflverseMemoryStore,
  loadRows: (job: HydrationJob) => Promise<NflverseRow[]>,
): HydrationRunner {
  return {
    strategy: "write_through",
    async run(job) {
      if (!job.metricPrefix.startsWith("nfl.") && job.metricPrefix !== "nfl.") {
        // allow nfl.box. etc
      }
      const rows = await loadRows(job);
      for (const r of rows) store.put(r);
      return { rowsWritten: rows.length, ok: true };
    },
  };
}

/** Batch snapshot runner: same interface, semantic label for bulk dumps. */
export function createBatchSnapshotRunner(
  store: NflverseMemoryStore,
  loadRows: (job: HydrationJob) => Promise<NflverseRow[]>,
): HydrationRunner {
  return {
    strategy: "batch_snapshot",
    async run(job) {
      const rows = await loadRows(job);
      for (const r of rows) store.put(r);
      return { rowsWritten: rows.length, ok: true };
    },
  };
}

/** Read-repair weather: fetch current for each lat,lon entity. */
export function createWeatherReadRepairRunner(client: OpenMeteoClient): HydrationRunner {
  return {
    strategy: "read_repair",
    async run(job) {
      let n = 0;
      for (const entityId of job.entityIds) {
        const loc = parseLatLon(entityId);
        if (!loc) continue;
        await client.fetchCurrent(loc.lat, loc.lon, job.asOf);
        n += 1;
      }
      return { rowsWritten: n, ok: true };
    },
  };
}

/** No-op runner that records plan coverage for strategies not yet wired. */
export function createStubRunner(strategy: HydrationRunner["strategy"]): HydrationRunner {
  return {
    strategy,
    async run() {
      return {
        rowsWritten: 0,
        ok: false,
        error: `Strategy ${strategy} runner not wired (CODE_READY stub)`,
      };
    },
  };
}
