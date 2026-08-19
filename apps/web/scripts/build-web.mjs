#!/usr/bin/env node
/**
 * Cross-platform `next build` launcher.
 *
 * The previous script form (`NODE_OPTIONS='--max-old-space-size=8192' next
 * build`) is POSIX shell syntax — it fails on Windows cmd.exe ("'NODE_OPTIONS'
 * is not recognized as an internal or external command"), which made
 * `npm run build` un-runnable for Windows checkout users and CI-on-Windows.
 *
 * This launcher sets NODE_OPTIONS programmatically and spawns the real Next
 * binary through Node, so it works identically on POSIX and Windows with zero
 * new dependencies. The memory cap (8GB) matches the previous intent: large
 * App-Router builds can exceed Node's default old-space limit.
 *
 *   npm run build   (in apps/web)
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=8192",
  },
});

if (result.error) {
  process.stderr.write(`[build-web] failed to launch next: ${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
