#!/usr/bin/env node
/* Apply the literature schema to the dev branch. DDL needs neondb_owner. */
const { Client } = require("pg");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";

function conn(branch, role) {
  const url = execSync(
    `neonctl connection-string ${branch} --project-id summer-brook-99380762 --role-name ${role}`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url });
}

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, "schema_literature.sql"), "utf8");
  const c = conn(BRANCH, "neondb_owner");
  await c.connect();
  console.log("connected to branch:", BRANCH);
  await c.query(sql);
  console.log("schema applied");

  const t = await c.query(
    `select table_name from information_schema.tables
     where table_schema='lit' order by 1`);
  console.log("lit tables:", t.rows.map((r) => r.table_name).join(", "));

  const ix = await c.query(
    `select indexname, indexdef from pg_indexes
     where schemaname='lit' and indexdef ilike '%hnsw%' order by 1`);
  console.log("\nHNSW indexes:");
  for (const r of ix.rows) console.log("  " + r.indexname);

  const fn = await c.query(
    `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='lit' order by 1`);
  console.log("\nfunctions:", fn.rows.map((r) => r.proname).join(", "));

  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
