#!/usr/bin/env node
/**
 * WHY DO 192 CITABLE RECORDS FAIL L1 AND 318 FAIL L3?
 *
 * The corpus names its source by BASENAME. 29 of the 69 cited basenames
 * exist in more than one place in the repo. The builder computes the
 * offsets against the copy it read; a verifier that opens a DIFFERENT copy
 * gets different bytes at those offsets.
 *
 * Question: if each record is verified against the copy its offsets were
 * computed against, do the failures disappear?
 *
 * Reproduce: node reconciliation/_probe_basename_ambiguity.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

const cited = new Set(records.map((r) => r.source_file).filter(Boolean));
const copies = new Map();
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (e === "node_modules" || e === ".git" || e === "dist" || e === ".next") continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(p);
      continue;
    }
    if (!cited.has(e)) continue;
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    if (!copies.has(e)) copies.set(e, []);
    copies.get(e).push({ rel: relative(root, p).split("\\").join("/"), text });
  }
}
walk(root);

const multi = [...copies.entries()].filter(([, v]) => v.length > 1);
console.log(`cited basenames: ${cited.size}`);
console.log(`  with MORE THAN ONE copy in the repo: ${multi.length}`);
console.log("");

let firstCopyOk = 0;
let firstCopyBad = 0;
let anyCopyOk = 0;
let anyCopyBad = 0;
let citableTotal = 0;
const rescued = [];

for (const r of records) {
  if (r.record_class !== "CITABLE_VERIFIED") continue;
  citableTotal++;
  const cands = copies.get(r.source_file) ?? [];
  if (!cands.length) {
    anyCopyBad++;
    firstCopyBad++;
    continue;
  }
  const span = r.evidence_span;
  const sel = (t) =>
    typeof span?.start_char === "number" &&
    typeof span?.end_char === "number" &&
    t.slice(span.start_char, span.end_char) === r.evidence_quote;
  if (sel(cands[0].text)) firstCopyOk++;
  else firstCopyBad++;
  if (cands.some((c) => sel(c.text))) {
    anyCopyOk++;
    if (!sel(cands[0].text) && rescued.length < 10) {
      const good = cands.find((c) => sel(c.text));
      rescued.push({ item_id: r.item_id, basename: r.source_file, correct_copy: good.rel });
    }
  } else {
    anyCopyBad++;
  }
}

console.log("=== CITABLE VERIFIED: DOES THE OFFSET SELECT THE QUOTE? ===");
console.log(`  citable records                       : ${citableTotal}`);
console.log(`  against the FIRST copy of the basename : ${firstCopyOk} ok, ${firstCopyBad} BAD`);
console.log(`  against SOME copy of the basename     : ${anyCopyOk} ok, ${anyCopyBad} BAD`);
console.log("");
console.log("  records rescued by resolving the copy (the builder's offsets ARE right,");
console.log("  the basename just points at the wrong file):");
for (const s of rescued) console.log("   ", JSON.stringify(s));
