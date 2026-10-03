#!/usr/bin/env node
/**
 * Point git at the repo's tracked hooks directory (.githooks) so the
 * BS-040 secret-scan pre-commit hook is active without a manual step.
 *
 * Invoked by the `prepare` npm script on every install. It MUST never fail
 * the install: any error (no git, CI sandbox, detached env) is swallowed and
 * the process always exits 0.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

try {
  if (!existsSync(".githooks") || !existsSync(".git")) {
    // Not a git work-tree (e.g. published tarball install) — nothing to do.
    process.exit(0);
  }
  const current = spawnSync("git", ["config", "--get", "core.hooksPath"], { encoding: "utf8" });
  const value = (current.stdout || "").trim();
  if (value === ".githooks") {
    process.exit(0); // already set
  }
  const set = spawnSync("git", ["config", "core.hooksPath", ".githooks"], { encoding: "utf8" });
  if (set.status === 0) {
    console.log("[setup-git-hooks] core.hooksPath -> .githooks (secret-scan pre-commit active)");
  }
} catch {
  // never block install
}
process.exit(0);
