#!/usr/bin/env node
/**
 * Self-test for scripts/ops/check-agent-ledger.mjs.
 *
 * Spawns the ledger guard against two fixture ledgers written to a temp dir:
 *   1. A good ledger → guard must exit 0
 *   2. A bad ledger (DONE row with Evidence "—") → guard must exit 1
 *
 * Exit codes are read from the spawn result object (err.status), never from
 * stdout text. This file uses only Node stdlib and execFileSync so it cannot
 * silently mask a failure.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = resolve(REPO_ROOT, "scripts/ops/check-agent-ledger.mjs");
const BEGIN = "<!-- LEDGER:BEGIN -->";
const END = "<!-- LEDGER:END -->";

function makeLedger(rows) {
  return [
    "# Agent ledger",
    "",
    "## Ledger",
    "",
    BEGIN,
    "",
    "| ID | Title | Owner | Status | Evidence |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    END,
    "",
  ].join("\n");
}

function goodLedger() {
  return makeLedger([
    "| T-GOOD | Good task | hermes | DONE | #123 |",
    "| T-OPEN | Still in progress | claude | CLAIMED | — |",
  ]);
}

function badLedger() {
  return makeLedger([
    "| T-BAD | Done without evidence | hermes | DONE | — |",
  ]);
}

function spawnGuard(path) {
  try {
    execFileSync("node", [SCRIPT, path], { stdio: "pipe", cwd: REPO_ROOT });
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
}

const dir = mkdtempSync(join(tmpdir(), "ledger-selftest-"));
let failures = 0;

try {
  const goodPath = join(dir, "good.md");
  const badPath = join(dir, "bad.md");
  writeFileSync(goodPath, goodLedger());
  writeFileSync(badPath, badLedger());

  if (!existsSync(goodPath)) {
    console.error("[ledger-selftest] FAIL — good fixture was not written");
    process.exit(1);
  }

  const goodExit = spawnGuard(goodPath);
  if (goodExit !== 0) {
    console.error(`[ledger-selftest] FAIL — good ledger exited ${goodExit}, expected 0`);
    failures++;
  } else {
    console.log("[ledger-selftest] good ledger → exit 0");
  }

  const badExit = spawnGuard(badPath);
  if (badExit !== 1) {
    console.error(`[ledger-selftest] FAIL — bad ledger exited ${badExit}, expected 1`);
    failures++;
  } else {
    console.log("[ledger-selftest] bad ledger → exit 1");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`[ledger-selftest] FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("[ledger-selftest] OK — all assertions passed");
