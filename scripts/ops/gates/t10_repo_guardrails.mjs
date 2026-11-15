#!/usr/bin/env node
/**
 * T-10 — Repo guardrails + typechecks (WP-7 gate, fail-closed).
 *
 * Runs, in order, collecting EVERY failure (no short-circuit):
 *   1. scripts/guardrails/run-all.mjs  (all repo guardrails incl. trust-gate,
 *      commercial-copy-scan, no-raw-ngs-export, ...)
 *   2. apps/mobile/scripts/lint-rules.js
 *   3. scripts/guardrails/connected-workflow-dossier-guard.py
 *   4. tsc --noEmit: prediction-engine, ingestion-pipeline, apps/web
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const failures = [];

function run(name, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: false, ...opts });
  const code = r.status ?? 1;
  const tail = (r.stdout ?? "").split("\n").slice(-4).join(" | ");
  console.log(`  ${code === 0 ? "PASS" : "FAIL"}  ${name} (exit ${code})${code !== 0 ? ` — ${tail} ${r.stderr ?? ""}`.slice(0, 400) : ""}`);
  if (code !== 0) failures.push(name);
}

run("guardrails run-all", process.execPath, ["scripts/guardrails/run-all.mjs"]);
run("mobile lint-rules", process.execPath, ["apps/mobile/scripts/lint-rules.js"]);
const py = spawnSync("python", ["--version"], { encoding: "utf8" }).status === 0 ? "python" : "python3";
run("connected-workflow-dossier-guard", py, ["scripts/guardrails/connected-workflow-dossier-guard.py"]);
for (const pkg of ["packages/prediction-engine", "packages/ingestion-pipeline", "apps/web"]) {
  run(`tsc --noEmit ${pkg}`, process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", `${pkg}/tsconfig.json`]);
}

if (failures.length > 0) {
  console.error(`T-10 FAIL: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("T-10 PASS");