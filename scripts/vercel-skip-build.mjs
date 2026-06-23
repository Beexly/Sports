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

/** Refs we always build: production + the active development trunk. */
export const TRUNK_BRANCHES = ["main", "claude/sweet-fermi-sk9gws"];

/** A push touching any of these should build. */
const BUILD_PATH_PREFIXES = ["apps/web/", "packages/", "workers/"];
const BUILD_PATH_EXACT = ["package.json", "package-lock.json", "vercel.json"];

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

/** Changed files vs the parent commit. Returns null when it can't be determined. */
function changedFilesFromGit() {
  try {
    const out = execSync("git diff --name-only HEAD^ HEAD", { encoding: "utf8" });
    return out.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return null; // first commit / git unavailable → build to be safe
  }
}

// Run as a script (not when imported by the test).
if (import.meta.url === `file://${process.argv[1]}`) {
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
  const changedFiles = changedFilesFromGit();
  const build = changedFiles === null ? true : shouldBuild({ branch, changedFiles });
  if (build) {
    console.log(`[vercel-skip-build] BUILD (ref=${branch || "?"})`);
    process.exit(1); // proceed
  } else {
    console.log(`[vercel-skip-build] SKIP (ref=${branch || "?"} — no deploy-relevant changes)`);
    process.exit(0); // skip
  }
}
