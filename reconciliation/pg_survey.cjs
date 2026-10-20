#!/usr/bin/env node
/* Survey the Neon schema for literature/premise/settlement surfaces. Read-only. */
const { Client } = require("pg");
const { execSync } = require("child_process");

function conn(branch, role) {
  const url = execSync(
    `neonctl connection-string --project-id summer-brook-99380762 --branch-name ${branch} --role-name ${role}`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url });
}

(async () => {
  const c = conn("main", "hermes_ro");
  await c.connect();

  console.log("=== TABLES (public + watch) ===");
  const t = await c.query(
    `select table_schema, table_name from information_schema.tables
     where table_schema in ('public','watch') order by 1,2`);
  const bySchema = {};
  for (const r of t.rows) (bySchema[r.table_schema] ||= []).push(r.table_name);
  for (const s of Object.keys(bySchema)) {
    console.log(`\n--- ${s} (${bySchema[s].length}) ---`);
    console.log(bySchema[s].join(", "));
  }

  console.log("\n=== SEARCH: premise/literature/mind/embedding/vector-ish tables ===");
  const k = await c.query(
    `select table_schema, table_name from information_schema.tables
     where table_schema in ('public','watch')
       and (table_name ilike '%prem%' or table_name ilike '%lit%' or table_name ilike '%mind%'
            or table_name ilike '%embed%' or table_name ilike '%vector%' or table_name ilike '%residu%'
            or table_name ilike '%causal%' or table_name ilike '%edge%' or table_name ilike '%settle%'
            or table_name ilike '%pick%' or table_name ilike '%signal%')
     order by 1,2`);
  console.table(k.rows);

  console.log("\n=== ROW COUNTS for key tables ===");
  for (const tbl of ["signals", "game_signals", "picks", "games", "settlements", "pick_settlements"]) {
    try {
      const r = await c.query(`select count(*)::int as n from public."${tbl}"`);
      console.log(`  public.${tbl}: ${r.rows[0].n}`);
    } catch (e) { console.log(`  public.${tbl}: ${e.message.slice(0, 70)}`); }
  }

  console.log("\n=== picks columns ===");
  try {
    const r = await c.query(
      `select column_name, data_type from information_schema.columns
       where table_schema='public' and table_name='picks' order by ordinal_position`);
    console.log(r.rows.map(x => x.column_name).join(", "));
  } catch (e) { console.log(e.message); }

  console.log("\n=== signals columns ===");
  try {
    const r = await c.query(
      `select column_name, data_type from information_schema.columns
       where table_schema='public' and table_name='signals' order by ordinal_position`);
    console.log(r.rows.map(x => x.column_name).join(", "));
  } catch (e) { console.log(e.message); }

  console.log("\n=== game_signals columns ===");
  try {
    const r = await c.query(
      `select column_name, data_type from information_schema.columns
       where table_schema='public' and table_name='game_signals' order by ordinal_position`);
    console.log(r.rows.map(x => x.column_name).join(", "));
  } catch (e) { console.log(e.message); }

  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
