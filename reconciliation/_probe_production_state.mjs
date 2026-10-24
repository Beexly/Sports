#!/usr/bin/env node
/**
 * WHAT IS ACTUALLY ON PRODUCTION?
 *
 * The plan's Step 6 says to deploy the literature schema to the
 * production Neon `main` branch. Before writing a migration to a
 * production database, MEASURE what is there. This is a READ-ONLY
 * probe: it connects, lists the extensions and the `lit` schema's
 * tables, counts the class-A rows, and reports.
 *
 * It writes NOTHING. Not the schema, not a row, not a migration.
 * Applying the schema to production is a deployment decision with
 * live-data consequences, and the point of this probe is to produce
 * the facts that decision needs.
 *
 * Run with LIT_BRANCH=main to probe production, or with the dev
 * branch name to probe the dev branch.
 *
 * Reproduce: node reconciliation/_probe_production_state.mjs
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { Client } = require(resolve(root, "node_modules/pg"));

const PROJECT = "summer-brook-99380762";
const BRANCH = process.env.LIT_BRANCH || "main";
const ROLE = process.env.LIT_ROLE || "neondb_owner";

function neon(args) {
  return execSync(`neonctl ${args}`, { encoding: "utf8", cwd: root }).trim();
}
function connString(branch, role) {
  return neon(`connection-string ${branch} --project-id ${PROJECT} --role-name ${role}`)
    .replace(/"/g, "")
    .trim();
}

console.log(`=== PRODUCTION PROBE: ${PROJECT} / branch ${BRANCH} / role ${ROLE} ===`);
console.log("    (READ-ONLY: this script issues no DDL and no DML)\n");

let c;
try {
  c = new Client({ connectionString: connString(BRANCH, ROLE) });
  await c.connect();
} catch (e) {
  console.log("  CANNOT CONNECT:", e instanceof Error ? e.message : String(e));
  console.log("  The state of production is therefore UNMEASURED, not empty.");
  process.exit(0);
}

try {
  // ---- 1. extensions ----
  const ext = await c.query(
    "SELECT extname, extversion FROM pg_extension ORDER BY extname",
  );
  console.log("=== 1. EXTENSIONS ===");
  for (const r of ext.rows) console.log(`  ${r.extname}  ${r.extversion}`);
  const hasVector = ext.rows.some((r) => r.extname === "vector");
  console.log(`  pgvector present: ${hasVector ? "YES" : "NO"}`);
  console.log(
    `  HNSW needs pgvector. Without it the HNSW index cannot be created.`,
  );

  // ---- 2. schemas ----
  const schemas = await c.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema' ORDER BY 1",
  );
  console.log("\n=== 2. SCHEMAS ===");
  for (const r of schemas.rows) console.log(`  ${r.schema_name}`);
  const hasLit = schemas.rows.some((r) => r.schema_name === "lit");
  console.log(`  the 'lit' schema exists: ${hasLit ? "YES" : "NO"}`);

  // ---- 3. the lit tables ----
  if (hasLit) {
    const tables = await c.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'lit' ORDER BY table_name`,
    );
    console.log("\n=== 3. THE lit TABLES ===");
    for (const r of tables.rows) console.log(`  lit.${r.table_name}`);

    // ---- 4. the class distribution ----
    const hasPremise = tables.rows.some((r) => r.table_name === "premise");
    if (hasPremise) {
      const dist = await c.query(`
        SELECT COALESCE(record_class, '(null)') AS cls,
               COALESCE(status, '(null)')        AS st,
               count(*)::int                      AS n
          FROM lit.premise
         GROUP BY 1, 2
         ORDER BY 3 DESC`);
      console.log("\n=== 4. lit.premise CLASS DISTRIBUTION ===");
      for (const r of dist.rows) {
        console.log(`  ${String(r.n).padStart(7)}  ${r.cls} / ${r.st}`);
      }
      const total = dist.rows.reduce((s, r) => s + r.n, 0);
      const classA = dist.rows
        .filter((r) => r.cls === "CITABLE_VERIFIED" && r.st === "ACTIVE")
        .reduce((s, r) => s + r.n, 0);
      console.log(`  ${String(total).padStart(7)}  TOTAL`);
      console.log(
        `  ${String(classA).padStart(7)}  CITABLE_VERIFIED / ACTIVE  (${((classA / Math.max(total, 1)) * 100).toFixed(1)}%)`,
      );
    }

    // ---- 5. the HNSW index ----
    const idx = await c.query(`
      SELECT indexname, indexdef FROM pg_indexes
       WHERE schemaname = 'lit' AND indexdef ILIKE '%hnsw%'
       ORDER BY indexname`);
    console.log("\n=== 5. HNSW INDEXES ===");
    if (idx.rows.length === 0) {
      console.log("  (none)");
    } else {
      for (const r of idx.rows) {
        console.log(`  ${r.indexname}`);
        console.log(`    ${r.indexdef}`);
      }
    }

    // ---- 6. the read view ----
    const views = await c.query(
      "SELECT table_name FROM information_schema.views WHERE table_schema = 'lit' ORDER BY 1",
    );
    console.log("\n=== 6. THE lit VIEWS ===");
    if (views.rows.length === 0) console.log("  (none)");
    for (const r of views.rows) console.log(`  lit.${r.table_name}`);
  } else {
    console.log("\n=== 3-6. SKIPPED: there is no 'lit' schema on this branch ===");
  }
} catch (e) {
  console.log("\n  QUERY FAILED:", e instanceof Error ? e.message : String(e));
} finally {
  await c.end();
}
