#!/usr/bin/env node
/**
 * VERIFY THE RE-ANCHORED CORPUS.
 *
 * The re-anchoring pass writes a NEW file and leaves the corpus alone.
 * This checks the new file against the independent gate, and checks the
 * properties that make the class system worth anything:
 *
 *   1. every CITABLE_VERIFIED record's span selects its quote from the
 *      document it names
 *   2. no non-citable record claims a span or the EXACT tier
 *   3. every STATUS is true of its record
 *
 * (3) is the check that matters most: a status that does not describe
 * the record is the same defect as a tier that does not describe the
 * span, and the whole status vocabulary was added to prevent exactly
 * that.
 *
 * Reproduce: node reconciliation/_verify_reanchored_corpus.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
register(new URL("./ts-resolve-hook.mjs", import.meta.url));
const { verifyCorpus } = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/literature/literature-verification.ts")).href
);

const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.reanchored.jsonl");
const MAIN = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
if (!existsSync(CORPUS)) {
  console.log("reanchored corpus not present; run scripts/reanchor-mind-corpus.mjs first");
  process.exit(1);
}

const records = readFileSync(CORPUS, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const main = readFileSync(MAIN, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const mainById = new Map(main.map((r) => [r.item_id, r]));

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!cond) failures++;
}

// ---- the library: every source the records name, by path and basename ----
const library = new Map();
const byPath = new Map();
const cited = new Set(records.map((r) => r.source_path).filter(Boolean));
for (const rel of cited) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, "utf8");
  byPath.set(rel, text);
  library.set(rel, text);
  const base = rel.split("/").pop();
  if (!library.has(base)) library.set(base, text);
}

const { summary } = verifyCorpus(records, library);

console.log("=== THE RE-ANCHORED CORPUS UNDER THE INDEPENDENT GATE ===");
console.log(`  records                     ${summary.total}`);
console.log(`  L1 verbatim provenance      ${summary.l1_passed}`);
console.log(`  L2 numeric containment      ${summary.l2_passed}`);
console.log(`  L3 span anchoring           ${summary.l3_passed}`);
console.log(`  L4 mechanism entailment     ${summary.l4_passed}`);
console.log(`  ADMITTED (all four)         ${summary.admitted}`);

console.log("\n=== THE CLASS / STATUS TABLE ===");
const table = {};
for (const r of records) {
  const k = `${r.record_class} / ${r.status}`;
  table[k] = (table[k] ?? 0) + 1;
}
for (const [k, v] of Object.entries(table).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(5)}  ${k}`);
}

console.log("\n=== THE HONESTY INVARIANTS ===");
let citableBad = 0;
let uncitableBad = 0;
let statusLies = 0;
const lyingSamples = [];
for (const r of records) {
  const span = r.evidence_span;
  const hasSpan = typeof span?.start_char === "number";
  if (r.record_class === "CITABLE_VERIFIED") {
    const doc = r.source_path ? byPath.get(r.source_path) : undefined;
    const ok =
      doc !== undefined &&
      typeof span?.start_char === "number" &&
      typeof span?.end_char === "number" &&
      doc.slice(span.start_char, span.end_char) === r.evidence_quote;
    if (!ok) citableBad++;
  } else {
    if (hasSpan) uncitableBad++;
    if (r.citable !== false) uncitableBad++;
    if (r.verification_tier === "MSVH_S1_EXACT") uncitableBad++;
  }

  const doc = r.source_path ? byPath.get(r.source_path) : undefined;
  const quoteInDoc = doc !== undefined && doc.includes(r.evidence_quote);
  const lies =
    (r.status === "LINK_VERIFIED_SEMANTIC_FAIL" && !quoteInDoc) ||
    (r.status === "UNCITED_NO_SOURCE" && quoteInDoc) ||
    (r.status === "ACTIVE" && !quoteInDoc);
  if (lies) {
    statusLies++;
    if (lyingSamples.length < 5) {
      lyingSamples.push({ id: r.item_id, status: r.status, cls: r.record_class });
    }
  }
}
check("every CITABLE_VERIFIED record's span selects its quote", citableBad === 0, `${citableBad} bad`);
check("no non-citable record claims a span or the EXACT tier", uncitableBad === 0, `${uncitableBad} violations`);
check("every status is TRUE of its record", statusLies === 0, `${statusLies} lying statuses`);
for (const s of lyingSamples) console.log("     ", JSON.stringify(s));

console.log("\n=== DID THE RE-ANCHORING DO WHAT IT CLAIMS? ===");
// A re-anchored record's STATUS is ACTIVE (it is admitted); the detail
// of what the pass did is in `reanchor_detail`. Two vocabularies for one
// field is the drift this whole work is about, so the status vocabulary
// is the builder's and the pass detail is a separate field.
const moved = records.filter((r) => String(r.reanchor_detail ?? "").startsWith("REANCHORED"));
let movedGood = 0;
for (const r of moved) {
  const doc = r.source_path ? byPath.get(r.source_path) : undefined;
  if (doc === undefined) continue;
  const span = r.evidence_span;
  if (
    typeof span?.start_char === "number" &&
    typeof span?.end_char === "number" &&
    doc.slice(span.start_char, span.end_char) === r.evidence_quote
  ) {
    movedGood++;
  }
}
console.log(`  records the pass marked as re-anchored : ${moved.length}`);
check(
  "each re-anchored record's span selects its quote in its NEW document",
  movedGood === moved.length,
  `${movedGood}/${moved.length}`,
);

const quarantined = records.filter((r) => r.reanchor_detail === "QUARANTINED");
let qGood = 0;
for (const r of quarantined) {
  if (r.citable === false && r.record_class !== "CITABLE_VERIFIED") qGood++;
}
check("every quarantined record is non-citable", qGood === quarantined.length, `${qGood}/${quarantined.length}`);

console.log("\n=== WHAT CHANGED FROM THE MAIN CORPUS ===");
let relinked = 0;
let classChanged = 0;
for (const r of records) {
  const m = mainById.get(r.item_id);
  if (!m) continue;
  if (m.source_path !== r.source_path) relinked++;
  if (m.record_class !== r.record_class) classChanged++;
}
console.log(`  records whose source_path changed : ${relinked}`);
console.log(`  records whose class changed       : ${classChanged}`);
console.log(`  main corpus CITABLE_VERIFIED     : ${main.filter((r) => r.record_class === "CITABLE_VERIFIED").length}`);
console.log(`  reanchored corpus CITABLE_VERIFIED: ${records.filter((r) => r.record_class === "CITABLE_VERIFIED").length}`);

console.log(`\nVERDICT: ${failures === 0 ? "the re-anchored corpus is honest" : `${failures} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
