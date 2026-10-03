#!/usr/bin/env node
/**
 * launch-night-smoke.mjs
 *
 * One-command launch-night smoke: brand-safety subset + cockpit subset
 * + (optional) snapshot regen against a running dev server.
 *
 * Usage:
 *   node scripts/launch-night-smoke.mjs                 # runs the test subsets
 *   node scripts/launch-night-smoke.mjs --with-snapshots  # also regens snapshots
 *
 * Exits non-zero if any step fails.
 */

import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const withSnapshots = args.has("--with-snapshots");

const steps = [
  { name: "brand-safety subset", cmd: "npm", argv: ["run", "test:brand-safety"] },
  { name: "cockpit subset", cmd: "npm", argv: ["run", "test:cockpit"] },
];

if (withSnapshots) {
  steps.push({ name: "snapshot regen", cmd: "npm", argv: ["run", "snapshots:regen"] });
}

const results = [];

for (const step of steps) {
  const t0 = Date.now();
  console.log(`\n=== ${step.name} ===`);
  const r = spawnSync(step.cmd, step.argv, { stdio: "inherit", shell: process.platform === "win32" });
  const ms = Date.now() - t0;
  results.push({ name: step.name, ok: r.status === 0, ms, status: r.status });
}

console.log("\n──────────────────────────────────────────────────────");
console.log("Launch-night smoke results:");
for (const r of results) {
  const tag = r.ok ? "OK" : "FAIL";
  console.log(`  ${tag.padEnd(5)} ${r.name.padEnd(25)} ${r.ms}ms  (exit ${r.status})`);
}
const fail = results.filter((r) => !r.ok).length;
if (fail > 0) {
  console.error(`\n${fail} step(s) failed. Fix and re-run.`);
  process.exit(1);
}
console.log("\nAll steps passed.");
process.exit(0);
