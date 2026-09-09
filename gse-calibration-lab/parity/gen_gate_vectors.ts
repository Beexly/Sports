/**
 * Parity vectors for the eligibility GATE.
 *
 * Imports and runs the REAL production gate over a fixed case set, recording its
 * verdicts including the exact reason strings, so the Python mirror in
 * gsecal/gate.py is proven to make the same decision production makes — not
 * merely a similar-looking one.
 *
 *   npx tsx gse-calibration-lab/parity/gen_gate_vectors.ts
 *
 * WHY STATIC IMPORTS. An earlier version transpiled the source with esbuild and
 * evaluated the generated source through a dynamic import of an inline data
 * URI — an eval-equivalent, correctly flagged by static analysis. tsx imports TypeScript directly, so the
 * dependency below is an ordinary static import with no generated code and no
 * containment check to keep in sync.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateCalibrationEligibility,
  DEFAULT_CALIBRATION_FLOORS,
} from "../../apps/web/lib/ops/calibration-eligibility.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = "apps/web/lib/ops/calibration-eligibility.ts";

const murphy = (reliability) => ({ reliability, resolution: 0.02, uncertainty: 0.21 });

/**
 * Cases span every branch: each floor failing alone, combinations, the streak
 * ladder, missing artifacts, and non-finite metrics.
 *
 * The "recorded_2026_09_06" case uses the production reading written down in
 * AGENTS.md. It is quoted from the repo's own record, not measured here.
 */
const cases = [
  {
    name: "recorded_2026_09_06",
    input: {
      metrics: { n: 458, brier: 0.1926, ece: 0.0524, mce: 0.12, murphy: murphy(0.0053), modelVersion: "v5.2.7", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "all_floors_pass_streak_incomplete",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: "v", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 1, streakRequired: 3,
    },
  },
  {
    name: "all_floors_pass_streak_complete",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: "v", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 2, streakRequired: 3,
    },
  },
  {
    name: "settlement_unhealthy",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: false,
      consecutiveGreenPrior: 2, streakRequired: 3,
    },
  },
  {
    name: "n_below_floor",
    input: {
      metrics: { n: 42, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 42, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "brier_above_floor",
    input: {
      metrics: { n: 200, brier: 0.2401, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 200, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "murphy_above_floor",
    input: {
      metrics: { n: 200, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.0812), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 200, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "no_metrics_artifact",
    input: {
      metrics: null, canonicalSettled: 200, minSettledForLearning: 100,
      settlementHealthy: true, consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "metrics_missing_fields",
    input: {
      metrics: { n: 200, brier: null, ece: null, mce: null, murphy: null, modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 200, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "everything_wrong",
    input: {
      metrics: { n: 5, brier: 0.5, ece: 0.3, mce: 0.4, murphy: murphy(0.3), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 5, minSettledForLearning: 100, settlementHealthy: false,
      consecutiveGreenPrior: 0, streakRequired: 3,
    },
  },
  {
    name: "streak_required_one",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 0, streakRequired: 1,
    },
  },
  // C-275: the deployed-version floor. These execute the REAL production gate.
  {
    name: "deployed_version_clears_its_own_floor",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: "v5.2.8", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 2, streakRequired: 3,
      deployedVersion: { key: "v5.2.8", n: 300, ece: 0.03 },
    },
  },
  {
    // THE FALSE-GREEN CASE: pooled clears the floor, the deployed model does not.
    // Pre-C-275 this read GREEN. It must now read RED.
    name: "deployed_version_fails_while_pooled_passes",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.0499, mce: 0.1, murphy: murphy(0.004), modelVersion: "v5.2.7", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 2, streakRequired: 3,
      deployedVersion: { key: "v5.2.7", n: 245, ece: 0.1089 },
    },
  },
  {
    name: "deployed_version_too_few_own_rows",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: "v5.2.8", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 2, streakRequired: 3,
      deployedVersion: { key: "v5.2.8", n: 12, ece: 0.01 },
    },
  },
  {
    // Omitted entirely -> pre-C-275 behaviour, byte for byte.
    name: "deployed_version_omitted_is_unchanged",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.04, mce: 0.1, murphy: murphy(0.004), modelVersion: "v", dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 2, streakRequired: 3,
    },
  },
  {
    name: "ece_exactly_on_floor",
    input: {
      metrics: { n: 458, brier: 0.19, ece: 0.05, mce: 0.1, murphy: murphy(0.05), modelVersion: null, dateRange: null, generatedAt: null },
      canonicalSettled: 458, minSettledForLearning: 100, settlementHealthy: true,
      consecutiveGreenPrior: 2, streakRequired: 3,
    },
  },
];

const results = cases.map((c) => {
  const report = evaluateCalibrationEligibility(c.input as never);
  return {
    name: c.name,
    input: c.input,
    output: {
      status: report.status,
      runMeetsFloors: report.runMeetsFloors,
      reasons: report.reasons,
      consecutiveGreen: report.consecutiveGreen,
      streakRequired: report.streakRequired,
      deployedVersion: report.deployedVersion,
      deployedVersionChecked: report.deployedVersionChecked,
      operatorHint: report.operatorHint,
      floors: report.floors,
    },
  };
});

const outPath = resolve(HERE, "gate_vectors.json");
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      generatedBy: "gse-calibration-lab/parity/gen_gate_vectors.ts",
      source: SOURCE,
      defaultFloors: DEFAULT_CALIBRATION_FLOORS,
      cases: results,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`wrote ${outPath}`);
console.log(`gate cases: ${results.length}`);
for (const r of results) console.log(`  ${r.name.padEnd(42)} ${r.output.status}`);
