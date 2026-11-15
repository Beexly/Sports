import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

test("SCHED-4B: gse-connected-5stage-gameday-orchestrator.yml declares all required crons, dispatch inputs, and 3 jobs", () => {
  const wfPath = resolve(REPO_ROOT, ".github/workflows/gse-connected-5stage-gameday-orchestrator.yml");
  assert.ok(existsSync(wfPath), "Workflow file must exist");
  const wfText = readFileSync(wfPath, "utf8");

  const requiredCrons = [
    "0 15 * * 2",
    "0 21 * * 3,4,5",
    "35 16 * * 0",
    "40 19 * * 0",
    "50 23 * * 0,1,4",
    "30 19 * * 0",
    "35 22 * * 0",
    "15 2 * * 1,2,5",
    "0 4 * * *",
  ];
  for (const cron of requiredCrons) {
    assert.ok(wfText.includes(cron), `Missing schedule cron '${cron}'`);
  }

  for (const modeOpt of [
    "tuesday_roster_baseline",
    "wed_fri_practice_delta",
    "full_slate_pregame_t85m",
    "halftime_live_2h",
    "overnight_corpus_mind_consolidation",
  ]) {
    assert.ok(wfText.includes(modeOpt), `Missing workflow_dispatch mode '${modeOpt}'`);
  }
  assert.match(wfText, /week:\s*\r?\n[\s\S]*?default:\s*["']auto["']/);

  // Job 1: pregame-t85m-connected-5stage-workflow
  assert.match(wfText, /^\s*pregame-t85m-connected-5stage-workflow:/m);
  assert.ok(wfText.includes("python scripts/ops/consolidate_mind_staging_and_corpus.py"));
  assert.ok(wfText.includes("python scripts/ops/run_permanent_sequenced_weekly_pipeline.py"));
  assert.ok(wfText.includes("python scripts/guardrails/connected-workflow-dossier-guard.py"));
  assert.ok(wfText.includes("node scripts/guardrails/trust-gate.mjs"));

  // Job 2: halftime-live-2h-resimulator (Rules H1, H2, H3)
  assert.match(wfText, /^\s*halftime-live-2h-resimulator:/m);
  assert.ok(wfText.includes("python scripts/ops/run_halftime_live_simulator.py"));
  assert.ok(wfText.includes("H1") && wfText.includes("H2") && wfText.includes("H3"));

  // Job 3: overnight-corpus-and-mind-shift
  assert.match(wfText, /^\s*overnight-corpus-and-mind-shift:/m);
  assert.ok(
    wfText.includes(
      "python scripts/ops/run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py --dry-run",
    ),
  );
});

test("Workstream 6: Turborepo caching configs and non-destructive package.json scripts", () => {
  const rootTurboPath = resolve(REPO_ROOT, "turbo.json");
  const webTurboPath = resolve(REPO_ROOT, "apps/web/turbo.json");
  const pkgPath = resolve(REPO_ROOT, "package.json");
  const gitignorePath = resolve(REPO_ROOT, ".gitignore");

  assert.ok(existsSync(rootTurboPath), "Root turbo.json must exist");
  assert.ok(existsSync(webTurboPath), "apps/web/turbo.json must exist");

  const rootTurbo = JSON.parse(readFileSync(rootTurboPath, "utf8"));
  assert.deepEqual(rootTurbo.globalDependencies, [".env", ".env.local", "tsconfig.json"]);
  assert.deepEqual(rootTurbo.globalEnv, [
    "NODE_ENV",
    "VERCEL_URL",
    "CI",
    "SKIP_ENV_VALIDATION",
    "CALIBRATION_ADJUSTMENTS_ENABLED",
  ]);

  const pipeline = rootTurbo.pipeline;
  assert.ok(pipeline, "Root turbo.json must define pipeline");
  for (const task of [
    "build",
    "test",
    "lint",
    "typecheck",
    "db:generate",
    "db:migrate",
    "guardrails",
    "dev",
    "clean",
  ]) {
    assert.ok(task in pipeline, `Missing '${task}' in root turbo.json pipeline`);
  }
  assert.equal(pipeline.dev.cache, false);
  assert.equal(pipeline.dev.persistent, true);
  assert.equal(pipeline.clean.cache, false);

  const webTurbo = JSON.parse(readFileSync(webTurboPath, "utf8"));
  assert.deepEqual(webTurbo.extends, ["//"]);
  assert.deepEqual(webTurbo.pipeline.build.outputs, [".next/**", "!.next/cache/**"]);

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  assert.ok(
    pkg.workspaces.includes("!apps/mobile"),
    "CRITICAL: '!apps/mobile' workspace exclusion must remain intact",
  );
  assert.equal(pkg.scripts["turbo:build"], "turbo build");
  assert.equal(pkg.scripts["turbo:test"], "turbo test");
  assert.equal(pkg.scripts["turbo:typecheck"], "turbo typecheck");
  assert.equal(pkg.scripts["turbo:lint"], "turbo lint");
  assert.equal(pkg.scripts["turbo:affected:test"], "turbo test --filter=...[origin/main]");
  assert.equal(pkg.scripts["turbo:affected:build"], "turbo build --filter=...[origin/main]");

  const gitignore = readFileSync(gitignorePath, "utf8");
  assert.match(gitignore, /^\.turbo$/m);
});
