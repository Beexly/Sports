#!/usr/bin/env node
/**
 * COPY THE RECONCILED CLASS-A CORPUS FROM THE DEV BRANCH TO A TARGET
 * BRANCH, VECTORS INCLUDED.
 *
 * WHY COPY RATHER THAN RE-EMBED. The dev branch already holds 1,099
 * class-A rows with 1,024-dimensional embeddings, produced by the
 * embedding pipeline. Re-embedding them on the target would need an
 * embedding provider and would produce vectors that are not bit-equal
 * to the ones the retrieval path was tuned against. Copying is
 * EXACT -- the same bytes, the same keys, the same classes.
 *
 * WHAT IS COPIED: the STRUCTURED row (lit.premise) and the VECTOR row
 * (lit.premise_vector) for every class-A premise, and the premise's
 * pillar tags. The operational tables -- activation, residual,
 * retrieval_event, intervention_test -- are NOT copied: they are
 * runtime state about THIS database's traffic, and copying another
 * branch's would be copying history that did not happen here.
 *
 * THE CLASS FILTER IS NOT OPTIONAL. Only
 * record_class = 'CITABLE_VERIFIED' AND status = 'ACTIVE' rows are
 * copied. A premise that is not class-A never enters the target's
 * reasoning path, so the target cannot serve a claim the dev branch
 * would not serve.
 *
 * Reproduce: node reconciliation/_copy_class_a_corpus.mjs
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { Client } = require(resolve(root, "node_modules/pg"));

const PROJECT = "summer-brook-99380762";
const SOURCE = process.env.LIT_SOURCE_BRANCH || "dev-lit-vectors-2026-10";
const TARGET = process.env.LIT_TARGET_BRANCH || "main";
const ROLE = "neondb_owner";

function connString(branch) {
  return execSync(
    `neonctl connection-string ${branch} --project-id ${PROJECT} --role-name ${ROLE}`,
    { encoding: "utf8", cwd: root },
  )
    .replace(/"/g, "")
    .trim();
}

console.log(`=== COPYING THE CLASS-A CORPUS: ${SOURCE} -> ${TARGET} ===\n`);

const src = new Client({ connectionString: connString(SOURCE) });
const dst = new Client({ connectionString: connString(TARGET) });
await src.connect();
await dst.connect();

// ---------------------------------------------------------------- read
console.log("=== 1. READING THE SOURCE ===");
const rows = await src.query(`
  SELECT p.id, p.premise_key, p.source, p.source_ref, p.title, p.principle,
         p.domain, p.claim_type, p.numeric_value, p.numeric_unit,
         p.numeric_metric, p.influence_direction, p.evidence_quote,
         p.how_it_influences, p.applicable_contexts, p.source_file,
         p.source_doc_hash, p.record_class, p.verification_tier, p.status,
         p.structure_state, p.content_hash, p.pillar_tags,
         v.embedding::text      AS embedding_text,
         v.embedding_model       AS embedding_model
    FROM lit.premise p
    JOIN lit.premise_vector v ON v.premise_id = p.id
   WHERE p.record_class = 'CITABLE_VERIFIED'
     AND p.status = 'ACTIVE'
   ORDER BY p.premise_key`);

console.log(`  ${rows.rows.length} class-A rows with a vector`);
if (rows.rows.length === 0) {
  console.log("  nothing to copy");
  await src.end();
  await dst.end();
  process.exit(0);
}

// The premise_vector table's columns.
const vecCols = await src.query(`
  SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
   WHERE table_schema = 'lit' AND table_name = 'premise_vector'
   ORDER BY ordinal_position`);
console.log("  lit.premise_vector columns:");
for (const r of vecCols.rows) {
  console.log(`    ${r.column_name}  nullable=${r.is_nullable}`);
}

// ---------------------------------------------------------------- write
console.log("\n=== 2. WRITING TO THE TARGET ===");
const insertPremise = `
  INSERT INTO lit.premise (
    premise_key, source, source_ref, title, principle, domain, claim_type,
    numeric_value, numeric_unit, numeric_metric, influence_direction,
    evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
    source_file, source_doc_hash, structure_state, content_hash,
    record_class, verification_tier, status
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
    $20,$21,$22
  )
  ON CONFLICT (premise_key) DO UPDATE SET
    source = EXCLUDED.source,
    source_ref = EXCLUDED.source_ref,
    title = EXCLUDED.title,
    principle = EXCLUDED.principle,
    domain = EXCLUDED.domain,
    claim_type = EXCLUDED.claim_type,
    numeric_value = EXCLUDED.numeric_value,
    numeric_unit = EXCLUDED.numeric_unit,
    numeric_metric = EXCLUDED.numeric_metric,
    influence_direction = EXCLUDED.influence_direction,
    evidence_quote = EXCLUDED.evidence_quote,
    how_it_influences = EXCLUDED.how_it_influences,
    applicable_contexts = EXCLUDED.applicable_contexts,
    pillar_tags = EXCLUDED.pillar_tags,
    source_file = EXCLUDED.source_file,
    source_doc_hash = EXCLUDED.source_doc_hash,
    structure_state = EXCLUDED.structure_state,
    content_hash = EXCLUDED.content_hash,
    record_class = EXCLUDED.record_class,
    verification_tier = EXCLUDED.verification_tier,
    status = EXCLUDED.status
  RETURNING id`;

const insertVector = `
  INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
  VALUES ($1, $2::vector, $3)
  ON CONFLICT (premise_id) DO UPDATE SET
    embedding = EXCLUDED.embedding,
    embedding_model = EXCLUDED.embedding_model`;

let written = 0;
let failed = 0;
const failures = [];

for (const r of rows.rows) {
  try {
    const p = await dst.query(insertPremise, [
      r.premise_key, r.source, r.source_ref, r.title, r.principle, r.domain,
      r.claim_type, r.numeric_value, r.numeric_unit, r.numeric_metric,
      r.influence_direction, r.evidence_quote, r.how_it_influences,
      r.applicable_contexts, r.pillar_tags, r.source_file, r.source_doc_hash,
      r.structure_state, r.content_hash, r.record_class, r.verification_tier,
      r.status,
    ]);
    const pid = p.rows[0]?.id;
    if (!pid) throw new Error("no id returned");
    await dst.query(insertVector, [pid, r.embedding_text, r.embedding_model]);
    written++;
  } catch (e) {
    failed++;
    failures.push({ key: r.premise_key, error: e instanceof Error ? e.message : String(e) });
  }
  if (written % 100 === 0 && written > 0) {
    process.stdout.write(`  ${written}/${rows.rows.length}\r`);
  }
}
console.log(`\n  written: ${written}`);
console.log(`  failed:  ${failed}`);
for (const f of failures.slice(0, 10)) {
  console.log(`    ${f.key}: ${f.error}`);
}

// ---------------------------------------------------------------- verify
console.log("\n=== 3. VERIFYING THE TARGET ===");
const dist = await dst.query(`
  SELECT COALESCE(record_class, '(null)') AS cls,
         COALESCE(status, '(null)')        AS st,
         count(*)::int                      AS n
    FROM lit.premise GROUP BY 1, 2 ORDER BY 3 DESC`);
console.log("  the target's class distribution:");
for (const r of dist.rows) {
  console.log(`    ${String(r.n).padStart(7)}  ${r.cls} / ${r.st}`);
}

const vecCount = await dst.query(`
  SELECT count(*)::int AS n
    FROM lit.premise_vector v
    JOIN lit.premise p ON p.id = v.premise_id
   WHERE p.record_class = 'CITABLE_VERIFIED' AND p.status = 'ACTIVE'`);
console.log(`  class-A rows WITH a vector: ${vecCount.rows[0].n}`);

// The honest invariant: NO non-class-A row may carry the EXACT tier
// or a span, because the schema's CHECK forbids it. Verify the
// constraint is actually enforced on the target.
const breach = await dst.query(`
  SELECT count(*)::int AS n FROM lit.premise
   WHERE record_class <> 'CITABLE_VERIFIED'
     AND verification_tier = 'MSVH_S1_EXACT'`);
console.log(`  non-class-A rows claiming MSVH_S1_EXACT: ${breach.rows[0].n}`);

// The ANN returns what was asked for.
const ann = await dst.query(`
  SELECT p.premise_key, (1 - (v.embedding <=> $1::vector))::double precision AS sim
    FROM lit.premise_vector v
    JOIN lit.premise p ON p.id = v.premise_id
   WHERE p.record_class = 'CITABLE_VERIFIED' AND p.status = 'ACTIVE'
   ORDER BY v.embedding <=> $1::vector
   LIMIT 5`, [rows.rows[0].embedding_text]);
console.log(`  the ANN returns ${ann.rows.length} rows (asked for 5)`);
for (const r of ann.rows) console.log(`    ${r.sim.toFixed(4)}  ${r.premise_key}`);

await src.end();
await dst.end();
