#!/usr/bin/env node
/**
 * LOAD THE CORPUS INTO THE STAGING TABLE FOR THE HONESTY BACKFILL.
 *
 * The migration reconciliation/20261020_lit_premise_honesty_constraint.sql
 * needs the corpus's class, citable flag and SPAN OFFSETS in the
 * database before it can enforce chk_citable_verified_honesty -- because
 * `lit.premise` stores none of them. This script puts them there.
 *
 * IT RUNS ON A DEV BRANCH, NEVER ON PRODUCTION. The default branch is
 * `dev-lit-vectors-2026-10`, which already carries the literature
 * schema. Set LIT_BRANCH to point it elsewhere; set LIT_PRODUCTION=1
 * to override, and know what you are doing.
 *
 * Reproduce: node reconciliation/load-corpus-backfill.mjs
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
const ROLE = "neondb_owner";
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

function neon(args) {
  return execSync(`neonctl ${args}`, { encoding: "utf8", cwd: root }).trim();
}

function connString(branch, role) {
  return neon(`connection-string ${branch} --project-id ${PROJECT} --role-name ${role}`)
    .replace(/"/g, "")
    .trim();
}

/**
 * The corpus row -> the staging columns.
 *
 * The span offsets come from the corpus's `evidence_span` /
 * `mechanism_span` objects, whose members are `start_char` /
 * `end_char` and are NULL for the rows that were never located in a
 * document. A null member becomes a SQL NULL -- which is exactly what
 * the invariant's second branch requires.
 */
function toStagingRow(r) {
  const es = r.evidence_span && typeof r.evidence_span === "object" ? r.evidence_span : {};
  const ms = r.mechanism_span && typeof r.mechanism_span === "object" ? r.mechanism_span : {};
  const num = (v) => (typeof v === "number" && Number.isInteger(v) ? v : null);
  return [
    r.item_id ?? r.premise_key,
    r.record_class ?? null,
    r.verification_tier ?? null,
    r.status ?? null,
    r.citable === true ? true : r.citable === false ? false : null,
    num(es.start_char),
    num(es.end_char),
    num(ms.start_char),
    num(ms.end_char),
  ];
}

console.log("=== 1. THE CORPUS ===");
const records = readFileSync(CORPUS, "utf8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));
console.log(`  ${records.length} records from ${CORPUS.replace(root + "/", "")}`);

// The class-A count, so the loader can report whether the corpus it
// loaded is the one the audit measured.
const classA = records.filter((r) => r.record_class === "CITABLE_VERIFIED");
console.log(`  ${classA.length} are CITABLE_VERIFIED`);

console.log(`=== 2. THE BRANCH (${BRANCH}) ===`);
const c = new Client({ connectionString: connString(BRANCH, ROLE) });
await c.connect();
console.log("  connected as neondb_owner");

console.log("=== 3. THE STAGING TABLE ===");
await c.query(`
  CREATE TABLE IF NOT EXISTS lit._corpus_backfill (
    premise_key           text PRIMARY KEY,
    record_class          text NOT NULL,
    verification_tier     text,
    status                text,
    citable               boolean,
    evidence_start_char   integer,
    evidence_end_char     integer,
    mechanism_start_char  integer,
    mechanism_end_char    integer
  )`);
await c.query("TRUNCATE lit._corpus_backfill");
console.log("  created and truncated");

console.log("=== 4. THE LOAD ===");
// COPY is the fast path, and it streams.
const values = [];
for (const r of records) {
  const row = toStagingRow(r);
  values.push(
    "(" +
      row
        .map((v) => (v === null ? "NULL" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v)))
        .join(",") +
      ")",
  );
}
// Postgres caps a statement at ~1GB; chunk to stay well under it.
const CHUNK = 500;
let loaded = 0;
for (let i = 0; i < values.length; i += CHUNK) {
  const slice = values.slice(i, i + CHUNK);
  await c.query(
    `INSERT INTO lit._corpus_backfill (
       premise_key, record_class, verification_tier, status, citable,
       evidence_start_char, evidence_end_char, mechanism_start_char, mechanism_end_char
     ) VALUES ${slice.join(",")} ON CONFLICT (premise_key) DO UPDATE SET
       record_class = EXCLUDED.record_class,
       verification_tier = EXCLUDED.verification_tier,
       status = EXCLUDED.status,
       citable = EXCLUDED.citable,
       evidence_start_char = EXCLUDED.evidence_start_char,
       evidence_end_char = EXCLUDED.evidence_end_char,
       mechanism_start_char = EXCLUDED.mechanism_start_char,
       mechanism_end_char = EXCLUDED.mechanism_end_char`,
  );
  loaded += slice.length;
}
console.log(`  loaded ${loaded} rows`);

const { rows: tally } = await c.query(
  `SELECT count(*)::int AS total,
          count(*) FILTER (WHERE record_class = 'CITABLE_VERIFIED')::int AS class_a,
          count(*) FILTER (WHERE evidence_start_char IS NOT NULL)::int AS with_evidence_span
     FROM lit._corpus_backfill`,
);
console.log(`  staged: ${tally[0].total} total, ${tally[0].class_a} class-A, ${tally[0].with_evidence_span} with an evidence span`);

