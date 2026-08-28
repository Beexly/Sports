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
 *
 * ── LAUNCH-NIGHT RUNBOOK (LQ18) ──────────────────────────────────────────────
 *   T-1h   node scripts/launch-night-smoke.mjs            # local: brand-safety + cockpit green
 *   T-0    deploy
 *   T+10m  node scripts/launch-night-smoke.mjs --prod     # full prod sequence
 *   each gate flip (OWNER-ACTION #7): re-run --prod
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `--prod [--base=URL]` (default base https://www.galaxysportsedge.com) appends, in
 * order, the full production-surface sequence defined by card LQ18. It NEVER replaces
 * the local vitest subsets — those are local-only and always run first. The `--prod`
 * path is exercised live on launch night; the local path is deterministically verifiable.
 */

import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const args = new Set(argv);
const withSnapshots = args.has("--with-snapshots");
const prodMode = args.has("--prod");
const baseArg = argv.find((a) => a.startsWith("--base="));
const BASE = (baseArg ? baseArg.split("=")[1] : "https://www.galaxysportsedge.com").replace(/\/$/, "");

const steps = [
  { name: "brand-safety subset", cmd: "npm", argv: ["run", "test:brand-safety"] },
  { name: "cockpit subset", cmd: "npm", argv: ["run", "test:cockpit"] },
];

if (withSnapshots) {
  steps.push({ name: "snapshot regen", cmd: "npm", argv: ["run", "snapshots:regen"] });
}

const results = [];

// ── LQ18 EXPECTED paywall table ───────────────────────────────────────────────
// Single switch for the anonymous entitlement contract. Each row is tied to the card
// that set it. The verifier cross-checks LQ1's merge state against the dfs row.
const PROD_PROBE_TIMEOUT_MS = 15_000;
// LQ1 (paywall, medium) merged: the raw DFS salaries JSON route is gated behind the
// Fantasy/Pro/Elite floor, so an anonymous caller gets 401. If LQ1 is ever reverted
// to a public teaser, flip this EXPECTED_DFS_SALARIES_STATUS to 200 with a TODO(LQ1).
const EXPECTED_DFS_SALARIES_STATUS = 401; // LQ1 merged — gated 401

// ── prod-mode step builders (only appended when --prod) ───────────────────────
function appendProdSteps() {
  steps.push({
    name: "deploy:ready",
    cmd: "node",
    argv: ["scripts/check-deploy-readiness.mjs"],
  });
  steps.push({
    name: "smoke:prod",
    cmd: "node",
    argv: ["scripts/post-deploy-smoke.mjs", `--url=${BASE}`],
  });
  steps.push({
    name: "prod-probe",
    cmd: "node",
    argv: ["scripts/prod-probe.mjs"],
    env: { ...process.env, APP_URL: BASE },
  });
  // Step 4: cron liveness — inline fetch, assert only status + JSON parse, print freshness.
  steps.push({
    name: "cron liveness",
    run: async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PROD_PROBE_TIMEOUT_MS);
      try {
        const healthRes = await fetch(`${BASE}/api/health`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        const healthJson = await healthRes.json().catch(() => null);
        if (healthRes.status !== 200 || !healthJson || healthJson.ok !== true) {
          throw new Error(`/api/health expected 200 JSON {ok:true}, got status ${healthRes.status}`);
        }
        console.log(`    /api/health ok=${healthJson.ok}`);

        const truthRes = await fetch(`${BASE}/api/ops/public-surface-truth`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        const truthJson = await truthRes.json().catch(() => null);
        if (truthRes.status !== 200 || !truthJson) {
          throw new Error(`/api/ops/public-surface-truth expected 200 JSON, got status ${truthRes.status}`);
        }
        // Print freshness fields verbatim for the operator's eyeball. Assert only status + parse.
        const fresh = truthJson.freshness ?? truthJson;
        console.log("    /api/ops/public-surface-truth freshness:");
        console.log("      " + JSON.stringify(fresh));
      } finally {
        clearTimeout(timer);
      }
    },
  });
  // Step 5: paywall spot-check — assert contract is null-not-omitted, never key-absent.
  steps.push({
    name: "paywall spot-check",
    run: async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PROD_PROBE_TIMEOUT_MS);
      try {
        // /api/board/state → 200 + null-not-omitted confidence, no non-null rankingP.
        const boardRes = await fetch(`${BASE}/api/board/state`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (boardRes.status !== 200) {
          throw new Error(`/api/board/state expected 200, got ${boardRes.status}`);
        }
        const board = await boardRes.json().catch(() => null);
        if (!board || !board.data) throw new Error("/api/board/state: missing data");
        const rows = [
          ...(board.data.scoringNow ?? []),
          ...(board.data.publishedToday ?? []),
          ...(board.data.gatedTodayRows ?? []),
        ];
        for (const [i, row] of rows.entries()) {
          if (row.confidence !== null) {
            throw new Error(`/api/board/state row ${i}: confidence must be null (got ${JSON.stringify(row.confidence)})`);
          }
          if (row.rankingP != null) {
            throw new Error(`/api/board/state row ${i}: rankingP must be null/absent (got ${JSON.stringify(row.rankingP)})`);
          }
        }
        console.log(`    /api/board/state: ${rows.length} rows, all confidence === null, no rankingP`);

        // /api/picks → 200, zero PREMIUM, confidence === null on every row.
        const picksRes = await fetch(`${BASE}/api/picks`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (picksRes.status !== 200) {
          throw new Error(`/api/picks expected 200, got ${picksRes.status}`);
        }
        const picks = await picksRes.json().catch(() => null);
        // Hardening (LQ18 attacks): a misbehaving/error envelope must NOT vacuously
        // pass the "zero PREMIUM" check. Require a well-formed success payload.
        if (!picks || picks.success === false || !Array.isArray(picks.data)) {
          throw new Error("/api/picks: expected success envelope {success:true,data:[...]}");
        }
        const pickRows = picks.data;
        const premiumCount = pickRows.filter((p) => p.tier === "PREMIUM").length;
        if (premiumCount > 0) {
          throw new Error(`/api/picks: ${premiumCount} PREMIUM row(s) leaked to anonymous caller`);
        }
        for (const [i, p] of pickRows.entries()) {
          if (p.confidence !== null) {
            throw new Error(`/api/picks row ${i}: confidence must be null (got ${JSON.stringify(p.confidence)})`);
          }
        }
        console.log(`    /api/picks: ${pickRows.length} rows, 0 PREMIUM, all confidence === null`);

        // /api/dfs/salaries → EXPECTED_DFS_SALARIES_STATUS (401 since LQ1 merged).
        const dfsRes = await fetch(`${BASE}/api/dfs/salaries`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (dfsRes.status !== EXPECTED_DFS_SALARIES_STATUS) {
          throw new Error(
            `/api/dfs/salaries expected ${EXPECTED_DFS_SALARIES_STATUS} (LQ1 gating), got ${dfsRes.status}`
          );
        }
        console.log(`    /api/dfs/salaries: ${dfsRes.status} (EXPECTED ${EXPECTED_DFS_SALARIES_STATUS})`);

        // /api/intelligence/predictiveness → 401.
        const predRes = await fetch(`${BASE}/api/intelligence/predictiveness`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (predRes.status !== 401) {
          throw new Error(`/api/intelligence/predictiveness expected 401, got ${predRes.status}`);
        }
        console.log("    /api/intelligence/predictiveness: 401");
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

if (prodMode) appendProdSteps();

async function runStep(step) {
  const t0 = Date.now();
  console.log(`\n=== ${step.name} ===`);
  let ok = false;
  let status = null;
  try {
    if (step.run) {
      await step.run();
      ok = true;
      status = 0;
    } else {
      const r = spawnSync(step.cmd, step.argv, {
        stdio: "inherit",
        shell: process.platform === "win32",
        ...(step.env ? { env: step.env } : {}),
      });
      ok = r.status === 0;
      status = r.status;
    }
  } catch (err) {
    ok = false;
    status = 1;
    console.error(`  step threw: ${err?.message ?? err}`);
  }
  const ms = Date.now() - t0;
  results.push({ name: step.name, ok, ms, status });
}

for (const step of steps) {
  await runStep(step);
}

console.log("\n──────────────────────────────────────────────────────");
console.log("Launch-night smoke results:");
for (const r of results) {
  const tag = r.ok ? "OK" : "FAIL";
  console.log(`  ${tag.padEnd(5)} ${r.name.padEnd(25)} ${r.ms}ms  (exit ${r.status})`);
}
const fail = results.filter((r) => !r.ok).length;

// ── LQ18 Step 6: epilogue manual checklist (always printed in --prod mode) ──────
if (prodMode) {
  console.log("\n──────────────────────────────────────────────────────");
  console.log("MANUAL checklist (cannot be scripted — OWNER-ACTION §§1-9):");
  console.log("  [ ] scheduler proof: three cron timestamps advancing");
  console.log("  [ ] Stripe TEST subscribe per tier (Free / Pro / Elite)");
  console.log("  [ ] one end-to-end Elite graded alert fired");
  console.log("  [ ] gate ladder flipped in order + FORCE_NO_BET_IF_STALE=true");
  console.log("  [ ] watchlist migration applied");
  console.log("  [ ] off-stack monitor armed");
  console.log("  [ ] PRICING_PHASE unset");
  console.log("  [ ] Odds API quota headroom confirmed");
}

if (fail > 0) {
  console.error(`\n${fail} step(s) failed. Fix and re-run.`);
  process.exit(1);
}
console.log("\nAll steps passed.");
process.exit(0);
