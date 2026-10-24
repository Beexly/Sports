#!/usr/bin/env node
/**
 * WHY are 3,509 quotes absent from the document they name?
 *
 * Two candidate mechanisms, tested separately:
 *   (A) BASENAME COLLISION. `source_file` is a basename, but the same
 *       basename exists in MULTIPLE scanned directories. The record was
 *       harvested from file X, but the basename resolves to file Y.
 *   (B) SYNTHESISED TEXT. The builder manufactures the "abstract" (Pinnacle
 *       market rows, markdown table rows joined with " - ") so the quote it
 *       extracts can never be a substring of the document.
 *
 * Reproduce: node reconciliation/_probe_missing_quote_mechanism.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

// ---- the builder's own scan dirs, verbatim from the builder ----
const jsonDirs = [
  "docs/arxiv-program/research/2026-10-17",
  "docs/data-sources/research/2026-10-17",
  "docs/fantasy/research/2026-09-18/statrankings",
  "docs/predictions/research/2026-10-17",
  "docs/predictions/research/2026-10-13",
  "docs/props/research/2026-10-13",
  "docs/research/2026-09-19-dk-week2",
  "docs/data-sources/research/2026-10-13/cognitive/_raw",
  "docs/predictions/research/2026-10-11",
  "docs/data-sources/research/2026-10-13/pinnacle",
  "docs/arxiv-program/research/2026-09-21/arxiv-program/phase2/search",
  "docs/engine/research/2026-10-13",
];

// basename -> list of full paths
const byBasename = new Map();
for (const d of jsonDirs) {
  const abs = resolve(root, d);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).filter((f) => f.endsWith(".json"))) {
    if (f.includes("NAVIER_STOKES_400") || f.includes("MIND_CORPUS")) continue;
    const p = join(abs, f);
    if (!byBasename.has(f)) byBasename.set(f, []);
    byBasename.get(f).push(p);
  }
}
console.log("=== BASENAME COLLISIONS AMONG THE BUILDER'S OWN SCAN DIRS ===");
let collided = 0;
const collList = [];
for (const [b, paths] of byBasename) {
  if (paths.length > 1) {
    collided++;
    collList.push({ basename: b, copies: paths.length });
  }
}
console.log(`  distinct basenames scanned : ${byBasename.size}`);
console.log(`  basenames with >1 copy     : ${collided}`);
for (const c of collList.sort((a, b) => b.copies - a.copies).slice(0, 12)) {
  console.log(`    ${c.copies} copies  ${c.basename}`);
}

// ---- can the quote be found in ANOTHER copy of the same basename? ----
const textCache = new Map();
function textOf(p) {
  if (!textCache.has(p)) {
    try {
      textCache.set(p, readFileSync(p, "utf8"));
    } catch {
      textCache.set(p, undefined);
    }
  }
  return textCache.get(p);
}

let explainedByCollision = 0;
let explainedByNeither = 0;
const unexplained = [];
const collisionExamples = [];

for (const r of records) {
  const file = r.source_file;
  if (!file) continue;
  const copies = byBasename.get(file);
  if (!copies) continue; // curated / md
  const quote = r.evidence_quote ?? "";
  let found = false;
  for (const p of copies) {
    const t = textOf(p);
    if (t !== undefined && t.includes(quote)) {
      found = true;
      if (collisionExamples.length < 8 && copies.length > 1) {
        collisionExamples.push({
          item_id: r.item_id,
          basename: file,
          copies: copies.length,
          found_in: p.replace(root, ""),
        });
      }
      break;
    }
  }
  if (found) explainedByCollision++;
  else {
    explainedByNeither++;
    if (unexplained.length < 10) {
      unexplained.push({
        item_id: r.item_id,
        source_file: file,
        copies: copies.length,
        quote: quote.slice(0, 80),
      });
    }
  }
}

console.log("");
console.log("=== MECHANISM FOR JSON-SOURCED RECORDS ===");
console.log(`  quote found in SOME copy of the cited basename : ${explainedByCollision}`);
console.log(`  quote in NO copy of the cited basename          : ${explainedByNeither}`);
console.log("");
console.log("  examples where the quote is in a DIFFERENT copy of the same basename:");
for (const c of collisionExamples) console.log("   ", JSON.stringify(c));
console.log("  examples where the quote is in NO copy:");
for (const c of unexplained) console.log("   ", JSON.stringify(c));

// ---- markdown: is the quote a slice of a joined table row? ----
console.log("");
console.log("=== MARKDOWN ROWS: is the 'abstract' a SYNTHESIS rather than document text? ===");
const mdRecs = records.filter((r) => r.source_file && r.source_file.endsWith(".md"));
console.log(`  md-sourced records: ${mdRecs.length}`);
const mdWithJoin = mdRecs.filter((r) => (r.evidence_quote || "").includes(" - "));
console.log(`  ...whose evidence_quote contains a " - " join : ${mdWithJoin.length}`);
const mdTitle = mdRecs.filter((r) => (r.title || "").startsWith("NFL Sports Analysis ["));
console.log(`  ...whose title is the builder's md-row template: ${mdTitle.length}`);
console.log("  sample md record:");
if (mdRecs[0]) {
  console.log("   ", JSON.stringify({
    item_id: mdRecs[0].item_id,
    source_file: mdRecs[0].source_file,
    title: (mdRecs[0].title || "").slice(0, 80),
    evidence_quote: (mdRecs[0].evidence_quote || "").slice(0, 100),
  }));
}
