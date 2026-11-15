#!/usr/bin/env node
/**
 * T-02 — Live HNSW seeded-search gate (WP-7, fail-closed).
 *
 * Extracts CHUNK_SEEDED_SQL from packages/prediction-engine/src/literature/
 * corpus-grounding.ts, picks a real embedded seed from lit.corpus_chunk, and:
 *   1. EXPLAIN (FORMAT JSON): total cost < 12000 AND plan uses corpus_chunk_hnsw_idx.
 *   2. Timed live execution: < 5s, returns rows with similarity in (0, 1].
 *   3. NULL-seed short-circuit: a missing key returns 0 rows fast (< 2s).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = path.join(ROOT, "packages/prediction-engine/src/literature/corpus-grounding.ts");

const src = fs.readFileSync(SRC, "utf8");
const m = src.match(/export const CHUNK_SEEDED_SQL = `([\s\S]*?)`;/);
if (!m) {
  console.error("T-02 FAIL: CHUNK_SEEDED_SQL not found in corpus-grounding.ts");
  process.exit(1);
}
const SQL = m[1];
if (!/set_config\('hnsw\.ef_search'/.test(SQL) || !/IS NOT NULL/.test(SQL)) {
  console.error("T-02 FAIL: SQL lacks ef_search InitPlan or NULL short-circuit");
  process.exit(1);
}

let url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  url = execSync("neonctl connection-string main --project-id summer-brook-99380762 --role-name hermes_ro", { encoding: "utf8" }).trim();
}
const client = new pg.Client({ connectionString: url });
await client.connect();
const failures = [];
try {
  const seed = await client.query(
    `SELECT corpus_key, chunk_index FROM lit.corpus_chunk
      WHERE embedding IS NOT NULL AND (title ILIKE '%football%' OR source ILIKE '%football%')
      ORDER BY corpus_key LIMIT 1`,
  );
  const fallback = seed.rows.length ? seed : await client.query(
    `SELECT corpus_key, chunk_index FROM lit.corpus_chunk WHERE embedding IS NOT NULL ORDER BY corpus_key LIMIT 1`,
  );
  if (!fallback.rows.length) {
    console.error("T-02 FAIL: no embedded seed chunks in lit.corpus_chunk");
    process.exit(1);
  }
  const { corpus_key, chunk_index } = fallback.rows[0];

  const explain = await client.query(`EXPLAIN (FORMAT JSON) ${SQL}`, [corpus_key, chunk_index, 10]);
  const plan = explain.rows[0]["QUERY PLAN"][0];
  const cost = plan["Plan"]["Total Cost"];
  const planText = JSON.stringify(plan);
  const usesHnsw = /corpus_chunk_hnsw_idx/.test(planText);
  console.log(`  EXPLAIN total cost=${cost} hnsw_idx=${usesHnsw}`);
  if (!(cost < 12000)) failures.push(`cost ${cost} >= 12000`);
  if (!usesHnsw) failures.push("plan does not use corpus_chunk_hnsw_idx");

  const t0 = Date.now();
  const live = await client.query(SQL, [corpus_key, chunk_index, 10]);
  const ms = Date.now() - t0;
  console.log(`  live rows=${live.rows.length} latency=${ms}ms`);
  if (!(ms < 5000)) failures.push(`latency ${ms}ms >= 5000`);
  if (live.rows.length === 0) failures.push("seeded search returned 0 rows for a valid seed");
  const sims = live.rows.map((r) => Number(r.similarity));
  if (sims.some((s) => !(s > 0 && s <= 1))) failures.push("similarity outside (0,1]");

  const t1 = Date.now();
  const nullSeed = await client.query(SQL, ["0".repeat(64), 0, 10]);
  const nullMs = Date.now() - t1;
  console.log(`  null-seed rows=${nullSeed.rows.length} latency=${nullMs}ms`);
  if (nullSeed.rows.length !== 0) failures.push("missing seed did not short-circuit to 0 rows");
  if (!(nullMs < 2000)) failures.push(`null-seed latency ${nullMs}ms >= 2000`);
} catch (err) {
  failures.push(`query error: ${err.message}`);
} finally {
  await client.end();
}
if (failures.length) {
  console.error("T-02 FAIL: " + failures.join("; "));
  process.exit(1);
}
console.log("T-02 PASS");