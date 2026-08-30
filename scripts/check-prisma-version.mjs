#!/usr/bin/env node
/**
 * Prisma version pin check — packages/db uses Prisma 5.x schema syntax
 * (`url` / `directUrl` on the datasource). Prisma 7 rejects that shape and
 * requires prisma.config.ts. Global/npx Prisma 7 caused false "schema broken"
 * signals from MCP tools; this script fails closed if the resolved CLI is 7+.
 *
 * RUN: node scripts/check-prisma-version.mjs
 * Exit 0 = pin OK; exit 1 = mismatch.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPkgPath = join(root, "packages/db/package.json");
const schemaPath = join(root, "packages/db/prisma/schema.prisma");

if (!existsSync(dbPkgPath) || !existsSync(schemaPath)) {
  console.error("[prisma-version] packages/db package.json or schema.prisma missing");
  process.exit(1);
}

const dbPkg = JSON.parse(readFileSync(dbPkgPath, "utf8"));
const pinned =
  dbPkg.devDependencies?.prisma ||
  dbPkg.dependencies?.prisma ||
  dbPkg.dependencies?.["@prisma/client"];

if (!pinned) {
  console.error("[prisma-version] no prisma pin in packages/db/package.json");
  process.exit(1);
}

const majorMatch = String(pinned).match(/(\d+)/);
const pinnedMajor = majorMatch ? Number(majorMatch[1]) : NaN;

const schema = readFileSync(schemaPath, "utf8");
const usesV5Datasource =
  /datasource\s+db\s*\{[\s\S]*?url\s*=/.test(schema) &&
  /directUrl\s*=/.test(schema);

console.log(`[prisma-version] packages/db pin: ${pinned} (major ${pinnedMajor})`);
console.log(
  `[prisma-version] schema uses Prisma 5-style url/directUrl: ${usesV5Datasource}`,
);

if (usesV5Datasource && pinnedMajor >= 7) {
  console.error(
    "[prisma-version] FAIL: schema is Prisma 5-style but pin is major >= 7",
  );
  process.exit(1);
}

if (usesV5Datasource && pinnedMajor !== 5) {
  console.error(
    `[prisma-version] FAIL: expected prisma major 5 for this schema, got ${pinnedMajor}`,
  );
  process.exit(1);
}

// Resolve installed CLI if present (workspace install).
try {
  const require = createRequire(join(root, "packages/db/package.json"));
  const installed = require("prisma/package.json");
  const installedMajor = Number(String(installed.version).split(".")[0]);
  console.log(`[prisma-version] installed prisma CLI: ${installed.version}`);
  if (usesV5Datasource && installedMajor >= 7) {
    console.error(
      "[prisma-version] FAIL: installed prisma CLI is 7+ against a 5.x schema. Use packages/db's pinned prisma (npm exec --workspace=@sports/db prisma ...), not a global npx prisma@7.",
    );
    process.exit(1);
  }
} catch {
  console.log(
    "[prisma-version] prisma package not installed in this environment (pin check only)",
  );
}

console.log("[prisma-version] OK");
process.exit(0);
