#!/usr/bin/env node
/**
 * Vercel "Ignored Build Step" gate — stops the deploy-churn cost bleed.
 *
 * Vercel runs this as the `ignoreCommand`. Exit-code contract (Vercel):
 *   exit 1 → PROCEED with the build
 *   exit 0 → SKIP (cancel) the build
 *
 * We BUILD only when the git ref is a trunk we deploy (production `main` + the
 * active development trunk) OR the commit touches deploy-relevant paths. Docs-only
 * pushes and inactive agent branches are skipped — which kills the ~20-builds-in-3hrs
 * preview waste (and the per-preview Neon wake) the cost audit found.
 *
 * The pure `shouldBuild()` is exported + unit-tested; the script wires env + git to it.
 */
import { execSync } from "node:child_process";

/**
 * Refs we always build. Production `main` is always a trunk; the active development
 * trunk is supplied via env (`ACTIVE_TRUNK`, comma-separated) rather than hardcoded —
 * a baked-in branch literal goes stale the moment work moves and silently skips deploys
 * on the new branch. Only `main` is permanent.
 * @param {Record<string,string|undefined>} env
 * @returns {string[]}
 */
export function resolveTrunks(env = process.env) {
  const extra = (env.ACTIVE_TRUNK ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ["main", ...extra];
}

/** Refs we always build, resolved from the environment at load time. */
export const TRUNK_BRANCHES = resolveTrunks();

/** A push touching any of these should build. scripts/deploy/ and this gate
 * itself are deploy-relevant: vercel.json's buildCommand executes the
 * migration gate from scripts/deploy/, and a change to either must not be
 * able to skip its own deploy (adversarial finding O-1.x). */
const BUILD_PATH_PREFIXES = ["apps/web/", "packages/", "workers/", "scripts/deploy/"];
const BUILD_PATH_EXACT = [
  "package.json",
  "package-lock.json",
  "vercel.json",
  "scripts/vercel-skip-build.mjs",
];

/**
 * Pure decision: should Vercel build this commit?
 * @param {{ branch?: string, changedFiles?: string[], trunkBranches?: string[] }} input
 * @returns {boolean}
 */
export function shouldBuild({ branch, changedFiles, trunkBranches = TRUNK_BRANCHES }) {
  if (branch && trunkBranches.includes(branch)) return true;
  return (changedFiles ?? []).some(
    (f) => BUILD_PATH_PREFIXES.some((p) => f.startsWith(p)) || BUILD_PATH_EXACT.includes(f),
  );
}

/**
 * Is HEAD a merge commit? Parsed from `git rev-list --parents -n 1 HEAD`, whose first
 * token is the commit sha and the rest are its parents — 2+ parents means a merge.
 * Merges must force-build: `HEAD^ HEAD` only diffs the FIRST parent, so changes brought
 * in from the merged-in side are invisible and could wrongly skip a needed deploy.
 * @param {string|null} revListParentsLine
 * @returns {boolean}
 */
export function isMergeCommit(revListParentsLine) {
  const parts = (revListParentsLine ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 2; // sha + 2+ parents
}

/**
 * Changed files for THIS deployment decision. Returns null when it can't be
 * determined (→ force-build, fail safe).
 *
 * The diff base is the last DEPLOYED sha (`VERCEL_GIT_PREVIOUS_SHA`) when
 * Vercel supplies it, not `HEAD^` (adversarial finding O-1.x): a push of
 * several commits where only an EARLIER commit touched deploy-relevant paths
 * would otherwise diff just the docs-only tip and skip a needed deploy. If
 * the previous sha is absent or outside the shallow clone, the diff throws
 * and we fall back to HEAD^..HEAD; if that also fails, null → build.
 * @param {Record<string,string|undefined>} env
 */
function changedFilesFromGit(env = process.env) {
  const bases = [];
  const prev = (env.VERCEL_GIT_PREVIOUS_SHA ?? "").trim();
  // Env-sourced value interpolated into a shell command: accept only a hex sha.
  if (/^[0-9a-f]{7,40}$/i.test(prev)) bases.push(prev);
  bases.push("HEAD^");
  for (const base of bases) {
    try {
      const out = execSync(`git diff --name-only ${base} HEAD`, { encoding: "utf8" });
      return out.split("\n").map((l) => l.trim()).filter(Boolean);
    } catch {
      // try the next base
    }
  }
  return null; // first commit / git unavailable → build to be safe
}

/** True when HEAD is a merge commit (force-build). Safe-fails to false. */
function headIsMerge() {
  try {
    return isMergeCommit(execSync("git rev-list --parents -n 1 HEAD", { encoding: "utf8" }));
  } catch {
    return false;
  }
}

// Run as a script (not when imported by the test).
if (import.meta.url === `file://${process.argv[1]}`) {
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
  const changedFiles = changedFilesFromGit();
  // Force-build on merge commits and when the diff can't be determined (fail safe).
  const build = headIsMerge() || changedFiles === null ? true : shouldBuild({ branch, changedFiles });
  if (build) {
    console.log(`[vercel-skip-build] BUILD (ref=${branch || "?"})`);
    process.exit(1); // proceed
  } else {
    console.log(`[vercel-skip-build] SKIP (ref=${branch || "?"} — no deploy-relevant changes)`);
    process.exit(0); // skip
  }
}
