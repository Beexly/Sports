#!/usr/bin/env node
/**
 * scripts/factors/run.mjs — C-364 Factor Foundry runner harness (LAST_PLAN §4.1).
 *
 * Gate before execute:
 *   1. docs/factors/<id>.yaml exists and passes the zod schema (index.mjs).
 *   2. kill_line is non-empty (pre-registered).
 *   3. If the YAML is already committed, that commit must carry kill_line
 *      BEFORE any run may flip status off UNTESTED/BLOCKED.
 *   4. scripts/factors/<id>.mjs (the numerical runner, C-365+) is invoked
 *      only when present. C-364 lands the harness, not the estimators.
 *
 * Does NOT write number/CI/n/status back into the YAML — the numerical
 * runner (C-365+) owns that write-back after a successful run.
 *
 * Usage:
 *   node scripts/factors/run.mjs A1
 *   node scripts/factors/run.mjs A1 --dry-run
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FACTORS_DIR,
  OPEN_STATUSES,
  commitDate,
  killLineCommitDate,
  loadSpecFromText,
  validatePreRegistration,
  validateRunOrder,
} from "./index.mjs";

const SCORED = new Set(["CANDIDATE", "LIVE", "DEAD"]);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function usage() {
  console.error("usage: node scripts/factors/run.mjs <id> [--dry-run]");
  console.error("  e.g. node scripts/factors/run.mjs A1");
  process.exit(2);
}

function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const id = argv.find((a) => !a.startsWith("-") && !a.endsWith(".mjs"));
  if (!id) usage();
  if (!/^[A-Z][0-9]+$/.test(id)) {
    console.error(`[factors:run] id must look like A1 (got ${JSON.stringify(id)})`);
    return 2;
  }

  const yamlPath = path.join(FACTORS_DIR, `${id}.yaml`);
  if (!existsSync(yamlPath)) {
    console.error(`[factors:run] missing spec: ${yamlPath}`);
    console.error("Write the pre-registered YAML (kill_line first) before running.");
    return 2;
  }

  const loaded = loadSpecFromText(readFileSync(yamlPath, "utf8"), id);
  if (!loaded.ok) {
    console.error(`[factors:run] ${id} failed the zod spec schema:`);
    for (const e of loaded.errors) console.error(`  ${e}`);
    return 1;
  }
  const spec = loaded.spec;

  const structural = validatePreRegistration(spec);
  if (!structural.ok) {
    console.error(`[factors:run] ${id} failed pre-registration:`);
    for (const e of structural.errors) console.error(`  ${e}`);
    return 1;
  }

  // Temporal gate: if the YAML is in git, its kill_line commit must exist
  // before any scored status may stand. UNTESTED/BLOCKED pass without a run.
  const rel = path.relative(REPO_ROOT, yamlPath).split(path.sep).join("/");
  const killLineCommittedAt = killLineCommitDate(REPO_ROOT, rel);
  if (SCORED.has(spec.status)) {
    const runCommittedAt = commitDate(REPO_ROOT, spec.run_sha);
    const order = validateRunOrder(spec, { killLineCommittedAt, runCommittedAt });
    if (!order.ok) {
      console.error(`[factors:run] ${id} failed the kill_line / run_sha order gate:`);
      for (const e of order.errors) console.error(`  ${e}`);
      return 1;
    }
  } else if (!OPEN_STATUSES.has(spec.status)) {
    console.error(`[factors:run] ${id}: unexpected status ${spec.status}`);
    return 1;
  }

  if (!killLineCommittedAt) {
    console.warn(
      `[factors:run] ${id}: kill_line is not yet in a commit — commit ${rel} before flipping status off UNTESTED/BLOCKED.`,
    );
  }

  console.log(`[factors:run] ${id} pre-registration OK`);
  console.log(`  title:     ${spec.title}`);
  console.log(`  status:    ${spec.status}`);
  console.log(`  kill_line: ${spec.kill_line}`);
  console.log(`  script:    ${spec.script}`);

  const scriptRel = spec.script;
  const scriptPath = path.isAbsolute(scriptRel) ? scriptRel : path.join(REPO_ROOT, scriptRel);
  if (!existsSync(scriptPath)) {
    console.log(
      `[factors:run] numerical runner not present — C-365+ lands ${scriptRel}. Gate passed; nothing to execute.`,
    );
    return 0;
  }

  if (dryRun) {
    console.log(`[factors:run] --dry-run: would execute ${scriptPath}`);
    return 0;
  }

  console.log(`[factors:run] executing ${scriptPath}`);
  const child = spawnSync(process.execPath, [scriptPath, ...argv.filter((a) => a !== id && !a.startsWith("--"))], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (child.error) {
    console.error(`[factors:run] spawn failed: ${child.error.message}`);
    return 1;
  }
  return child.status ?? 1;
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  process.exit(main(process.argv.slice(2)));
}