// And the CRITICAL question: would the invariant reject any of them?
const { rows: bad } = await c.query(`
  SELECT count(*)::int AS n
    FROM lit._corpus_backfill
   WHERE NOT (
     (record_class = 'CITABLE_VERIFIED'
       AND citable IS TRUE
       AND verification_tier = 'MSVH_S1_EXACT'
       AND evidence_start_char IS NOT NULL AND evidence_end_char > evidence_start_char
       AND mechanism_start_char IS NOT NULL AND mechanism_end_char > mechanism_start_char)
     OR
     (record_class <> 'CITABLE_VERIFIED'
       AND citable IS NOT TRUE
       AND verification_tier IS DISTINCT FROM 'MSVH_S1_EXACT'
       AND evidence_start_char IS NULL AND evidence_end_char IS NULL
       AND mechanism_start_char IS NULL AND mechanism_end_char IS NULL)
   )`);
console.log(`  rows the invariant would REJECT: ${bad[0].n}`);
if (bad[0].n > 0) {
  const { rows: examples } = await c.query(`
    SELECT premise_key, record_class, status, verification_tier, citable,
           evidence_start_char, evidence_end_char, mechanism_start_char, mechanism_end_char
      FROM lit._corpus_backfill
     WHERE NOT (
       (record_class = 'CITABLE_VERIFIED' AND citable IS TRUE AND verification_tier = 'MSVH_S1_EXACT'
         AND evidence_start_char IS NOT NULL AND evidence_end_char > evidence_start_char
         AND mechanism_start_char IS NOT NULL AND mechanism_end_char > mechanism_start_char)
       OR
       (record_class <> 'CITABLE_VERIFIED' AND citable IS NOT TRUE
         AND verification_tier IS DISTINCT FROM 'MSVH_S1_EXACT'
         AND evidence_start_char IS NULL AND evidence_end_char IS NULL
         AND mechanism_start_char IS NULL AND mechanism_end_char IS NULL)
     ) LIMIT 5`);
  for (const e of examples) console.log("    ", JSON.stringify(e));
}

console.log("=== 5. THE MIGRATION ===");
if (process.env.LIT_APPLY_MIGRATION !== "1") {
  console.log("  skipped (set LIT_APPLY_MIGRATION=1 to apply it)");
  await c.end();
  console.log("\n  the staging table is populated; run the migration next.");
  process.exit(0);
}

const MIGRATION = resolve(root, "reconciliation/20261020_lit_premise_honesty_constraint.sql");
const sql = readFileSync(MIGRATION, "utf8");
// The staging table already exists (step 3), so the migration's
// CREATE TABLE IF NOT EXISTS is a no-op, and its final DROP removes
// it. Run it as ONE transaction.
try {
  await c.query("BEGIN");
  await c.query(sql);
  await c.query("COMMIT");
  console.log("  APPLIED");
} catch (error) {
  await c.query("ROLLBACK");
  console.log(`  FAILED: ${error instanceof Error ? error.message : String(error)}`);
  await c.end();
  process.exit(1);
}

console.log("=== 6. VERIFICATION ===");
const checks = [
  ["test rows remaining", "SELECT count(*)::int AS n FROM lit.premise WHERE premise_key LIKE 'test:%'", 0],
  [
    "class-A rows missing an evidence span",
    "SELECT count(*)::int AS n FROM lit.premise WHERE record_class = 'CITABLE_VERIFIED' AND (evidence_start_char IS NULL OR evidence_end_char IS NULL OR evidence_end_char <= evidence_start_char)",
    0,
  ],
  [
    "class-A rows missing a mechanism span",
    "SELECT count(*)::int AS n FROM lit.premise WHERE record_class = 'CITABLE_VERIFIED' AND (mechanism_start_char IS NULL OR mechanism_end_char IS NULL OR mechanism_end_char <= mechanism_start_char)",
    0,
  ],
  [
    "non-class-A rows with a non-null evidence span",
    "SELECT count(*)::int AS n FROM lit.premise WHERE record_class <> 'CITABLE_VERIFIED' AND (evidence_start_char IS NOT NULL OR mechanism_start_char IS NOT NULL)",
    0,
  ],
  [
    "rows the constraint is actually attached to",
    "SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid = 'lit.premise'::regclass AND conname = 'chk_citable_verified_honesty'",
    1,
  ],
];
let failed = 0;
for (const [label, query, expected] of checks) {
  const { rows } = await c.query(query);
  const n = rows[0].n;
  const ok = n === expected;
  if (!ok) failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${n} (expected ${expected})`);
}

// THE PROVING TEST: the constraint must actually REFUSE a bad row.
console.log("=== 7. THE CONSTRAINT MUST REFUSE A BAD ROW ===");
try {
  await c.query(
    `INSERT INTO lit.premise (premise_key, source, title, content_hash, record_class, verification_tier, status, citable)
     VALUES ('test:honesty:violation', 'test', 'test', 'ch', 'CITABLE_VERIFIED', 'MSVH_S1_EXACT', 'ACTIVE', true)`,
  );
  console.log("  FAIL  a CITABLE_VERIFIED row with NO spans was ACCEPTED -- the constraint does not gate");
  failed += 1;
  await c.query("DELETE FROM lit.premise WHERE premise_key = 'test:honesty:violation'");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const refused = /chk_citable_verified_honesty|violates check constraint/i.test(message);
  console.log(`  ${refused ? "PASS" : "FAIL"}  a CITABLE_VERIFIED row with NO spans was refused`);
  console.log(`        ${message.split("\n")[0].slice(0, 150)}`);
  if (!refused) failed += 1;
}

await c.end();
console.log(failed === 0 ? "\n  ALL CHECKS PASS" : `\n  ${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
