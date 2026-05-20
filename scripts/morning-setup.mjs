#!/usr/bin/env node
/**
 * morning-setup.mjs
 *
 * One-shot operator helper. Runs the launch-night setup steps in
 * sequence so the operator can see picks in the dashboard with one
 * command:
 *
 *   node scripts/morning-setup.mjs
 *
 * Steps:
 *   1. `npm run db:seed` — creates ~38 synthetic picks if the table is
 *      empty + dev-only.
 *   2. `npm run snapshots:regen` — refresh the static HTML snapshots
 *      from the running dev server (skipped if APP_URL is not
 *      reachable).
 *
 * Each step is best-effort: a failure in one does not stop the rest.
 * Final exit code is the worst non-zero across all steps.
 *
 * Assumes `npm run dev` is already running in another terminal.
 */

import { spawnSync } from "node:child_process";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const steps = [
  {
    name: "db:seed",
    cmd: "npm",
    argv: ["run", "db:seed"],
  },
  {
    name: "snapshots:regen",
    cmd: "npm",
    argv: ["run", "snapshots:regen"],
    requiresServer: true,
  },
];

let worstStatus = 0;
const summary = [];

async function pingServer() {
  try {
    const res = await fetch(`${APP_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const serverUp = await pingServer();
if (!serverUp) {
  console.warn(`(no dev server reachable at ${APP_URL} — snapshot regen will be skipped)`);
}

for (const step of steps) {
  if (step.requiresServer && !serverUp) {
    summary.push({ name: step.name, status: "SKIP", ms: 0 });
    continue;
  }
  const t0 = Date.now();
  console.log(`\n=== ${step.name} ===`);
  const r = spawnSync(step.cmd, step.argv, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const ms = Date.now() - t0;
  if (r.status !== 0 && r.status !== null) {
    worstStatus = Math.max(worstStatus, r.status);
  }
  summary.push({
    name: step.name,
    status: r.status === 0 ? "OK" : `FAIL(${r.status})`,
    ms,
  });
}

console.log("\n──────────────────────────────────────────────────────");
console.log("Morning setup summary:");
for (const s of summary) {
  console.log(`  ${s.status.padEnd(10)} ${s.name.padEnd(20)} ${s.ms}ms`);
}
console.log("");
console.log("Open these in a browser to verify:");
console.log(`  ${APP_URL}/dashboard       — Today's picks + Recent results`);
console.log(`  ${APP_URL}/cockpit         — Jarvis + picks-glance`);
console.log(`  ${APP_URL}/cockpit/history — Forensic ledger`);
console.log(`  ${APP_URL}/picks           — Customer slate`);

process.exit(worstStatus === 0 ? 0 : 1);
