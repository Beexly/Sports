#!/usr/bin/env node
/**
 * RE-STAMP THE CLASS AND STATUS ON THE PREMISES ALREADY IN THE DB.
 *
 * The premise rows in the database were written BEFORE the record_class
 * and status columns existed, so they carry the columns' DEFAULTs:
 * HONESTLY_UNCITED_PRIOR / UNCITED_NO_SOURCE. Every one of them is
 * therefore excluded by the class filter, and the retrieval function
 * returns essentially nothing:
 *
 *   5,514 premises in the table
 *   5,511  HONESTLY_UNCITED_PRIOR / UNCITED_NO_SOURCE
 *       1  CITABLE_VERIFIED / ACTIVE
 *
 * The corpus file on disk has the truth (1,098 ACTIVE), and the loader
 * carries record_class and status through -- but a full re-load would
 * re-embed 5,434 records, and the embeddings are already correct.
 *
 * So this updates the two columns from the corpus file, keyed on
 * premise_key, and touches NOTHING else. The embeddings, the ids and
 * every other column are left exactly as they are.
 *
 * The premise_key the loader builds for a mind-corpus record is
 * derived from its source and item_id, so this reads the loader's own
 * key construction rather than guessing it.
 *
 * Reproduce: node reconciliation/_restamp_premise_classes.mjs
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
console.log(`connected to ${BRANCH} as neondb_owner`);

// The loader's key construction for a mind-corpus record is
//   premise_key: `mind:${item_id || title.slice(0, 24)}`
// (scripts/literature/build-index.cjs, mindToPremise). It is read
// from the loader's source rather than imported, because importing
// build-index.cjs RUNS the whole build.
const loader = readFileSync(resolve(root, "scripts/literature/build-index.cjs"), "utf8");
const keyMatch = loader.match(/premise_key:\s*`mind:\$\{([^}]+)\}`/);
if (!keyMatch) {
  console.error("could not read mindToPremise's premise_key construction from the loader");
  process.exit(1);
}
console.log(`loader builds premise_key as: mind:\${${keyMatch[1]}}`);

/** The loader's own key construction, verbatim. */
const mindToPremise = (rec) => {
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return null;
  const itemId = typeof rec.item_id === "string" ? rec.item_id : "";
  return {
    premise_key: `mind:${itemId || title.slice(0, 24)}`,
    record_class: typeof rec.record_class === "string" ? rec.record_class : null,
    status: typeof rec.status === "string" ? rec.status : null,
    verification_tier: typeof rec.verification_tier === "string" ? rec.verification_tier : null,
  };
};

const readJsonl = (p) =>
  readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

const corpusPath = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
const records = readJsonl(corpusPath);
console.log(`corpus file: ${records.length} records`);

const byKey = new Map();
for (const rec of records) {
  const p = mindToPremise(rec);
  if (!p) continue;
  byKey.set(p.premise_key, p);
}
console.log(`corpus records mapped to premise keys: ${byKey.size}`);

const before = await c.query(
  `SELECT record_class, status, count(*)::int AS n
     FROM lit.premise GROUP BY 1, 2 ORDER BY 3 DESC`,
);
console.log("\n=== BEFORE ===");
for (const r of before.rows) console.log(`  ${String(r.n).padStart(7)}  ${r.record_class} / ${r.status}`);

// Only the rows whose key is in the corpus file, and only the two
// columns. Nothing else is touched.
const keys = [...byKey.keys()];
let updated = 0;
const CHUNK = 500;
for (let i = 0; i < keys.length; i += CHUNK) {
  const chunk = keys.slice(i, i + CHUNK);
  const values = [];
  const params = [];
  chunk.forEach((k, j) => {
    const p = byKey.get(k);
    values.push(`($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`);
    params.push(
      k,
      p.record_class ?? "HONESTLY_UNCITED_PRIOR",
      p.status ?? "UNCITED_NO_SOURCE",
      p.verification_tier ?? null,
    );
  });
  const res = await c.query(
    `UPDATE lit.premise p
        SET record_class = v.cls, status = v.st, verification_tier = COALESCE(v.tier, p.verification_tier)
       FROM (VALUES ${values.join(",")}) AS v(key, cls, st, tier)
      WHERE p.premise_key = v.key
        AND (p.record_class IS DISTINCT FROM v.cls OR p.status IS DISTINCT FROM v.st)`,
    params,
  );
  updated += res.rowCount;
}
console.log(`\nupdated rows: ${updated}`);

const after = await c.query(
  `SELECT record_class, status, count(*)::int AS n
     FROM lit.premise GROUP BY 1, 2 ORDER BY 3 DESC`,
);
console.log("\n=== AFTER ===");
for (const r of after.rows) console.log(`  ${String(r.n).padStart(7)}  ${r.record_class} / ${r.status}`);

// The point of the whole exercise: does the retrieval function now
// return the corpus?
const emb = await c.query(
  `SELECT embedding FROM lit.premise_vector WHERE embedding IS NOT NULL LIMIT 1`,
);
if (emb.rows.length > 0) {
  const ev = emb.rows[0].embedding;
  const vec = typeof ev === "string" ? ev : `[${ev.join(",")}]`;
  console.log("\n=== DOES RETRIEVAL NOW RETURN THE CORPUS? ===");
  for (const k of [5, 20, 50]) {
    const got = await c.query(
      `SELECT count(*)::int AS n FROM lit.retrieve_premises($1::vector, $2, NULL, 0.0)`,
      [vec, k],
    );
    const n = got.rows[0].n;
    console.log(`  asked for k=${String(k).padStart(3)}  got ${String(n).padStart(3)}  ${n < k ? `SHORT by ${k - n}` : "complete"}`);
  }
}

await c.end();
