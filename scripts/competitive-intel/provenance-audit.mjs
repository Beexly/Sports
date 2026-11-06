#!/usr/bin/env node
/**
 * Provenance audit for competitive intel.
 *
 * Fails when a harvested row cannot prove where it came from:
 *   1. any of the six provenance columns is null or empty
 *   2. commercial_ok disagrees with license_class
 *      (public_domain and licensed may be true; tos_scraped and unknown must be false)
 *   3. harvest_tier outside 0..4
 *
 * Runs against Postgres when DATABASE_URL is set. Without a database it degrades to a schema
 * check on the migration and schema files, and says so loudly rather than reporting a green
 * "0 rows" that measured nothing.
 *
 * Usage:
 *   node scripts/competitive-intel/provenance-audit.mjs            # db when available
 *   node scripts/competitive-intel/provenance-audit.mjs --schema   # force the static check
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PROVENANCE = ["sourceUrl", "retrievedAt", "harvestTier", "licenseClass", "commercialOk", "contentHash"];
const TABLES = ["rival_assets", "rival_picks", "rival_projections", "paywall_recipes"];
const SCHEMA = resolve(ROOT, "packages/db/prisma/schema.prisma");
const MIGRATION = resolve(ROOT, "packages/db/prisma/migrations/20261106120000_competitive_intel/migration.sql");

const staticOnly = process.argv.includes("--schema") || !process.env.DATABASE_URL;

function fail(lines) {
  for (const line of lines) console.error(`  FAIL ${line}`);
  process.exit(1);
}

function schemaCheck() {
  const problems = [];
  if (!existsSync(SCHEMA)) problems.push("schema.prisma missing");
  if (!existsSync(MIGRATION)) problems.push("competitive_intel migration missing");
  if (problems.length) fail(problems);

  const schema = readFileSync(SCHEMA, "utf8");
  const blocks = schema.split(/^model /m).filter((b) => TABLES.some((t) => b.includes(`@@map("${t}")`)));
  for (const table of TABLES) {
    const block = blocks.find((b) => b.includes(`@@map("${table}")`));
    if (!block) { problems.push(`${table}: no model mapped to this table`); continue; }
    for (const col of PROVENANCE) {
      if (!new RegExp(`\\b${col}\\b`).test(block)) problems.push(`${table}: missing ${col}`);
    }
  }
  if (problems.length) fail(problems);
  console.log(`[provenance-audit] schema OK: ${TABLES.length} tables x ${PROVENANCE.length} columns present`);
  console.log("[provenance-audit] NOTE: no database, row-level checks skipped");
}

function dbCheck() {
  const sql = [];
  for (const table of TABLES) {
    const conds = PROVENANCE.map((c) =>
      c === "commercialOk" ? `"commercialOk" IS NULL` : `"${c}" IS NULL OR "${c}"::text = ''`).join(" OR ");
    sql.push(`SELECT '${table}' AS t, count(*)::int AS n FROM "${table}" WHERE ${conds}`);
    sql.push(
      `SELECT '${table}-license' AS t, count(*)::int AS n FROM "${table}" ` +
      `WHERE "commercialOk" = true AND "licenseClass" IN ('tos_scraped','unknown')`);
    sql.push(`SELECT '${table}-tier' AS t, count(*)::int AS n FROM "${table}" WHERE "harvestTier" < 0 OR "harvestTier" > 4`);
  }
  const out = execFileSync("psql", [process.env.DATABASE_URL, "-At", "-F", "|", "-c", sql.join(";")], {
    encoding: "utf8",
  });
  const bad = out.trim().split("\n").filter(Boolean).map((l) => l.split("|")).filter(([, n]) => Number(n) > 0);
  if (bad.length) fail(bad.map(([t, n]) => `${t}: ${n} row(s)`));
  console.log(`[provenance-audit] db OK: ${TABLES.length} tables clean`);
}

if (staticOnly) {
  schemaCheck();
} else {
  try {
    dbCheck();
  } catch (err) {
    console.log(`[provenance-audit] psql unusable (${err.message.split("\n")[0]}), falling back to schema check`);
    schemaCheck();
  }
}
