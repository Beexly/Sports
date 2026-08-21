#!/usr/bin/env node
/**
 * overnight-progress — stall detector for the unattended overnight loop.
 *
 * Run this FIRST in every cycle. It answers one question: is the loop still making
 * progress, or is it spinning?
 *
 * An autonomous loop that dies is survivable — the next cycle resumes from committed
 * state. An autonomous loop that SPINS is not: it burns free-tier quota producing
 * nothing, and looks identical to healthy work from the outside. That is the failure
 * this script exists to catch.
 *
 * Progress is defined as: a commit landed on the working branch. Not "the agent said it
 * worked" — a commit. Same principle as the ledger guard: git is the oracle.
 *
 * Exit codes (read them from $?, never from stdout):
 *   0  proceed, the loop is healthy
 *   2  STOP. Cycle cap reached, .stop present, or stalled. Writes .stop on stall.
 *   1  usage/internal error (a broken detector must not read as healthy)
 *
 * Usage: node scripts/ops/overnight-progress.mjs [--queue <path>] [--json]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_QUEUE = "docs/ops/hermes/OVERNIGHT-2026-08-21-QUEUE.md";
const REPORT = "docs/ops/hermes/OVERNIGHT-2026-08-21-REPORT.md";
const STOP_FILE = "handoff/.stop";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Read a `KEY=value` line from the queue header. Missing key is a hard error, not a guess. */
function header(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}=(.*)$`, "m"));
  if (!m) throw new Error(`queue header is missing ${key}=`);
  return m[1].trim();
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

/**
 * Validate a git ref read from the queue file before it reaches `git`.
 *
 * The queue header is agent-writable, so `BRANCH=` is untrusted input. execFileSync with
 * an argv array means there is no shell and therefore no classic command injection — but
 * a value beginning with `-` is still parsed by git as an OPTION rather than a ref, which
 * is argument injection. Anything not matching a conservative ref shape is refused
 * outright rather than sanitized, because a "cleaned" ref that silently points somewhere
 * else is worse than a hard stop.
 */
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}$/;
function assertSafeRef(ref, label) {
  if (!REF_PATTERN.test(ref) || ref.includes("..")) {
    throw new Error(`${label} is not a valid git ref: ${JSON.stringify(ref)}`);
  }
  return ref;
}

function main() {
  // Confine --queue to the repo. It is an operator-supplied path, but this script runs
  // unattended inside a loop, so it should not be able to read arbitrary files if the
  // invocation is ever templated from something less trusted.
  const queuePath = resolve(ROOT, arg("--queue", DEFAULT_QUEUE));
  if (queuePath !== ROOT && !queuePath.startsWith(ROOT + sep)) {
    console.error(`[overnight-progress] FAIL — --queue must be inside the repo: ${queuePath}`);
    return 1;
  }
  if (!existsSync(queuePath)) {
    console.error(`[overnight-progress] FAIL — queue not found: ${queuePath}`);
    return 1;
  }

  const text = readFileSync(queuePath, "utf8");
  const cycle = Number(header(text, "CYCLE"));
  const maxCycles = Number(header(text, "MAX_CYCLES"));
  const stallThreshold = Number(header(text, "STALL_THRESHOLD"));
  const branch = assertSafeRef(header(text, "BRANCH"), "queue header BRANCH");

  if (!Number.isFinite(cycle) || !Number.isFinite(maxCycles) || !Number.isFinite(stallThreshold)) {
    console.error("[overnight-progress] FAIL — non-numeric CYCLE / MAX_CYCLES / STALL_THRESHOLD");
    return 1;
  }

  // Task census straight from the queue text.
  const todo = (text.match(/^### \S+ · TODO/gm) ?? []).length;
  const claimed = (text.match(/^### \S+ · CLAIMED/gm) ?? []).length;
  const done = (text.match(/^### \S+ · DONE/gm) ?? []).length;
  const blocked = (text.match(/^### \S+ · BLOCKED/gm) ?? []).length;

  // Progress = commits on the branch in the recent window. `git log` is the oracle.
  let recentCommits = 0;
  let head = "unknown";
  try {
    head = git(["rev-parse", "--short", "HEAD"]);
    // Count commits authored in the last 90 minutes on this branch.
    // `--` terminates option parsing: defence in depth behind assertSafeRef.
    const out = git(["log", "--since=90.minutes.ago", "--oneline", branch, "--"]);
    recentCommits = out ? out.split("\n").filter(Boolean).length : 0;
  } catch {
    // A branch that does not exist yet is cycle 0, not a stall.
    recentCommits = 0;
  }

  const stopPath = join(ROOT, STOP_FILE);
  const reasons = [];
  let verdict = "PROCEED";
  let code = 0;

  if (existsSync(stopPath)) {
    verdict = "STOP";
    code = 2;
    reasons.push(".stop file present");
  } else if (cycle >= maxCycles) {
    verdict = "STOP";
    code = 2;
    reasons.push(`cycle cap reached (${cycle}/${maxCycles})`);
  } else if (todo === 0 && claimed === 0) {
    verdict = "STOP";
    code = 2;
    reasons.push("no TODO or CLAIMED tasks remain — run standing orders, then stop");
  } else if (cycle >= stallThreshold && recentCommits === 0) {
    // Only a stall AFTER enough cycles have run to expect a commit.
    verdict = "STOP";
    code = 2;
    reasons.push(`STALLED — ${cycle} cycles run, zero commits in the last 90 minutes`);
    try {
      writeFileSync(stopPath, `stalled at cycle ${cycle}\n`);
      appendFileSync(
        resolve(ROOT, REPORT),
        `\n**STALLED** at cycle ${cycle} — zero commits in 90 minutes. Wrote ${STOP_FILE}.\n`,
      );
    } catch {
      /* best effort: never let reporting failure mask the verdict */
    }
  }

  const summary = {
    verdict,
    exit: code,
    cycle,
    maxCycles,
    todo,
    claimed,
    done,
    blocked,
    recentCommits,
    head,
    reasons,
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      `[overnight-progress] ${verdict} — cycle ${cycle}/${maxCycles} · ` +
        `TODO ${todo} · CLAIMED ${claimed} · DONE ${done} · BLOCKED ${blocked} · ` +
        `commits/90m ${recentCommits} · head ${head}`,
    );
    for (const r of reasons) console.log(`  ${r}`);
  }
  // Mirrored to stderr so a redirected stdout cannot hide the verdict.
  console.error(`VERDICT=${verdict} EXIT=${code} CYCLE=${cycle} COMMITS=${recentCommits}`);
  return code;
}

try {
  process.exit(main());
} catch (err) {
  console.error(`[overnight-progress] FAIL — ${err.message}`);
  process.exit(1);
}
