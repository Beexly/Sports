#!/usr/bin/env node
/**
 * Cross-platform `next dev` launcher for @sports/web (Windows + POSIX).
 *
 * Sets NODE_OPTIONS="--max-old-space-size=8192" and GSE_SKIP_DEV_BOOT_INGEST="1"
 * programmatically before spawning Next.js so `npm run dev` boots cleanly on
 * Windows cmd.exe/PowerShell and Linux without POSIX shell env-prefix syntax
 * errors or slow startup nflverse downloads.
 */

import { spawnSync } from "node:child_process";
import { statfsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const webDir = path.resolve(repoRoot, "apps/web");
const requireFromWeb = createRequire(pathToFileURL(path.resolve(webDir, "package.json")).href);
const nextBin = requireFromWeb.resolve("next/dist/bin/next");

try {
  const stats = statfsSync(webDir);
  const freeGb = (Number(stats.bavail) * Number(stats.bsize)) / (1024 * 1024 * 1024);
  if (Number.isFinite(freeGb) && freeGb < 10) {
    process.stdout.write(
      `[dev-web] Low disk detected (${freeGb.toFixed(2)} GB free). Webpack persistent cache disabled automatically; run node scripts/ops/rclone-r2-offload.mjs to reclaim space.\n`,
    );
  }
} catch {
  // Ignore statfs unavailability.
}

const existingNodeOpts = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
const nodeOptions = existingNodeOpts.includes("--max-old-space-size")
  ? process.env.NODE_OPTIONS
  : `${existingNodeOpts}--max-old-space-size=8192`.trim();

const passthroughArgs = process.argv.slice(2);
const args = [nextBin, "dev", ...passthroughArgs];

const result = spawnSync(process.execPath, args, {
  cwd: webDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION ?? "true",
    GSE_SKIP_DEV_BOOT_INGEST: process.env.GSE_SKIP_DEV_BOOT_INGEST ?? "1",
    NODE_OPTIONS: nodeOptions,
  },
});

if (result.error) {
  process.stderr.write(`[dev-web] Failed to launch Next.js dev server: ${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
