#!/usr/bin/env node
/**
 * exercise-jarvis.mjs
 *
 * Drive the Jarvis pipeline locally with a synthetic input. Useful for
 * smoke-testing the synthesizer + audit-log + diff helpers without
 * spinning up the dev server or a database.
 *
 * Requires the compiled TypeScript sources to be importable — the
 * easiest way is to run via `npx tsx scripts/exercise-jarvis.mjs` or
 * inside a project that has already built `apps/web`. If neither, the
 * script prints a hint and exits 0.
 *
 * Output:
 *   - the full JarvisAssessment as JSON
 *   - the serialized audit-log line
 *   - the diff against a "previous" baseline that has different
 *     ingestion + safety state, so you can see the alerts firing
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const tsxBin = resolve(repoRoot, "node_modules/.bin/tsx");
const jarvisPath = resolve(repoRoot, "apps/web/lib/cockpit/jarvis.ts");

if (!existsSync(jarvisPath)) {
  console.error(`Missing ${jarvisPath} — are you running from the repo root?`);
  process.exit(1);
}

// Lazy require so the script doesn't crash if the project hasn't been
// installed yet — we just print a friendly hint.
try {
  // Use dynamic import to support running via tsx; if a plain `node`
  // invocation reaches a TS file, it'll throw and we'll redirect the
  // user to tsx.
  const { synthesizeJarvis } = await import("../apps/web/lib/cockpit/jarvis.ts");
  const { serializeJarvisAudit } = await import("../apps/web/lib/cockpit/jarvis-audit-log.ts");
  const { diffJarvis, summarizeJarvisDiff } = await import("../apps/web/lib/cockpit/jarvis-diff.ts");
  const { alertsFromDiff, pagingAlerts } = await import("../apps/web/lib/cockpit/jarvis-alerts.ts");
  const { evaluatePublicPerformancePolicy } = await import(
    "../apps/web/lib/performance/public-performance-policy.ts"
  );

  const NOW = new Date("2026-05-19T08:00:00Z");
  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: true,
    minSettledPicksForLearning: 25,
    canonicalSettledCount: 100,
    bootstrapCount: 0,
    pendingCount: 0,
    canonicalWins: 55,
    canonicalLosses: 40,
    canonicalPushes: 5,
  });

  const baseInput = {
    now: NOW,
    gates: {
      canPersistCanonicalHistory: true,
      canUseDerivedHistory: true,
      canExposePublicPicks: true,
      canPromoteFeaturedPicks: true,
      canExposePerformanceStats: true,
      canPublishContent: true,
      canLearnFromOutcomes: true,
      canApplyCalibrationAdjustments: false,
      isBootstrapMode: false,
      minSettledPicksForLearning: 25,
    },
    performancePolicy: policy,
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastSuccessAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      settledIn24h: 12,
      pendingPickCount: 0,
    },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 0,
      canonicalPendingCount: 0,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 0,
      publishedCount: 100,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 0,
    },
    signal: {
      snapshotCoveragePct: 0.95,
      signalCoveragePct: 0.92,
      averageDataQualityScore: 0.9,
      modelVersionsActive: ["v5"],
    },
    layers: {
      trustClaims: "implemented",
      performanceGating: "implemented",
      promotions: "implemented",
      dailyBrief: "implemented",
      calibration: "implemented",
      cockpit: "implemented",
      contentEngine: "implemented",
      ciHardening: "implemented",
    },
    externalConfigMissing: [],
  };

  // Previous baseline with stale ingestion to exercise diff + alerts.
  const previous = synthesizeJarvis({
    ...baseInput,
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
      lastSuccessAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
  });
  const current = synthesizeJarvis(baseInput);

  const audit = serializeJarvisAudit(current);
  const diff = diffJarvis(previous, current);
  const alerts = alertsFromDiff(diff);
  const pages = pagingAlerts(alerts);

  console.log("── JarvisAssessment (current) ──────────────────────────");
  console.log(JSON.stringify(current, null, 2));
  console.log("\n── audit summary ─────────────────────────────────────");
  console.log(audit.summaryLine);
  console.log("\n── diff (previous → current) ──────────────────────────");
  console.log(summarizeJarvisDiff(diff));
  console.log("\n── alerts ────────────────────────────────────────────");
  console.log(JSON.stringify(alerts, null, 2));
  console.log(`\nPaging alerts: ${pages.length}`);
} catch (err) {
  console.error("Run via tsx so .ts modules can be imported:");
  console.error("  npx tsx scripts/exercise-jarvis.mjs");
  console.error("");
  console.error(`Original error: ${err?.message ?? err}`);
  process.exit(1);
}
