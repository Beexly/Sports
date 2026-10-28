#!/usr/bin/env node
/**
 * Alignment guardrail — stops the engine surface diverging across parallel
 * sessions.
 *
 * Why: between 2026-10-20 and 2026-10-28 thirteen sessions worked this repo
 * concurrently. Two of them built complete, parallel implementations of the
 * same seven metrics with incompatible signatures and neither noticed, because
 * nothing in the repo required a session to read what the last one decided.
 * `docs/strategy/AGENT-ALIGNMENT.md` is the shared record; this hook is what
 * makes it load-bearing instead of advisory.
 *
 * Modes:
 *   - no args  → pre-commit. Fails when a commit stages a guarded path without
 *                also staging AGENT-ALIGNMENT.md.
 *   - --check  → session-start / CI. Never fails; reports whether the record is
 *                older than the newest commit to a guarded path.
 *
 * Bypass for a genuine no-op (rename, comment-only, formatting):
 *   GSE_ALIGN_SKIP=1 git commit ...      (or `git commit --no-verify`)
 *
 * The bypass is deliberately cheap. The point is not to force a doc edit on
 * every touch — it is to force the question.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const RECORD = "docs/strategy/AGENT-ALIGNMENT.md";

// The surfaces where parallel work actually collided. Anything that changes
// how the engine reasons belongs here; tooling and docs do not.
const GUARDED = [
  "packages/prediction-engine/src/metrics/",
  "packages/prediction-engine/src/public-baseline/",
  "packages/prediction-engine/src/markov-simulator.ts",
  "packages/prediction-engine/src/coach-sim/locked-projection.ts",
  "packages/prediction-engine/src/coach-sim/sinkhorn-targets.ts",
];

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? r.stdout.trim() : null;
}

function stagedFiles() {
  // ACMR: a rename carries content and must not dodge the guard.
  const out = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  return out ? out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
}

function isGuarded(path) {
  return GUARDED.some((g) => (g.endsWith("/") ? path.startsWith(g) : path === g));
}

/** Unix seconds of the newest commit touching `path`, or 0 when never touched. */
function lastTouched(path) {
  const out = git(["log", "-1", "--format=%ct", "--", path]);
  return out ? Number(out) || 0 : 0;
}

function human(sec) {
  if (!sec) return "never";
  return new Date(sec * 1000).toISOString().slice(0, 19).replace("T", " ");
}

function check() {
  const recordAt = lastTouched(RECORD);
  const guardedAt = Math.max(...GUARDED.map(lastTouched));
  if (!recordAt) {
    console.log(`[alignment-guard] WARN - ${RECORD} does not exist. Create it before engine work.`);
    return 0;
  }
  if (guardedAt > recordAt) {
    console.log(
      `[alignment-guard] STALE - the engine surface moved (${human(guardedAt)}) after the ` +
        `alignment record (${human(recordAt)}).\n` +
        `  Read ${RECORD} before touching this code, and update it in the same commit.`
    );
    return 0;
  }
  console.log(`[alignment-guard] OK - record (${human(recordAt)}) is current.`);
  return 0;
}

function preCommit() {
  if (process.env.GSE_ALIGN_SKIP) {
    console.log("[alignment-guard] skipped via GSE_ALIGN_SKIP.");
    return 0;
  }
  const staged = stagedFiles();
  const guarded = staged.filter(isGuarded);
  if (guarded.length === 0) return 0;

  if (staged.includes(RECORD)) {
    console.log(`[alignment-guard] OK - ${guarded.length} guarded path(s) staged with the record.`);
    return 0;
  }

  console.error(`[alignment-guard] FAIL - this commit changes ${guarded.length} guarded path(s) ` +
    `but does not stage ${RECORD}:`);
  for (const g of guarded.slice(0, 12)) console.error(`    ${g}`);
  if (guarded.length > 12) console.error(`    ... and ${guarded.length - 12} more`);
  console.error(
    "\nParallel sessions read that file to know what was already decided. Update it — even one\n" +
      "line saying what changed and why — or, for a genuine no-op:\n" +
      "    GSE_ALIGN_SKIP=1 git commit ...\n"
  );
  return 1;
}

process.exit(process.argv.includes("--check") ? check() : preCommit());
