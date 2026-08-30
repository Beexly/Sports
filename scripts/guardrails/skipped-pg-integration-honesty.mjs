#!/usr/bin/env node
/**
 * Skipped-green honesty for money-adjacent Postgres integration suites.
 *
 * Problem: suites gated on AI_CLAIM_PG_URL / SLATE_OPENING_PG_URL (etc.) use
 * `describe.skip` / `describe.skipIf` when the env var is unset. CI without
 * disposable Postgres reports them green while the load-bearing concurrency
 * or query proofs never ran.
 *
 * This guard does NOT fail CI for the skip itself (DB-less PR CI is intentional).
 * It fails when a known gated suite is deleted, loses its env gate, or loses
 * skip semantics — silent disappearance of a money-path proof.
 *
 * Set GSE_REQUIRE_PG_INTEGRATION=1 to fail when any inventoried suite would skip
 * (use on a dedicated integration job that provisions disposable Postgres).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());

const GATED_SUITES = [
  {
    path: "apps/web/__tests__/ai-control-plane-claim-pg.test.ts",
    envVar: "AI_CLAIM_PG_URL",
  },
  {
    path: "packages/ingestion-pipeline/src/__tests__/slate-opening-reader.integration.test.ts",
    envVar: "SLATE_OPENING_PG_URL",
  },
];

let failed = false;
const warnings = [];

function hasGate(src, envVar) {
  if (!src.includes(envVar)) return false;
  return (
    /describe\.skipIf\s*\(/.test(src) ||
    /describe\.skip\b/.test(src) ||
    /const suite = .*\? describe : describe\.skip/.test(src) ||
    /suite = .*\? describe : describe\.skip/.test(src) ||
    src.includes("without it the whole suite is skipped")
  );
}

for (const suite of GATED_SUITES) {
  const abs = resolve(ROOT, suite.path);
  if (!existsSync(abs)) {
    console.error(`FAIL: gated PG suite missing: ${suite.path}`);
    failed = true;
    continue;
  }
  const src = readFileSync(abs, "utf8");
  if (!hasGate(src, suite.envVar)) {
    console.error(
      `FAIL: ${suite.path} must gate on ${suite.envVar} with describe.skip / skipIf ` +
        `(or documented skip) so DB-less CI cannot false-green the money path`,
    );
    failed = true;
    continue;
  }

  const set = Boolean(process.env[suite.envVar]?.trim());
  if (!set) {
    warnings.push(
      `SKIPPED-GREEN: ${suite.path} did not run — ${suite.envVar} unset. ` +
        `Money-path proof not exercised this run.`,
    );
  } else {
    console.log(`OK: ${suite.envVar} set — ${suite.path} eligible to run`);
  }
}

for (const w of warnings) {
  console.warn(w);
}

if (failed) {
  process.exit(1);
}

if (process.env.GSE_REQUIRE_PG_INTEGRATION === "1" && warnings.length > 0) {
  console.error(
    "GSE_REQUIRE_PG_INTEGRATION=1 but one or more PG integration suites would skip — refusing green.",
  );
  process.exit(2);
}

console.log(
  `skipped-pg-integration-honesty: inventory ok (${GATED_SUITES.length} suites); ` +
    `${warnings.length} skipped-green warning(s).`,
);
process.exit(0);
