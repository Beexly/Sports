#!/usr/bin/env node
/**
 * Orbit extract integrity — every SHIPPED surface path must exist.
 * Exit 0 only if path checks + package exports hold.
 * Optionally chains session2:extract when --full.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");

const REQUIRED_PATHS = [
  "docs/ops/FULL_SESSION_EXTRACT.md",
  "docs/ops/SESSION_2_EXTRACT.md",
  "docs/ops/ORBIT_MAP.md",
  "docs/ops/ORBIT_NEXT_50.md",
  "docs/ops/ORBIT_UNLOCK.md",
  "docs/ops/CALIBRATION_PIPELINE.md",
  "docs/ops/DEFER_90_DAYS.md",
  "packages/prediction-engine/src/probability-calibration.ts",
  "packages/prediction-engine/src/calibration-kelly-bridge.ts",
  "packages/prediction-engine/src/edge-lab/kelly.ts",
  "packages/prediction-engine/src/shin-devig.ts",
  "packages/prediction-engine/src/index.ts",
  "scripts/dspy-gse/gse_metric.mjs",
  "scripts/dspy-gse/gepa_config.json",
  "scripts/dspy-gse/promote.mjs",
  "scripts/dspy-gse/run.mjs",
  "scripts/dspy-gse/data/goldens.json",
  "scripts/calibration-offline/run.mjs",
  "scripts/export-settled-picks-for-calibration.mjs",
  "scripts/agent-eval/run.mjs",
  "apps/web/lib/embed/edge-index.ts",
  "apps/web/app/embed/edge-index/[gameId]/page.tsx",
  "apps/web/app/edge-index/page.tsx",
  "apps/web/lib/claude-api/model-router.ts",
  "docs/agent-skills/dspy-gepa/SKILL.md",
  "docs/agent-skills/calibration-pipeline/SKILL.md",
  "docs/agent-skills/inference-routing/SKILL.md",
  "docs/agent-skills/settlement-free-path/SKILL.md",
  "docs/agent-skills/polymarket-hold/SKILL.md",
  "apps/web/lib/settlement/path-select.ts",
  "scripts/ops/orbit-unlock-smoke.mjs",
  "docs/ops/MAX_LEVERAGE.md",
  "docs/agent-skills/max-leverage/SKILL.md",
];

const EXPORTS = [
  "centeredIsotonicCalibration",
  "timeHoldoutSplit",
  "selectedSliceEce",
  "sizeAfterCalibration",
  "portfolioKellyStakes",
  "clvDeflator",
  "shinDevig",
  "toEdgeIndex",
];

const failed = [];
for (const rel of REQUIRED_PATHS) {
  if (!existsSync(join(root, rel))) failed.push(`missing path: ${rel}`);
}

const indexSrc = readFileSync(
  join(root, "packages/prediction-engine/src/index.ts"),
  "utf8",
);
for (const exp of EXPORTS) {
  if (!indexSrc.includes(exp)) failed.push(`missing export: ${exp}`);
}

// GEPA config laws
const gepa = JSON.parse(
  readFileSync(join(root, "scripts/dspy-gse/gepa_config.json"), "utf8"),
);
if (gepa.reflection_lm?.temperature !== 1.0) failed.push("reflection temp != 1.0");
if (gepa.task_lm?.temperature !== 0) failed.push("task temp != 0");
if (gepa.auto !== "light") failed.push('auto != "light"');

// Embed free-path laws in source
const embedSrc = readFileSync(join(root, "apps/web/lib/embed/edge-index.ts"), "utf8");
if (!embedSrc.includes("canSeeFactorBreakdown: false")) {
  failed.push("embed must force FREE factor breakdown off");
}
if (!embedSrc.includes("canSeeLineMovement: false")) {
  failed.push("embed must force FREE line movement off");
}

const report = {
  paths: REQUIRED_PATHS.length,
  exports: EXPORTS.length,
  failed,
  ok: failed.length === 0,
};

console.log(JSON.stringify(report, null, 2));

if (failed.length) process.exit(1);

if (full) {
  const r = spawnSync(
    process.execPath,
    [
      join(root, "scripts/dspy-gse/run.mjs"),
    ],
    { encoding: "utf8", cwd: root },
  );
  if (r.status !== 0) {
    console.error(r.stdout || r.stderr);
    process.exit(r.status || 1);
  }
  const r2 = spawnSync(process.execPath, [join(root, "scripts/calibration-offline/run.mjs")], {
    encoding: "utf8",
    cwd: root,
  });
  if (r2.status !== 0) {
    console.error(r2.stdout || r2.stderr);
    process.exit(r2.status || 1);
  }
  const r3 = spawnSync(process.execPath, [join(root, "scripts/agent-eval/run.mjs")], {
    encoding: "utf8",
    cwd: root,
  });
  process.stdout.write(r3.stdout || "");
  if (r3.status !== 0) process.exit(r3.status || 1);
}

process.exit(0);
