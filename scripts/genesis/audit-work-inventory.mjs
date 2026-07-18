#!/usr/bin/env node
/**
 * Genesis branch/PR reconciliation audit — read-only, deterministic.
 *
 * Per docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md: "The audit script must
 * be read-only. It may use local Git and `gh` when available. It must never
 * merge, close, delete, force-push, deploy, or mutate production."
 *
 * Enumerates every live remote branch (except `main` itself), computes real
 * git metadata for each (head SHA, merge-base with main, ahead/behind
 * counts, last-updated), and cross-references against the ledger this
 * script's sibling files maintain
 * (reports/reconciliation/BRANCH_PR_LEDGER.json). Any branch present in live
 * Git state but absent from the ledger is INVISIBLE WORK — the exact thing
 * the contract exists to prevent — and this script reports it and exits
 * nonzero.
 *
 * The impure edge (shelling out to git) is isolated in `listRemoteBranches`
 * and `branchMetadata`; `classify`, the actual comparison logic, is a pure
 * function of plain data so it is unit-testable without a real git checkout
 * (see audit-work-inventory.test.mjs).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const LEDGER_PATH = resolve(REPO_ROOT, "reports/reconciliation/BRANCH_PR_LEDGER.json");

function git(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

/** Every remote branch except origin/main and the detached-HEAD marker. Impure (shells to git). */
export function listRemoteBranches() {
  return git(["branch", "-r"])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("HEAD") && line !== "origin/main")
    .map((line) => line.replace(/^origin\//, ""));
}

/** Real git metadata for one branch. Impure (shells to git). Never mutates anything. */
export function branchMetadata(branchShortName) {
  const ref = `origin/${branchShortName}`;
  const headSha = git(["rev-parse", ref]);
  const mergeBase = git(["merge-base", "origin/main", ref]);
  const commitsAhead = Number(git(["rev-list", "--count", `origin/main..${ref}`]));
  const commitsBehind = Number(git(["rev-list", "--count", `${ref}..origin/main`]));
  const lastUpdated = git(["log", "-1", "--format=%cI", ref]);
  return { ref: branchShortName, headSha, mergeBaseWithMain: mergeBase, commitsAhead, commitsBehind, lastUpdated };
}

/**
 * Pure classification: cross-reference live branch refs against the ledger's
 * known refs. A branch present live but absent from EITHER ledger section
 * (namedEntries or longTailEntries) is invisible work — the contract's
 * "zero invisible work" invariant violated. This function takes plain data
 * only (no I/O) so it is fully unit-testable with fixtures.
 */
export function classify(liveBranchRefs, ledger) {
  const knownRefs = new Set([
    ...(ledger.namedEntries ?? []).map((e) => e.ref),
    ...(ledger.longTailEntries ?? []).map((e) => e.ref),
  ]);
  const invisible = liveBranchRefs.filter((ref) => !knownRefs.has(ref));
  const stale = [...knownRefs].filter((ref) => !liveBranchRefs.includes(ref));
  return { invisible, stale, knownCount: knownRefs.size, liveCount: liveBranchRefs.length };
}

function main() {
  if (!existsSync(LEDGER_PATH)) {
    console.error(`[audit-work-inventory] FAIL - no ledger found at ${LEDGER_PATH}. Run the reconciliation inventory first.`);
    process.exitCode = 1;
    return;
  }
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  const liveBranches = listRemoteBranches();
  const result = classify(liveBranches, ledger);

  console.log(`[audit-work-inventory] live remote branches (excl. main): ${result.liveCount}`);
  console.log(`[audit-work-inventory] ledger-known refs: ${result.knownCount}`);

  if (result.invisible.length > 0) {
    console.error(`[audit-work-inventory] FAIL - ${result.invisible.length} branch(es) exist in Git but have NO ledger entry (invisible work):`);
    for (const ref of result.invisible) console.error(`  - ${ref}`);
    process.exitCode = 1;
  }
  if (result.stale.length > 0) {
    console.warn(`[audit-work-inventory] WARN - ${result.stale.length} ledger entry(ies) reference a branch that no longer exists live (possibly already deleted/renamed — re-verify, do not assume):`);
    for (const ref of result.stale) console.warn(`  - ${ref}`);
  }
  if (result.invisible.length === 0) {
    console.log("[audit-work-inventory] OK - every live branch has a ledger entry.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
