#!/usr/bin/env node
/**
 * Master verification runner for Galaxy Sports Edge (`Sports-wt-triage`).
 *
 * Executes every Python, TypeScript, Vitest, guardrail, polyglot OSV, mobile
 * lint, and connected-workflow dossier gate sequentially WITHOUT short-circuiting
 * so you see the complete status across all 7 checks in one run.
 *
 * Usage:
 *   node scripts/ops/overnight-verify-and-ship.mjs
 *   node scripts/ops/overnight-verify-and-ship.mjs --live-osv
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const IS_WIN = process.platform === "win32";
const useLiveOsv = process.argv.includes("--live-osv");

function npmStep(name, npmArgs) {
  const npmCli = resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  if (existsSync(npmCli)) {
    return { name, cmd: process.execPath, args: [npmCli, ...npmArgs], useShell: false };
  }
  return { name, cmd: IS_WIN ? "npm.cmd" : "npm", args: npmArgs, useShell: IS_WIN };
}

const STEPS = [
  {
    name: "pytest-unit-workflows-integration",
    cmd: "python",
    args: ["-m", "pytest", "tests/", "-q"],
    useShell: false,
  },
  npmStep("monorepo-typecheck", ["run", "typecheck"]),
  npmStep("vitest-web-security-entitlements", [
    "run",
    "test",
    "--workspace=apps/web",
    "--",
    "lib/__tests__/entitlements-pack-bridge.test.ts",
    "lib/integrations/__tests__/whop-security.test.ts",
    "lib/packages/__tests__/unlock-cookie.test.ts",
    "lib/fantasy/__tests__/lineup-doctor.test.ts",
    "lib/props/__tests__/db-rate-history-resolver.test.ts",
  ]),
  npmStep("vitest-ingestion-board360-props", [
    "run",
    "test",
    "--workspace=@sports/ingestion-pipeline",
    "--",
    "src/__tests__/board360-props-shadow-source.test.ts",
  ]),
  npmStep("vitest-governed-and-ml-client", [
    "run",
    "test",
    "--workspace=@sports/governed",
    "--",
    "src/__tests__/publication-gate.test.ts",
  ]),
  npmStep("vitest-prediction-engine-ml-endpoints", [
    "run",
    "test",
    "--workspace=@sports/prediction-engine",
    "--",
    "src/ensemble/__tests__/gse-ml-endpoints.test.ts",
  ]),
  {
    name: "guardrails-run-all",
    cmd: "node",
    args: ["scripts/guardrails/run-all.mjs"],
    useShell: false,
  },
  {
    name: "osv-polyglot-audit",
    cmd: "node",
    args: useLiveOsv
      ? ["scripts/ops/osv-polyglot-audit.mjs"]
      : ["scripts/ops/osv-polyglot-audit.mjs", "--offline-manifest-check"],
    useShell: false,
  },
  {
    name: "mobile-lint-rules",
    cmd: "node",
    args: ["apps/mobile/scripts/lint-rules.js"],
    useShell: false,
  },
  {
    name: "connected-workflow-dossier-guard",
    cmd: "python",
    args: ["scripts/guardrails/connected-workflow-dossier-guard.py"],
    useShell: false,
  },
];

function runStep(step) {
  const startedAt = Date.now();
  console.log(`\n=== [${step.name}] ${step.cmd} ${step.args.join(" ")} ===`);
  const res = spawnSync(step.cmd, step.args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: step.useShell,
  });
  const elapsedMs = Date.now() - startedAt;
  const code = res.status ?? 1;
  return {
    name: step.name,
    ok: code === 0,
    exitCode: code,
    elapsedMs,
    error: res.error ? res.error.message : null,
  };
}

function main() {
  const results = [];
  for (const step of STEPS) {
    results.push(runStep(step));
  }

  console.log("\n=== OVERNIGHT VERIFICATION SUMMARY ===");
  for (const r of results) {
    const badge = r.ok ? "PASS" : "FAIL";
    console.log(
      `  [${badge}] ${r.name.padEnd(38)} exit=${r.exitCode} (${r.elapsedMs}ms)` +
        (r.error ? ` err=${r.error}` : ""),
    );
  }
  console.log(JSON.stringify({ total: results.length, passed: results.filter((r) => r.ok).length, results }));

  const anyFailed = results.some((r) => !r.ok);
  process.exit(anyFailed ? 1 : 0);
}

main();
