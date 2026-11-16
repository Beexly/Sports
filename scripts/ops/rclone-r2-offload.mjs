#!/usr/bin/env node
/**
 * Cross-platform cold-artifact archive (rclone -> Cloudflare R2) & safe
 * worktree/cache audit helper for C:\ drive headroom recovery.
 *
 * Defaults to DRY-RUN. Pass `--apply` to delete ONLY disposable build caches
 * and verified-synced artifacts, or `--sync-r2` when `RCLONE_R2_REMOTE` is set.
 * Never activates paid AWS resources or touches source/env/db files.
 */

import { execFileSync } from "node:child_process";
import { existsSync, rmSync, statfsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const syncR2 = args.has("--sync-r2");

function getFreeGb(targetPath) {
  try {
    const s = statfsSync(targetPath);
    return (Number(s.bavail) * Number(s.bsize)) / (1024 * 1024 * 1024);
  } catch {
    return null;
  }
}

function listMergedWorktrees() {
  try {
    const raw = execFileSync("git", ["worktree", "list", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const entries = raw
      .split(/\r?\n\r?\n/)
      .map((block) => {
        const lines = block.split(/\r?\n/);
        const wt = lines.find((l) => l.startsWith("worktree "))?.slice(9) ?? "";
        const head = lines.find((l) => l.startsWith("HEAD "))?.slice(5) ?? "";
        const branch = lines.find((l) => l.startsWith("branch "))?.slice(7) ?? "detached";
        return { worktree: wt, head, branch };
      })
      .filter((e) => e.worktree && path.resolve(e.worktree) !== path.resolve(repoRoot));

    return entries.map((entry) => {
      let mergedToOriginMain = false;
      try {
        if (entry.head) {
          execFileSync("git", ["merge-base", "--is-ancestor", entry.head, "origin/main"], {
            cwd: repoRoot,
            stdio: "ignore",
          });
          mergedToOriginMain = true;
        }
      } catch {
        mergedToOriginMain = false;
      }
      return { ...entry, mergedToOriginMain };
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const DISPOSABLE_CACHE_PATHS = [
  "apps/web/.next/cache",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
];

function main() {
  const beforeGb = getFreeGb(repoRoot);
  const worktrees = listMergedWorktrees();
  const coldFoundryDir = path.resolve(repoRoot, "foundry/artifacts");
  const rcloneRemote = (process.env.RCLONE_R2_REMOTE ?? "").trim();

  let r2SyncStatus = "skipped (set RCLONE_R2_REMOTE and pass --sync-r2 to offload cold artifacts)";
  if (syncR2 && rcloneRemote && existsSync(coldFoundryDir)) {
    try {
      execFileSync(
        "rclone",
        ["sync", coldFoundryDir, `${rcloneRemote}/foundry/artifacts`, "--checksum", "--fast-list"],
        { stdio: "inherit" },
      );
      r2SyncStatus = "synced_verified";
    } catch (err) {
      r2SyncStatus = `rclone_failed: ${err instanceof Error ? err.message : String(err)}`;
      process.exitCode = 1;
    }
  }

  const cacheActions = [];
  for (const relPath of DISPOSABLE_CACHE_PATHS) {
    const absPath = path.resolve(repoRoot, relPath);
    if (!existsSync(absPath)) continue;
    if (apply) {
      rmSync(absPath, { recursive: true, force: true });
      cacheActions.push({ path: relPath, action: "deleted" });
    } else {
      cacheActions.push({ path: relPath, action: "would_delete_with_--apply" });
    }
  }

  const afterGb = getFreeGb(repoRoot);
  const summary = {
    mode: apply ? "apply" : "dry-run",
    freeGbBefore: beforeGb !== null ? Number(beforeGb.toFixed(2)) : null,
    freeGbAfter: afterGb !== null ? Number(afterGb.toFixed(2)) : null,
    r2SyncStatus,
    cacheActions,
    secondaryWorktrees: worktrees,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
