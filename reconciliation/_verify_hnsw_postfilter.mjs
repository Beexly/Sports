#!/usr/bin/env node
/**
 * DOES THE HNSW POST-FILTER SILENTLY UNDER-RETURN?
 *
 * The class filter is on lit.premise, JOINED to lit.premise_vector
 * (where the HNSW index lives). So the ANN search returns its top-k by
 * vector distance and the filter is applied afterwards. With only
 * ~20% of premises CITABLE_VERIFIED, asking for k=20 can return far
 * fewer than 20.
 *
 * That is not a correctness bug -- an unverified premise never comes
 * back -- but it IS a completeness bug: the caller asked for 20 and
 * got 4, and nothing says so. The engine's premise pool is then a
 * function of the ANN's arbitrary cut, not of the corpus.
 *
 * This measures the shortfall against the REAL database.
 *
 * Reproduce: node reconciliation/_verify_hnsw_postfilter.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { Client } = require(resolve(root, "node_modules/pg"));

const PROJECT = "summer-brook-99380762";
const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";

function neon(args) {
  return execSync(`neonctl ${args}`, { encoding: "utf8", cwd: root }).trim();
}
function connString(branch, role) {
  return neon(`connection-string ${branch} --project-id ${PROJECT} --role-name ${role}`)
    .replace(/"/g, "")
    .trim();
}

const c = new Client({ connectionString: connString(BRANCH, "neondb_owner") });
await c.connect();
await c.query(readFileSync(resolve(root, "reconciliation/schema_literature.sql"), "utf8"));

console.log("=== 1. WHAT IS IN THE TABLE? ===");
const dist = await c.query(`
  SELECT COALESCE(record_class, '(null)') AS cls,
         COALESCE(status, '(null)')        AS st,
         count(*)::int                      AS n
    FROM lit.premise
   GROUP BY 1, 2
   ORDER BY 3 DESC`);
for (const r of dist.rows) {
  console.log(`  ${String(r.n).padStart(7)}  ${r.cls} / ${r.st}`);
}
const total = dist.rows.reduce((s, r) => s + r.n, 0);
const citable = dist.rows
  .filter((r) => r.cls === "CITABLE_VERIFIED" && r.st === "ACTIVE")
  .reduce((s, r) => s + r.n, 0);
console.log(`  ${String(total).padStart(7)}  TOTAL`);
console.log(`  ${String(citable).padStart(7)}  CITABLE_VERIFIED / ACTIVE  (${((citable / Math.max(total, 1)) * 100).toFixed(1)}%)`);

if (total === 0) {
  console.log("\nVERDICT: INCONCLUSIVE -- the table is empty, so there is nothing to measure");
  await c.end();
  process.exit(0);
}

console.log("\n=== 2. WHAT DOES THE ANN SEARCH RETURN vs WHAT WAS ASKED FOR? ===");
// Take a real embedding and query for it.
const emb = await c.query(
  `SELECT embedding FROM lit.premise_vector WHERE embedding IS NOT NULL LIMIT 1`,
);
if (emb.rows.length === 0) {
  console.log("  no embeddings to query with");
  console.log("\nVERDICT: INCONCLUSIVE -- no vectors in the index");
  await c.end();
  process.exit(0);
}
// pgvector's TEXT input format is "[v1,v2,...]" with NO quotes around
// the numbers. JSON.stringify produces quotes, which pgvector rejects
// with "Vector contents must start with [".
const embVec = emb.rows[0].embedding;
const vec = typeof embVec === "string" ? embVec : `[${embVec.join(",")}]`;

for (const k of [5, 20, 50]) {
  const got = await c.query(
    `SELECT count(*)::int AS n FROM lit.retrieve_premises($1::vector, $2, NULL, 0.0)`,
    [vec, k],
  );
  const n = got.rows[0].n;
  const short = n < k;
  console.log(
    `  asked for k=${String(k).padStart(3)}  got ${String(n).padStart(3)}  ${short ? `SHORT by ${k - n}` : "complete"}`,
  );
}

console.log("\n=== 3. THE UNFILTERED COUNT, FOR COMPARISON ===");
const raw = await c.query(
  `SELECT count(*)::int AS n
     FROM lit.premise_vector v
     JOIN lit.premise p ON p.id = v.premise_id
    WHERE (1 - (v.embedding <=> $1::vector))::double precision >= 0.0`,
  [vec],
);
console.log(`  the same search with NO class filter returns ${raw.rows[0].n}`);

console.log("\n=== 4. THE PLAN THE PLANNER ACTUALLY CHOSE ===");
const plan = await c.query(
  `EXPLAIN (FORMAT TEXT)
   SELECT p.id FROM lit.premise_vector v
     JOIN lit.premise p ON p.id = v.premise_id
    WHERE p.record_class = 'CITABLE_VERIFIED' AND p.status = 'ACTIVE'
      AND (1 - (v.embedding <=> $1::vector))::double precision >= 0.0
    ORDER BY v.embedding <=> $1::vector
    LIMIT 20`,
  [vec],
);
for (const row of plan.rows) {
  const line = String(row["QUERY PLAN"]).replace(/'\[[^\]]*\]'::vector/g, "<vector>");
  console.log(`  ${line}`);
}

await c.end();
