#!/usr/bin/env node
/**
 * AI Council DESTROY pass on LIVE_PRODUCT_CORPUS — ship-block CRITICAL/HIGH fail CI.
 * Pure TS package; run via vitest suite + this entry for explicit exit code.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function buildChildEnv() {
  const nodePaths = [];
  if (process.env.NODE_PATH) {
    for (const p of process.env.NODE_PATH.split(path.delimiter)) {
      if (p) nodePaths.push(p);
    }
  }
  const rootNodeModules = path.join(root, "node_modules");
  if (existsSync(rootNodeModules)) nodePaths.push(rootNodeModules);
  const npxRoot = path.join(homedir(), ".npm", "_npx");
  try {
    for (const entry of readdirSync(npxRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const nm = path.join(npxRoot, entry.name, "node_modules");
        if (existsSync(nm)) nodePaths.push(nm);
      }
    }
  } catch {
    // Ignore missing ~/.npm/_npx directory.
  }
  return {
    ...process.env,
    NODE_PATH: nodePaths.join(path.delimiter),
  };
}

const childEnv = buildChildEnv();
const r = spawnSync(
  "npx",
  ["vitest", "run", "--config", "packages/ai-council/vitest.config.ts"],
  { cwd: root, env: childEnv, stdio: "inherit", shell: process.platform === "win32" },
);
// Fallback without config
if (r.status === 1 || r.error) {
  const r2 = spawnSync(
    "npx",
    ["vitest", "run", "packages/ai-council"],
    { cwd: path.join(root, "packages/ai-council"), env: childEnv, stdio: "inherit", shell: process.platform === "win32" },
  );
  process.exit(r2.status ?? 1);
}
process.exit(r.status ?? 1);
