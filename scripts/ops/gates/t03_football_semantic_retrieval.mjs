#!/usr/bin/env node
/**
 * T-03 — Football semantic retrieval gate (WP-7, fail-closed).
 *
 * Seeds the fixed CHUNK_SEEDED_SQL with a football-titled chunk and asserts:
 *   1. >= 8 results returned, every similarity >= 0.45 (MIN_CHUNK_SIMILARITY).
 *   2. >= 6 of the top 10 are sports-relevant by corpus_item title keywords
 *      (disclosed heuristic: football/nfl/offense/defense/quarterback/coach/
 *      sport/athlet/player/team/game/gridiron).
 *   3. Results are ordered by descending similarity (index working).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = path.join(ROOT, "packages/prediction-engine/src/literature/corpus-grounding.ts");
const m = fs.readFileSync(SRC, "utf8").match(/export const CHUNK_SEEDED_SQL = `([\s\S]*?)`;/);
if (!m) {
  console.error("T-03 FAIL: CHUNK_SEEDED_SQL not found");
  process.exit(1);
}
const SQL = m[1];
const SPORT_RE = /football|nfl|offense|defense|quarterback|coach|sport|athlet|player|team|game|gridiron/i;

let url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  url = execSync("neonctl connection-string main --project-id summer-brook-99380762 --role-name hermes_ro", { encoding: "utf8" }).trim();
}
const client = new pg.Client({ connectionString: url });
await client.connect();
const failures = [];
try {
  const seed = await client.query(`
    SELECT c.corpus_key, c.chunk_index FROM lit.corpus_chunk c
    JOIN lit.corpus_item i ON i.corpus_key = c.corpus_key
    WHERE c.embedding IS NOT NULL AND i.title ILIKE '%football%'
    ORDER BY c.corpus_key LIMIT 1`);
  if (!seed.rows.length) {
    console.error("T-03 FAIL: no football-titled embedded seed chunk");
    process.exit(1);
  }
  const { corpus_key, chunk_index } = seed.rows[0];
  const res = await client.query(SQL, [corpus_key, chunk_index, 10]);
  console.log(`  seed=${corpus_key.slice(0, 12)}... rows=${res.rows.length}`);
  if (res.rows.length < 8) failures.push(`only ${res.rows.length} results (<8)`);

  const sims = res.rows.map((r) => Number(r.similarity));
  if (sims.some((s) => s < 0.45)) failures.push("similarity below 0.45 floor");
  for (let i = 1; i < sims.length; i++) {
    if (sims[i] > sims[i - 1] + 1e-9) { failures.push("results not similarity-ordered"); break; }
  }

  const keys = res.rows.map((r) => r.corpus_key);
  const items = await client.query(
    `SELECT corpus_key, title FROM lit.corpus_item WHERE corpus_key = ANY($1)`, [keys]);
  const titleBy = new Map(items.rows.map((r) => [r.corpus_key, r.title ?? ""]));
  let sports = 0;
  for (const r of res.rows) {
    const t = titleBy.get(r.corpus_key) ?? r.title ?? "";
    if (SPORT_RE.test(t)) sports++;
  }
  console.log(`  sports-relevant top-10: ${sports}/10 (need >=6)`);
  if (sports < 6) failures.push(`only ${sports}/10 sports-relevant`);
} catch (err) {
  failures.push(`query error: ${err.message}`);
} finally {
  await client.end();
}
if (failures.length) {
  console.error("T-03 FAIL: " + failures.join("; "));
  process.exit(1);
}
console.log("T-03 PASS");