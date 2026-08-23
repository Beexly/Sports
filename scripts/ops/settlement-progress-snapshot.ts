#!/usr/bin/env npx tsx
/**
 * Read-only per-sport settlement progress snapshot for the four live
 * pipelines (odds-ingest → settle-picks → grade → calibrate → PROVEN).
 *
 * Modeled on scripts/export-settled-picks-for-calibration.mjs's
 * DATABASE_URL-guard + read-only pattern. Ships as .ts run via tsx (not
 * .mjs) because it reuses real TS loaders (loadCanonicalSampleBySport,
 * loadPublicPerformancePolicy, getInSeasonSports) rather than re-deriving
 * their filters — the repo's own convention for scripts with cross-package
 * TS imports (see scripts/edge-lab/gate-slate-phase-c-counts.ts,
 * scripts/check-nflverse-currency.ts). apps/web's `@/*` path alias only
 * resolves under apps/web's own tsconfig, so this must run with
 * TSX_TSCONFIG_PATH=apps/web/tsconfig.json — wired into the npm script
 * below so an operator never has to remember the flag.
 *
 * This script CANNOT settle, CANNOT generate, and CANNOT touch Game/Pick
 * rows — it only counts. No create/update/delete/upsert/$executeRaw call
 * exists anywhere in this file.
 *
 * Usage:
 *   npm run ops:settlement-snapshot
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx tsx scripts/ops/settlement-progress-snapshot.ts
 */
import { PrismaClient } from "@prisma/client";
import { getInSeasonSports } from "../../packages/data-ingestion/src/config";
import { loadCanonicalSampleBySport } from "../../apps/web/lib/ops/canonical-sample-posture";
import { loadPublicPerformancePolicy } from "../../apps/web/lib/performance/public-performance-policy";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("settlement-progress-snapshot: DATABASE_URL missing or stub — abort (no secrets invented)");
  process.exit(2);
}

// The FOUNDING → PROVEN pricing-ladder milestone (pricing-phases.ts / PL3's
// own wiring in free-settlement-runner.ts) — kept as one named constant so
// this script and the live autonomy cycle can never silently drift apart.
const MIN_SETTLED_FOR_LEARNING = 100;

function pad(value: unknown, width: number): string {
  return String(value).padEnd(width);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const sports = getInSeasonSports();
    const [bySport, policy] = await Promise.all([
      loadCanonicalSampleBySport(prisma, sports),
      loadPublicPerformancePolicy(prisma, {
        canExposePerformanceStats: true,
        minSettledPicksForLearning: MIN_SETTLED_FOR_LEARNING,
      }),
    ]);

    const sportCol = Math.max(6, "TOTAL".length, ...bySport.map((r) => r.displayName.length));
    const settledCol = Math.max(9, "Settled".length);

    console.log(
      pad("Sport", sportCol),
      pad("Settled", settledCol),
      pad("W", 5),
      pad("L", 5),
      pad("P", 5),
      "Status",
    );
    for (const r of bySport) {
      console.log(
        pad(r.displayName, sportCol),
        pad(r.canonicalSettled, settledCol),
        pad(r.canonicalWins, 5),
        pad(r.canonicalLosses, 5),
        pad(r.canonicalPushes, 5),
        r.error ? `ERROR: ${r.error}` : "ok",
      );
    }
    const remainingToFloor = Math.max(0, MIN_SETTLED_FOR_LEARNING - policy.canonicalSettledCount);
    console.log(
      pad("TOTAL", sportCol),
      pad(policy.canonicalSettledCount, settledCol),
      pad(policy.canonicalWins, 5),
      pad(policy.canonicalLosses, 5),
      pad(policy.canonicalPushes, 5),
      `${policy.canonicalSettledCount}/${MIN_SETTLED_FOR_LEARNING} toward PROVEN floor (${remainingToFloor} remaining)`,
    );

    const failedSports = bySport.filter((r) => r.error);
    if (failedSports.length > 0) {
      // TOTAL is unaffected: it comes from loadPublicPerformancePolicy's own
      // unscoped cumulative query, an independent path from the per-sport
      // breakdown above — a failed sport row never understates TOTAL.
      console.error(
        `settlement-progress-snapshot: ${failedSports.length} sport(s) failed to load a per-sport breakdown (see ERROR rows above); TOTAL is unaffected (separate cumulative query)`,
      );
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error("settlement-progress-snapshot: fail", e instanceof Error ? e.message : e);
  process.exit(1);
});
