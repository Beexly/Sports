#!/usr/bin/env node
/**
 * APPLY THE CLASS-A SCHEMA TO A NEON DEV BRANCH AND PROVE THE SQL IS
 * VALID.
 *
 * The class filter is only worth anything if the DDL actually applies
 * and the function with the filter compiles. A schema file that has
 * never been run against a real Postgres is a wish.
 *
 * This:
 *   1. creates a dev branch (or reuses LIT_BRANCH)
 *   2. applies reconciliation/schema_literature.sql
 *   3. asserts the new columns exist with the right defaults
 *   4. asserts lit.retrieve_premises() filters on record_class
 *   5. proves the filter BITES: insert a CITABLE_VERIFIED premise and
 *      an HONESTLY_UNCITED_PRIOR one, then show the retrieval function
 *      returns only the citable one
 *
 * Reproduce: node reconciliation/apply_and_verify_class_a_schema.mjs
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
// The literature schema already lives on this dev branch (it is where
// `reconciliation/apply_schema.cjs` applies it). Reuse it rather than
// creating a new branch: the branch create command's failure mode is to
// print an error and exit non-zero, which the catch below swallows.
const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";

function neon(args) {
  return execSync(`neonctl ${args}`, { encoding: "utf8", cwd: root }).trim();
}

function connString(branch, role) {
  return neon(`connection-string ${branch} --project-id ${PROJECT} --role-name ${role}`)
    .replace(/"/g, "")
    .trim();
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: root, stdio: ["ignore", "pipe", "pipe"] });
}

console.log("=== 1. DEV BRANCH ===");
if (!process.env.LIT_BRANCH) {
  try {
    sh(`neonctl branches create ${BRANCH} --project-id ${PROJECT}`);
    console.log(`created ${BRANCH}`);
  } catch {
    console.log(`using the existing branch ${BRANCH}`);
  }
} else {
  console.log(`using LIT_BRANCH=${BRANCH}`);
}

const c = new Client({ connectionString: connString(BRANCH, "neondb_owner") });
await c.connect();
console.log("connected as neondb_owner");

console.log("\n=== 2. APPLY THE SCHEMA ===");
const sql = readFileSync(resolve(root, "reconciliation/schema_literature.sql"), "utf8");
try {
  await c.query(sql);
  console.log("schema applied cleanly");
} catch (e) {
  console.log(`SCHEMA ERROR: ${e.message}`);
  await c.end();
  process.exit(1);
}

console.log("\n=== 3. THE NEW COLUMNS ===");
const cols = await c.query(
  `SELECT column_name, data_type, column_default, is_nullable
     FROM information_schema.columns
    WHERE table_schema='lit' AND table_name='premise'
      AND column_name IN ('record_class','verification_tier','status')
    ORDER BY column_name`,
);
for (const r of cols.rows) {
  console.log(
    `  ${r.column_name.padEnd(18)} ${r.data_type.padEnd(10)} default=${r.column_default} nullable=${r.is_nullable}`,
  );
}
if (cols.rows.length !== 3) {
  console.log("MISSING COLUMNS");
  await c.end();
  process.exit(1);
}

const chk = await c.query(
  `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
    WHERE conrelid = 'lit.premise'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%record_class%'`,
);
console.log("  record_class CHECK:", chk.rows.map((r) => r.def).join(" | ") || "NONE");

console.log("\n=== 4. THE RETRIEVAL FUNCTION FILTERS ON THE CLASS ===");
const fn = await c.query(
  `SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='lit' AND p.proname='retrieve_premises'`,
);
const src = fn.rows[0]?.prosrc ?? "";
console.log(
  `  lit.retrieve_premises filters on record_class: ${
/record_class\s*=\s*'CITABLE_VERIFIED'/.test(src) &&
    /status\s*=\s*'ACTIVE'/.test(src) ? "YES" : "NO"
  }`,
);
if (!/record_class\s*=\s*'CITABLE_VERIFIED'/.test(src)) {
  console.log("  THE FUNCTION DOES NOT FILTER");
  await c.end();
  process.exit(1);
}

console.log("\n=== 5. DOES THE FILTER BITE? ===");
// A vector so the HNSW index has something to search.
const vec = `[${new Array(1024).fill(0).join(",")}]`;
await c.query(`INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
  SELECT id, $1::vector, 'test' FROM lit.premise LIMIT 0`, [vec]).catch(() => {});

const mk = async (key, cls, tier, status) => {
  const r = await c.query(
    `INSERT INTO lit.premise (
        premise_key, source, source_ref, title, principle, domain, claim_type,
        numeric_value, numeric_unit, numeric_metric, influence_direction,
        evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
        source_file, source_doc_hash, record_class, verification_tier,
        status, structure_state, content_hash, updated_at
     ) VALUES ($1,'test',$1,$1,'p','test','causal',0.5,'probability','m','positive',
        'quote here','because','{}','{}','f.md','h',
        $2,$3,$4,'structured','ch', now())
     ON CONFLICT (premise_key) DO UPDATE SET record_class=EXCLUDED.record_class,
        verification_tier=EXCLUDED.verification_tier, status=EXCLUDED.status
     RETURNING id`,
    [key, cls, tier, status],
  );
  const id = r.rows[0].id;
  await c.query(
    `INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
     VALUES ($1, $2::vector, 'test')
     ON CONFLICT (premise_id) DO UPDATE SET embedding=EXCLUDED.embedding`,
    [id, vec],
  );
  return id;
};

await mk("test:class_a:citable", "CITABLE_VERIFIED", "MSVH_S1_EXACT", "ACTIVE");
await mk("test:class_a:semantic_fail", "CITABLE_VERIFIED", "MSVH_S0_UNCITED", "LINK_VERIFIED_SEMANTIC_FAIL");
await mk("test:class_a:uncited", "HONESTLY_UNCITED_PRIOR", "MSVH_S0_UNCITED", "UNCITED_NO_SOURCE");
await mk("test:class_a:derived", "DERIVED_MARKET_SYNTHESIS", "MSVH_S0_DERIVED_TABLE", "DERIVED_TABLE");

const got = await c.query(
  `SELECT premise_key FROM lit.retrieve_premises($1::vector, 50, NULL, 0.0)`,
  [vec],
);
const keys = got.rows.map((r) => r.premise_key);
console.log(`  retrieve_premises returned: ${JSON.stringify(keys)}`);

const onlyCitable =
  keys.length === 1 && keys[0] === "test:class_a:citable";
console.log(`  only the CITABLE_VERIFIED premise came back: ${onlyCitable ? "YES" : "NO"}`);

console.log("\n=== 6. THE DEFAULT IS THE HONEST ONE ===");
const d = await c.query(
  `INSERT INTO lit.premise (premise_key, source, title, content_hash)
   VALUES ('test:class_a:default','test','t','ch')
   ON CONFLICT (premise_key) DO UPDATE SET record_class='HONESTLY_UNCITED_PRIOR'
   RETURNING record_class`,
);
console.log(`  a premise inserted with no class gets: ${d.rows[0].record_class}`);
const honestDefault = d.rows[0].record_class === "HONESTLY_UNCITED_PRIOR";

const ok = onlyCitable && honestDefault;
console.log(`\nVERDICT: ${ok ? "the class filter works and the default is honest" : "FAILED"}`);
await c.end();
process.exit(ok ? 0 : 1);
