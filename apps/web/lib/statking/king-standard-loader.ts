/**
 * King Standard — thin server loader.
 *
 * Gathers the real inputs each King Standard dimension needs (a StatKing
 * coverage snapshot read, the prediction-engine's real metrics catalog, and
 * two Prisma queries) and hands them to the pure compute functions in
 * `king-standard.ts`. This file is the ONLY place in the King Standard
 * feature that touches the filesystem or the database — everything else is
 * a pure function of already-fetched values.
 *
 * Stub-safety follows the same pattern as the other stub-safe public pages
 * in this app (lib/calibration/report.ts, app/performance/page.tsx,
 * lib/data-reliability/public-freshness-gate.ts):
 *   - `isStubMode()` from @sports/db tells us whether a real DATABASE_URL is
 *     connected at all (it is false during most local/build-time renders).
 *   - Every Prisma call is additionally wrapped in `.catch()` so a transient
 *     DB error degrades the same way as "unreachable" instead of crashing
 *     the page (fail toward notMeasured, never fail toward a fake number,
 *     never fail toward a 500).
 */

import { db, isStubMode } from "@sports/db";
import { getReadinessGates, GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES } from "@sports/prediction-engine";
import { loadCoverage } from "@/lib/statking/product";
import {
  computeLiveFeeds,
  computeMetricDepth,
  computeOverall,
  computeProofArchive,
  computeSourceCoverage,
  type KingStandardDimensions,
  type KingStandardResult,
} from "@/lib/statking/king-standard";

/**
 * Source Coverage inputs. `loadCoverage()` already degrades to
 * `{ coverage_by_data_type: {} }` when the snapshot file is missing (see
 * product.ts's `readJson` fallback), which `computeSourceCoverage` treats as
 * notMeasured — so this half never throws and never needs its own try/catch.
 *
 * "Required" = every data type the coverage snapshot tracks; "implemented" =
 * the subset currently reachable without a blocking license/rights gate
 * (`active_proxy`, as opposed to `license_required`). Fed through the real
 * stat-coverage auditor (`auditStatCoverage`), not recomputed inline.
 */
function loadSourceCoverageInputs(): { requiredStats: string[]; implementedStats: string[] } {
  const coverage = loadCoverage();
  const requiredStats = Object.keys(coverage.coverage_by_data_type);
  const implementedStats = requiredStats.filter((key) => coverage.coverage_by_data_type[key] === "active_proxy");
  return { requiredStats, implementedStats };
}

export async function loadKingStandard(now: Date = new Date()): Promise<KingStandardResult> {
  const { requiredStats, implementedStats } = loadSourceCoverageInputs();
  const sourceCoverage = computeSourceCoverage(requiredStats, implementedStats);

  // Compile-time catalog import — no I/O, always measured.
  const metricDepth = computeMetricDepth(GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES.length);

  const dimensions: KingStandardDimensions = {
    sourceCoverage,
    liveFeeds: computeLiveFeeds({ reachable: false }),
    proofArchive: computeProofArchive({ reachable: false }),
    metricDepth,
  };

  // Proof Archive + Live Feeds both require a live DB. In stub mode (no real
  // DATABASE_URL — the default for local/build-time renders) leave both at
  // the notMeasured defaults set above rather than querying a stub client
  // that would return a misleading real-looking 0.
  if (!isStubMode()) {
    const gates = getReadinessGates();

    const settledCount = await db.pick
      .count({
        where: { isPublished: true, isBootstrap: false, result: { in: ["WIN", "LOSS", "PUSH"] } },
      })
      .catch(() => null);

    dimensions.proofArchive =
      settledCount === null
        ? computeProofArchive({ reachable: false })
        : computeProofArchive({
            reachable: true,
            settledCount,
            settledThreshold: gates.minSettledPicksForLearning,
            calibrationGateOpen: gates.canExposePerformanceStats,
          });

    const lastIngestionRun = await db.ingestionRun
      .findFirst({
        where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      })
      .catch(() => undefined);

    dimensions.liveFeeds =
      lastIngestionRun === undefined
        ? computeLiveFeeds({ reachable: false })
        : computeLiveFeeds({ reachable: true, lastSuccessAt: lastIngestionRun?.completedAt ?? null }, now);
  }

  return { overall: computeOverall(dimensions), dimensions };
}
