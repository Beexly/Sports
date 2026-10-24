#!/usr/bin/env node
/* Verify lit.retrieve_premises works AND that the planner uses the HNSW index. */
const { Client } = require("pg");
const { execSync } = require("child_process");

const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";

function conn() {
  const url = execSync(
    `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

(async () => {
  const db = conn();
  await db.connect();

  console.log("=== 1. Does the planner choose the HNSW index? ===");
  const plan = await db.query(
    `EXPLAIN (COSTS OFF) SELECT * FROM lit.premise_vector v
       JOIN lit.premise p ON p.id = v.premise_id
      WHERE p.structure_state = 'structured'
      ORDER BY v.embedding <=> (SELECT embedding FROM lit.premise_vector LIMIT 1)
      LIMIT 20`);
  console.log(plan.rows.map((r) => r["QUERY PLAN"]).join("\n"));

  console.log("\n=== 2. Direct function call with a real query vector ===");
  const q = await db.query(
    `SELECT v.embedding::text AS emb FROM lit.premise_vector v LIMIT 1`);
  const embText = q.rows[0].emb;
  const r1 = await db.query(
    `SELECT premise_key, title, domain, pillar_tags, round(similarity::numeric,4) AS sim
       FROM lit.retrieve_premises($1::vector, 5, NULL, 0.0)`, [embText]);
  console.log("rows:", r1.rows.length);
  for (const r of r1.rows) console.log("  ", r.sim, r.premise_key.slice(0, 48), "|", (r.pillar_tags || []).join(","));

  console.log("\n=== 3. Pillar-scoped retrieval (only premises with that pillar) ===");
  const r2 = await db.query(
    `SELECT premise_key, pillar_tags, round(similarity::numeric,4) AS sim
       FROM lit.retrieve_premises($1::vector, 5, ARRAY['market_microstructure']::text[], 0.0)`, [embText]);
  console.log("rows:", r2.rows.length);
  for (const r of r2.rows) console.log("  ", r.sim, (r.pillar_tags || []).join(","));

  console.log("\n=== 4. Counts by pillar ===");
  const pc = await db.query(
    `SELECT p as pillar, count(*)::int n FROM lit.premise, unnest(pillar_tags) p GROUP BY 1 ORDER BY 2 DESC`);
  console.table(pc.rows);

  console.log("\n=== 5. Counts by source ===");
  const sc = await db.query(`SELECT source, count(*)::int n FROM lit.premise GROUP BY 1 ORDER BY 2 DESC`);
  console.table(sc.rows);

  console.log("\n=== 6. HNSW index size / validity ===");
  const ix = await db.query(
    `SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
       FROM pg_indexes WHERE schemaname='lit' AND indexdef ILIKE '%hnsw%'`);
  console.table(ix.rows);

  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
