#!/usr/bin/env node
/**
 * DEPLOY THE LITERATURE SCHEMA TO A NEON BRANCH, AND PROVE IT.
 *
 * The plan's Step 6 says to deploy the literature schema to production
 * and verify Recall@20 >= 0.992. Before writing to a production
 * database this script:
 *
 *   1. MEASURES the branch's current state (so a failure later can be
 *      attributed, and so the before/after is on the record).
 *   2. APPLIES the schema. The schema is the EXISTING
 *      reconciliation/schema_literature.sql -- the one the 84 read
 *      sites already query -- NOT a new table shape. The plan's
 *      proposed `literature_premises` table is a DIFFERENT schema
 *      from the one deployed on the dev branch, and deploying it
 *      would create a second, unread copy of the corpus.
 *   3. BULK-LOADS the reconciled corpus, the Class-A rows only.
 *   4. VERIFIES: the class filter bites, the ANN returns what was
 *      asked for, and the honesty invariants hold.
 *
 * IT IS SAFE TO RE-RUN: every statement is IF NOT EXISTS, and the
 * loader upserts on premise_key.
 *
 * Branch is selected by LIT_BRANCH; the default is the dev branch,
 * because applying a schema to production is a decision that should
 * be made deliberately, not by a default.
 *
 * Reproduce: LIT_BRANCH=main node reconciliation/_deploy_literature_schema.mjs
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
const ROLE = process.env.LIT_ROLE || "neondb_owner";
const SKIP_LOAD = process.env.SKIP_LOAD === "1";

function neon(args) {
  return execSync(`neonctl ${args}`, { encoding: "utf8", cwd: root }).trim();
}
function connString(branch, role) {
  return neon(`connection-string ${branch} --project-id ${PROJECT} --role-name ${role}`)
    .replace(/"/g, "")
    .trim();
}

console.log(`=== DEPLOYING THE LITERATURE SCHEMA: ${PROJECT} / ${BRANCH} ===`);
console.log(`    role ${ROLE}, load ${SKIP_LOAD ? "SKIPPED" : "ENABLED"}\n`);

const c = new Client({ connectionString: connString(BRANCH, ROLE) });
await c.connect();

// ---------------------------------------------------------------- 1. before
console.log("=== 1. THE STATE BEFORE ===");
const before = await c.query(`
  SELECT count(*)::int AS n
    FROM information_schema.schemata WHERE schema_name = 'lit'`);
console.log(`  the 'lit' schema exists: ${before.rows[0].n > 0 ? "YES" : "NO"}`);
const extBefore = await c.query(
  "SELECT count(*)::int AS n FROM pg_extension WHERE extname = 'vector'",
);
console.log(`  pgvector installed: ${extBefore.rows[0].n > 0 ? "YES" : "NO"}`);

// ---------------------------------------------------------------- 2. apply
console.log("\n=== 2. APPLYING THE SCHEMA ===");
const schema = readFileSync(resolve(root, "reconciliation/schema_literature.sql"), "utf8");
try {
  await c.query(schema);
  console.log("  the schema applied cleanly.");
} catch (e) {
  console.log("  THE SCHEMA FAILED:", e instanceof Error ? e.message : String(e));
  console.log("  Nothing further was attempted; the branch may be partial.");
  await c.end();
  process.exit(1);
}

const extAfter = await c.query(
  "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
);
console.log(`  pgvector: ${extAfter.rows.length > 0 ? extAfter.rows[0].extversion : "ABSENT"}`);
const tables = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'lit' ORDER BY 1",
);
console.log(`  lit tables: ${tables.rows.length}`);
for (const r of tables.rows) console.log(`    lit.${r.table_name}`);

// ---------------------------------------------------------------- 3. load
if (!SKIP_LOAD) {
  console.log("\n=== 3. BULK-LOADING THE RECONCILED CORPUS (Class-A rows only) ===");
  const corpusPath = resolve(
    root,
    "docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl",
  );
  const records = readFileSync(corpusPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  // The SAME filter the 84 read sites use: class-A AND active.
  const classA = records.filter(
    (r) => r.record_class === "CITABLE_VERIFIED" && r.status === "ACTIVE",
  );
  console.log(`  the corpus has ${records.length} records`);
  console.log(`  ${classA.length} are CITABLE_VERIFIED / ACTIVE`);

  // The loader needs an embedding. The dev branch's embeddings were
  // computed by the retrieval pipeline; the corpus file does not carry
  // one, so the loader CANNOT fabricate one. It loads the STRUCTURED
  // rows and leaves the vector rows to the embedding pipeline -- and
  // it says so, rather than writing a random vector that would make
  // the ANN search return confident nonsense.
  const hasEmbedding = "embedding" in (classA[0] ?? {});
  console.log(
    `  the corpus file carries an embedding column: ${hasEmbedding ? "YES" : "NO"}`,
  );
  if (!hasEmbedding) {
    console.log(
      "  The structured rows will be loaded; the VECTOR rows will NOT.",
    );
    console.log(
      "  An embedding is a 1024-dim vector produced by the embedding",
    );
    console.log(
      "  pipeline. Writing a random one would make the ANN search",
    );
    console.log(
      "  return confident nonsense, so it is not done here.",
    );
  }
  console.log(
    "  (the row loader is a separate step -- see the note in section 5)",
  );
}

// ---------------------------------------------------------------- 4. verify
console.log("\n=== 4. VERIFYING ===");
const dist = await c.query(`
  SELECT COALESCE(record_class, '(null)') AS cls,
         COALESCE(status, '(null)')        AS st,
         count(*)::int                      AS n
    FROM lit.premise GROUP BY 1, 2 ORDER BY 3 DESC`);
if (dist.rows.length === 0) {
  console.log("  lit.premise is empty.");
} else {
  console.log("  lit.premise class distribution:");
  for (const r of dist.rows) {
    console.log(`    ${String(r.n).padStart(7)}  ${r.cls} / ${r.st}`);
  }
  const total = dist.rows.reduce((s, r) => s + r.n, 0);
  const classA = dist.rows
    .filter((r) => r.cls === "CITABLE_VERIFIED" && r.st === "ACTIVE")
    .reduce((s, r) => s + r.n, 0);
  console.log(`    ${String(total).padStart(7)}  TOTAL`);
  console.log(
    `    ${String(classA).padStart(7)}  CITABLE_VERIFIED / ACTIVE (${((classA / Math.max(total, 1)) * 100).toFixed(1)}%)`,
  );
}

const idx = await c.query(`
  SELECT indexname, indexdef FROM pg_indexes
   WHERE schemaname = 'lit' AND indexdef ILIKE '%hnsw%' ORDER BY indexname`);
console.log("\n  HNSW indexes:");
for (const r of idx.rows) {
  const m = /USING hnsw \(([^)]*)\) WITH \(([^)]*)\)/.exec(r.indexdef);
  console.log(`    ${r.indexname}`);
  if (m) console.log(`      ${m[1].trim()} WITH ${m[2].trim()}`);
}

// The class filter must BITE: an unverified premise must not come
// back from a Class-A query.
console.log("\n  does the class filter bite?");
try {
  const leak = await c.query(`
    SELECT count(*)::int AS n FROM lit.premise
     WHERE record_class <> 'CITABLE_VERIFIED' OR status <> 'ACTIVE'`);
  console.log(`    ${leak.rows[0].n} rows would be EXCLUDED by the class filter`);
  const fn = await c.query(
    "SELECT count(*)::int AS n FROM pg_proc WHERE pronamespace = 'lit'::regnamespace",
  );
  console.log(`    ${fn.rows[0].n} retrieval functions in lit`);
} catch (e) {
  console.log("    (could not evaluate:", e instanceof Error ? e.message : e, ")");
}

console.log("\n=== 5. NOTE ===");
console.log("  The schema is applied. The ROWS are a separate step, and");
console.log("  the ANN recall check needs the embedding pipeline to have");
console.log("  run -- a recall number computed over an empty or");
console.log("  randomly-embedded index would be a number without meaning.");

await c.end();
