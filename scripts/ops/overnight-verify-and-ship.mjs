#!/usr/bin/env node
/**
 * Master verification runner for Galaxy Sports Edge (`Sports-wt-triage`).
 *
 * Executes every Python, TypeScript, Vitest, guardrail, polyglot OSV, mobile
 * lint, and connected-workflow dossier gate sequentially WITHOUT short-circuiting
 * so you see the complete status across all checks in one run.
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

const PYTHON_TEST_FILES = [
  "tests/unit/test_feed_guard.py",
  "tests/unit/test_beat_langextract.py",
  "tests/unit/test_volume_conservation.py",
  "tests/unit/test_qb_physics.py",
  "tests/unit/test_conjunction_and_dfs.py",
  "tests/unit/test_arize_backtest.py",
  "tests/unit/test_sequenced_pipeline_v3_bridge.py",
  "tests/unit/test_trajectory_checkpoint.py",
  "tests/unit/test_agentdb_store.py",
  "tests/unit/test_gcp_warehouse.py",
  "tests/unit/test_skill_evaluator.py",
  "tests/unit/test_billion_context.py",
  "tests/unit/test_recency_last30days.py",
  "tests/unit/test_agent_org_roster.py",
  "tests/unit/test_skfolio_and_deepke.py",
  "tests/unit/test_neural_calibration_and_attention.py",
  "tests/unit/test_vision_and_geofence.py",
  "tests/unit/test_cache_and_sandbox_governor.py",
  "tests/unit/test_teammate_routines.py",
  "tests/unit/test_skill_registry_and_arize_suite.py",
  "tests/unit/test_polyglot_cloud_and_ci_adapters.py",
  "tests/unit/test_week10_projection_autopsy_fixes.py",
  "tests/unit/test_wave9_books_pdfs_ig_x_situational_and_sim_upgrade.py",
  "tests/unit/test_fabric_philox_cross_lang_parity.py",
  "tests/unit/test_fabric_coordinator_chaos.py",
  "tests/unit/test_fabric_byzantine_and_canary.py",
  "tests/unit/test_fabric_evolution_and_eprocess.py",
  "tests/unit/test_gsi_translational_and_datascience_bridge.py",
  "tests/unit/test_v4_k01_to_k25_kernels.py",
  "tests/unit/test_wave19_agentic_fleet.py",
  "tests/unit/test_t_minus_lock_orchestrator.py",
  "tests/unit/test_daily_multisport_slate_engine.py",
  "tests/property/test_conservation_properties.py",
  "tests/property/test_v4_k01_to_k25_invariants.py",
  "tests/workflows/test_slate_window_workflow.py",
  "tests/integration/test_receipts_s3_localstack.py",
  "tests/python/test_pregame_harmony_regressions.py",
];

const PYTHON_ENV = {
  ...process.env,
  PYTHONPATH: `${resolve(REPO_ROOT, "src")};${REPO_ROOT}`,
};

const STEPS = [
  {
    name: "pytest-gse-engine-and-harmony",
    cmd: "python",
    args: ["-m", "pytest", ...PYTHON_TEST_FILES, "-q"],
    useShell: false,
    env: PYTHON_ENV,
  },
  {
    name: "ruff-gse-engine-and-suites",
    cmd: "python",
    args: [
      "-m",
      "ruff",
      "check",
      "src/gse_engine",
      "tests/property",
      "tests/workflows",
      "tests/integration",
      "tests/unit/test_feed_guard.py",
      "tests/unit/test_beat_langextract.py",
      "tests/unit/test_volume_conservation.py",
      "tests/unit/test_qb_physics.py",
      "tests/unit/test_conjunction_and_dfs.py",
      "tests/unit/test_arize_backtest.py",
      "tests/unit/test_sequenced_pipeline_v3_bridge.py",
      "tests/unit/test_trajectory_checkpoint.py",
      "tests/unit/test_agentdb_store.py",
      "tests/unit/test_gcp_warehouse.py",
      "tests/unit/test_skill_evaluator.py",
      "tests/unit/test_billion_context.py",
      "tests/unit/test_recency_last30days.py",
      "tests/unit/test_agent_org_roster.py",
      "tests/unit/test_skfolio_and_deepke.py",
      "tests/unit/test_neural_calibration_and_attention.py",
      "tests/unit/test_vision_and_geofence.py",
      "tests/unit/test_cache_and_sandbox_governor.py",
      "tests/unit/test_teammate_routines.py",
      "tests/unit/test_skill_registry_and_arize_suite.py",
      "tests/unit/test_polyglot_cloud_and_ci_adapters.py",
      "tests/unit/test_week10_projection_autopsy_fixes.py",
      "tests/unit/test_wave9_books_pdfs_ig_x_situational_and_sim_upgrade.py",
      "tests/unit/test_fabric_philox_cross_lang_parity.py",
      "tests/unit/test_fabric_coordinator_chaos.py",
      "tests/unit/test_fabric_byzantine_and_canary.py",
      "tests/unit/test_fabric_evolution_and_eprocess.py",
      "tests/unit/test_gsi_translational_and_datascience_bridge.py",
      "tests/unit/test_v4_k01_to_k25_kernels.py",
      "tests/unit/test_wave19_agentic_fleet.py",
      "tests/unit/test_t_minus_lock_orchestrator.py",
      "tests/unit/test_daily_multisport_slate_engine.py",
      "scripts/ops/gse_fabric_worker_daemon.py",
      "scripts/ops/gse_gcp_orchestration_tasks.py",
    ],
    useShell: false,
  },
  {
    name: "mypy-strict-gse-engine",
    cmd: "python",
    args: ["-m", "mypy", "--strict", "src/gse_engine"],
    useShell: false,
    env: PYTHON_ENV,
  },
  {
    name: "cli-backtest-oos-gate",
    cmd: "python",
    args: [
      "-m",
      "gse_engine.cli",
      "backtest",
      "--season=2026",
      "--weeks=1..9",
      "--require-ece-max=0.035",
    ],
    useShell: false,
    env: PYTHON_ENV,
  },
  npmStep("typecheck-governed", ["run", "typecheck", "--workspace=@sports/governed"]),
  npmStep("typecheck-ingestion-pipeline", [
    "run",
    "typecheck",
    "--workspace=@sports/ingestion-pipeline",
  ]),
  npmStep("typecheck-prediction-engine", [
    "run",
    "typecheck",
    "--workspace=@sports/prediction-engine",
  ]),
  npmStep("typecheck-web", ["run", "typecheck", "--workspace=apps/web"]),
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
    "lib/viz/__tests__/ag-ui-univer-d3.test.ts",
    "lib/offline-and-pedagogy/__tests__/slate-sync-and-trace-forest.test.ts",
    "lib/workspace-and-3d/__tests__/canvas-studio-and-3d-scene.test.ts",
    "__tests__/autonomy-kernel.test.ts",
    "__tests__/autonomy-executor.test.ts",
    "__tests__/autonomy-posture.test.ts",
    "__tests__/compound-fabric-audit-route.test.ts",
    "__tests__/storefront-wcag-a11y.test.tsx",
    "__tests__/seo-and-agent-discovery.test.ts",
    "__tests__/programmatic-seo-and-visitor-capture.test.ts",
    "__tests__/csp-single-source.test.ts",
    "__tests__/next-config-policy.test.ts",
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
    "tests/publication-gate.test.ts",
  ]),
  npmStep("vitest-prediction-engine-ml-and-cadence", [
    "run",
    "test",
    "--workspace=@sports/prediction-engine",
    "--",
    "src/ensemble/__tests__/gse-ml-endpoints.test.ts",
    "src/public-baseline/__tests__/rolling-cadence.test.ts",
    "src/public-baseline/__tests__/public-baseline.test.ts",
    "src/__tests__/fabric-philox-and-eprocess.test.ts",
    "src/__tests__/v4-k03-k05-k13-k25.test.ts",
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
  {
    name: "cdp-storefront-smoke",
    cmd: "node",
    args: ["scripts/ops/cdp-storefront-smoke.mjs", "--offline-static-check"],
    useShell: false,
  },
  {
    name: "pre-sim-total-intelligence-gate",
    cmd: "python",
    args: [
      "scripts/guardrails/pre_sim_total_intelligence_gate.py",
      "--repo-root",
      ".",
      "--self-test",
    ],
    useShell: false,
    env: PYTHON_ENV,
  },
  {
    name: "v4-sidecar-verifier-mnf-w11",
    cmd: "python",
    args: [
      "scripts/ops/gse_v4_sidecar_verifier_and_mnf_w11_harness.py",
      "--repo-root",
      ".",
    ],
    useShell: false,
    env: PYTHON_ENV,
  },
  {
    name: "t-minus-lock-offline-verify",
    cmd: "python",
    args: [
      "scripts/ops/gse_t_minus_lock_orchestrator.py",
      "--week",
      "10",
      "--matchup",
      "LAC@BAL",
      "--offline-verify",
    ],
    useShell: false,
    env: PYTHON_ENV,
  },
  {
    name: "orbit-unlock-smoke",
    cmd: "node",
    args: ["scripts/ops/orbit-unlock-smoke.mjs"],
    useShell: false,
  },
  {
    name: "whop-e2e-self-test",
    cmd: "node",
    args: ["scripts/ops/provision_gse_whop_end_to_end.mjs", "--self-test"],
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
    env: step.env ?? process.env,
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
      `  [${badge}] ${r.name.padEnd(42)} exit=${r.exitCode} (${r.elapsedMs}ms)` +
        (r.error ? ` err=${r.error}` : ""),
    );
  }
  console.log(JSON.stringify({ total: results.length, passed: results.filter((r) => r.ok).length, results }));

  const anyFailed = results.some((r) => !r.ok);
  process.exit(anyFailed ? 1 : 0);
}

main();
