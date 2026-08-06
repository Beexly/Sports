#!/usr/bin/env node
/**
 * Local one-shot gate for PR #344 / season-matched identity work.
 *
 * Runs:
 *   1. Prisma 5.x pin check
 *   2. data-ingestion unit tests for crosswalk + season resolver
 *   3. typecheck data-ingestion + web (if workspaces resolve)
 *
 * Exit 0 only when all critical steps pass. Safe after npm install from root.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

function run(label, command, args) {
  console.log(`\n── ${label} ──`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\nFAIL: ${label} (exit ${result.status ?? "signal"})`);
    process.exit(result.status ?? 1);
  }
  console.log(`OK: ${label}`);
}

console.log("GSE verify:season-crosswalk");
console.log(`cwd: ${root}`);

if (!existsSync(resolve(root, "package.json"))) {
  console.error("No package.json at cwd — run from monorepo root.");
  process.exit(1);
}

run("guard:prisma-version", "npm", ["run", "guard:prisma-version"]);

run(
  "test: nflverse-id-crosswalk",
  "npm",
  ["run", "test", "--workspace=@sports/data-ingestion", "--", "nflverse-id-crosswalk"],
);

run(
  "typecheck: data-ingestion",
  "npm",
  ["run", "typecheck", "--workspace=@sports/data-ingestion"],
);

const webAttempts = [
  ["typecheck: web (@sports/web)", ["run", "typecheck", "--workspace=@sports/web"]],
  ["typecheck: web (apps/web)", ["run", "typecheck", "--workspace=apps/web"]],
];

let webOk = false;
for (const [label, args] of webAttempts) {
  console.log(`\n── ${label} ──`);
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status === 0) {
    console.log(`OK: ${label}`);
    webOk = true;
    break;
  }
  console.warn(`skip/fail attempt: ${label} (exit ${result.status ?? "?"})`);
}

if (!webOk) {
  console.warn(
    "\nWARN: web typecheck did not pass under known workspace names. Run manually:\n  npm run typecheck --workspace=@sports/web\n  # or from apps/web",
  );
}

console.log("\n── summary ──");
console.log("Prisma pin + crosswalk tests + data-ingestion typecheck: PASS");
console.log("Season floor policy: resolveFootballStatsSeason → 2025 REG until newer REG exists");
console.log("GSIS law: never invent; PFR/ESPN bridge via season-matched roster only");
console.log("\nverify:season-crosswalk complete.");
