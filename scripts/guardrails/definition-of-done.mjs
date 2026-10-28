#!/usr/bin/env node
/**
 * Definition-of-done gate.
 *
 * Why: this repo had 13 parallel sessions, a duplicated metrics module, a working tree that ran
 * stale code for hours, and a review that reported two criticals which were artifacts of its own
 * redacted view. None of that was a coding failure — it was the absence of a checkable "done".
 *
 * A task is done when all of these hold. Each is mechanical, so it cannot be argued with:
 *
 *   1. The tree is not behind origin.          (split-brain check)
 *   2. Tests pass for the packages touched.    (evidence, not assertion)
 *   3. The alignment record is staged or current. (the existing guard)
 *   4. A handoff line exists for the next reader. (no orphaned work)
 *
 * Modes:
 *   --check          report each condition, never fail (session start / CI)
 *   (no args)        pre-commit: fail on 1, 3 and 4
 *
 * Bypass: GSE_DOD_SKIP=1
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const RECORD = "docs/strategy/AGENT-ALIGNMENT.md";
const HANDOFF = "docs/strategy/HANDOFF.md";

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? r.stdout.trim() : null;
}

const results = [];
const add = (ok, name, detail) => results.push({ ok, name, detail });

function checkBehind() {
  git(["fetch", "-q", "origin"]);
  const head = git(["rev-parse", "HEAD"]);
  const upstream = git(["rev-parse", "@{u}"]) ?? git(["rev-parse", "origin/HEAD"]);
  if (!head || !upstream) return add(true, "not behind origin", "no upstream resolvable");
  const behind = git(["rev-list", "--count", `${head}..${upstream}`]);
  const n = Number(behind ?? 0);
  add(n === 0, "not behind origin", n === 0 ? "HEAD == upstream" : `${n} commit(s) behind — pull first`);
}

function checkRecord() {
  const staged = (git(["diff", "--cached", "--name-only"]) ?? "").split(/\r?\n/);
  const guarded = staged.filter((p) =>
    /^(packages\/prediction-engine\/src\/(metrics|public-baseline)\/|packages\/prediction-engine\/src\/(markov-simulator|coach-sim\/locked-projection|coach-sim\/sinkhorn-targets)\.ts)/.test(p),
  );
  if (guarded.length === 0) return add(true, "alignment record", "no guarded path staged");
  add(staged.includes(RECORD), "alignment record", staged.includes(RECORD) ? "staged" : "guarded path staged without the record");
}

function checkHandoff() {
  if (!existsSync(resolve(ROOT, HANDOFF))) {
    return add(false, "handoff line", `${HANDOFF} missing — the next reader has nothing`);
  }
  const body = readFileSync(resolve(ROOT, HANDOFF), "utf8");
  const today = new Date().toISOString().slice(0, 10);
  add(body.includes(today), "handoff line", body.includes(today) ? `entry for ${today}` : `no entry for ${today}`);
}

function checkTests() {
  const staged = (git(["diff", "--cached", "--name-only"]) ?? "").split(/\r?\n/).filter(Boolean);
  const pkgs = new Set();
  for (const p of staged) {
    const m = /^packages\/([^/]+)\//.exec(p);
    if (m) pkgs.add(m[1]);
  }
  if (pkgs.size === 0) return add(true, "tests", "no package touched");
  // Presence of a test file next to the change is the cheap proxy; the suite itself is run by
  // the caller, which is where the real evidence lives.
  const hasTests = staged.some((p) => /\.test\.ts$/.test(p));
  add(hasTests, "tests", hasTests ? "test file staged alongside" : `package(s) ${[...pkgs].join(",")} touched with no test change`);
}

function report() {
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name} — ${r.detail}`);
  }
  return results.every((r) => r.ok) ? 0 : 1;
}

checkBehind();
checkRecord();
checkHandoff();
checkTests();

if (process.argv.includes("--check")) {
  console.log("[dod] status:");
  report();
  process.exit(0);
}

if (process.env.GSE_DOD_SKIP) {
  console.log("[dod] skipped via GSE_DOD_SKIP.");
  process.exit(0);
}

const code = report();
if (code !== 0) {
  console.error("\n[dod] not done. Fix the FAILs above, or GSE_DOD_SKIP=1 for a genuine no-op.\n");
}
process.exit(code);
