#!/usr/bin/env node
/**
 * DOES EVERY INSERT PATH WORK AGAINST THE REAL SCHEMA?
 *
 * The `status` column is NOT NULL, so an insert that omits it fails at
 * runtime -- not at compile time, and not in a test that uses a mock
 * DB. The mock cannot catch it, because the mock does not know the
 * schema.
 *
 * So this runs every INSERT path against the real schema, with the
 * real column list, and reports which ones the database accepts.
 *
 * Reproduce: node reconciliation/_verify_insert_paths.mjs
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

// The schema must be current.
await c.query(readFileSync(resolve(root, "reconciliation/schema_literature.sql"), "utf8"));

/**
 * The insert paths, with the column list and the values each one
 * actually supplies. Taken from the code, not from the schema.
 */
const PATHS = [
  {
    name: "literature-index-builder.ts (mind corpus -> premise)",
    sql: `INSERT INTO lit.premise (
        premise_key, source, source_ref, title, principle, domain, claim_type,
        numeric_value, numeric_unit, numeric_metric, influence_direction,
        evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
        source_file, source_doc_hash, record_class, verification_tier,
        status, structure_state, content_hash, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'structured',$21, now())`,
    params: [
      "verify:insert:index-builder", "arXiv", "arXiv:0000.00000", "A title", "A principle",
      "domain", "causal", 0.5, "probability", "metric", "positive", "a quote",
      "because", [], [], "doc.md", "hash", "CITABLE_VERIFIED", "MSVH_S1_EXACT", "ACTIVE", "chash",
    ],
  },
  {
    name: "build-index.cjs (mind corpus -> premise)",
    sql: `INSERT INTO lit.premise (
              premise_key, source, source_ref, title, principle, domain, claim_type,
              numeric_value, numeric_unit, numeric_metric, influence_direction,
              evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
              source_file, source_doc_hash, record_class, verification_tier,
              status, structure_state, content_hash, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'structured',$21, now())`,
    params: [
      "verify:insert:build-index", "arXiv", "arXiv:0000.00001", "A title", "A principle",
      "domain", "causal", 0.5, "probability", "metric", "positive", "a quote",
      "because", [], [], "doc.md", "hash", "CITABLE_VERIFIED", "MSVH_S1_EXACT", "ACTIVE", "chash",
    ],
  },
  {
    name: "literature-discovery.ts (discovery -> premise)",
    sql: `INSERT INTO lit.premise (
        premise_key, source, source_ref, title, principle, domain, claim_type,
        evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
        source_file, record_class, verification_tier, status,
        structure_state, content_hash, updated_at
     ) VALUES ($1,$2,$3,$4,$5,'discovered',$6,$7,$8,'{}','{}',$9,'HONESTLY_UNCITED_PRIOR','MSVH_S0_UNCITED','UNCITED_NO_SOURCE','structured',$10, now())`,
    params: [
      "verify:insert:discovery", "discovered_test", "corpus:1", "A title", "A principle",
      "discovered", "an abstract", "surfaced by retrieval", "url", "corpus:1",
    ],
  },
  {
    name: "run-discovery.cjs (discovery -> premise)",
    sql: `INSERT INTO lit.premise (
            premise_key, source, source_ref, title, principle, domain, claim_type,
            evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
            source_file, record_class, verification_tier, status,
            structure_state, content_hash, updated_at
         ) VALUES ($1,$2,$3,$4,$5,'discovered',$6,$7,$8,'{}','{}',$9,'HONESTLY_UNCITED_PRIOR','MSVH_S0_UNCITED','UNCITED_NO_SOURCE','structured',$10, now())`,
    params: [
      "verify:insert:run-discovery", "discovered_test", "corpus:2", "A title", "A principle",
      "discovered", "an abstract", "surfaced by retrieval", "url", "corpus:2",
    ],
  },
];

let failures = 0;
console.log("=== EVERY INSERT PATH, AGAINST THE REAL SCHEMA ===");
for (const p of PATHS) {
  try {
    await c.query(p.sql, p.params);
    console.log(`  PASS  ${p.name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${p.name}`);
    console.log(`        ${e.message.split("\n")[0]}`);
  }
}

// Clean up the rows this check made.
await c.query(`DELETE FROM lit.premise WHERE premise_key LIKE 'verify:insert:%'`).catch(() => {});

console.log(`\nVERDICT: ${failures === 0 ? "every insert path works against the real schema" : `${failures} PATHS FAILED`}`);
await c.end();
process.exit(failures === 0 ? 0 : 1);
