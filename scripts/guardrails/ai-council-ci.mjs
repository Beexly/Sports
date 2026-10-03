#!/usr/bin/env node
/**
 * AI Council DESTROY pass on LIVE_PRODUCT_CORPUS — ship-block CRITICAL/HIGH fail CI.
 * Pure TS package; run via vitest suite + this entry for explicit exit code.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const r = spawnSync(
  "npx",
  ["vitest", "run", "--config", "packages/ai-council/vitest.config.ts"],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);
// Fallback without config
if (r.status === 1 || r.error) {
  const r2 = spawnSync(
    "npx",
    ["vitest", "run", "packages/ai-council"],
    { cwd: path.join(root, "packages/ai-council"), stdio: "inherit", shell: process.platform === "win32" },
  );
  process.exit(r2.status ?? 1);
}
process.exit(r.status ?? 1);
