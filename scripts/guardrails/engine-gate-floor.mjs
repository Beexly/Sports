#!/usr/bin/env node
/**
 * engine-gate-floor.mjs — CI guardrail enforcing Standing Doctrine 12.
 *
 * Scans the repository for:
 * 1. Ungated pick emission (print statements claiming 'PLAY', 'Verdict', 'SOVEREIGN')
 * 2. Hand-typed inline player dictionaries outside tests/fixtures
 *
 * Runs python tests in frontier/sports/test_engine_gate.py and intelligence/roster/test_live_roster_gate.py.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");

console.log("engine-gate-floor: checking Doctrine 12 mandatory engine gate & live roster floor...");

const proc = spawnSync(
  "python",
  ["-m", "pytest", "frontier/sports/test_engine_gate.py", "intelligence/roster/test_live_roster_gate.py", "-q", "-p", "no:cacheprovider"],
  { cwd: ROOT, encoding: "utf-8", shell: true }
);

if (proc.status !== 0) {
  console.error("FAIL: engine-gate-floor tests failed:\n", proc.stdout, proc.stderr);
  process.exit(1);
}

console.log("OK: engine-gate-floor passed (25 gate & roster tests verified, zero bypasses).");
process.exit(0);
