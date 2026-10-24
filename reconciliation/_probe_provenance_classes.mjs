#!/usr/bin/env node
/**
 * Classify every MIND corpus record by the PROVENANCE class it really has,
 * against the source documents the records name.
 *
 * Question: for each record, is the evidence_quote a VERBATIM substring of
 * the document named by source_file, and do the recorded offsets select it?
 *
 * Reproduce: node reconciliation/_probe_provenance_classes.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

const wanted = new Set(records.map((r) => r.source_file).filter(Boolean));
const library = new Map();

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (e === "node_modules" || e === ".git") continue;
      walk(p);
    } else if (wanted.has(e) && !library.has(e)) {
      try {
        library.set(e, readFileSync(p, "utf8"));
      } catch {
        /* unreadable */
      }
    }
  }
}
for (const d of ["docs", "packages/prediction-engine/data", "data", "research", "intelligence"]) {
  walk(resolve(root, d));
}

const cls = {
  quoted_doc_span_ok: 0,
  quoted_doc_span_bad: 0,
  quote_not_in_doc: 0,
  doc_not_found: 0,
};
const byExt = {};
const mdJoin = { withJoin: 0, withoutJoin: 0 };
let joinQuoteNotInDoc = 0;
let joinQuoteInDoc = 0;
const noDocSamples = [];
const notInDocSamples = [];
const spanBadSamples = [];

for (const r of records) {
  const file = r.source_file;
  const ext = file ? extname(file) : "(none)";
  byExt[ext] = byExt[ext] ?? { n: 0, inDoc: 0, notInDoc: 0, noDoc: 0, spanOk: 0 };
  byExt[ext].n++;

  const doc = file ? library.get(file) : undefined;
  const quote = r.evidence_quote ?? "";
  const inDoc = doc !== undefined && doc.includes(quote);

  // does the recorded span select the quote FROM THE DOCUMENT?
  const sp = r.evidence_span || {};
  const s = sp.start_char;
  const e = sp.end_char;
  const spanOk =
    doc !== undefined &&
    typeof s === "number" &&
    typeof e === "number" &&
    e > s &&
    e <= doc.length &&
    doc.slice(s, e) === quote;

  if (doc === undefined) {
    cls.doc_not_found++;
    byExt[ext].noDoc++;
    if (noDocSamples.length < 6) noDocSamples.push({ item_id: r.item_id, source_file: file, quote: quote.slice(0, 70) });
  } else if (inDoc) {
    byExt[ext].inDoc++;
    if (spanOk) {
      cls.quoted_doc_span_ok++;
      byExt[ext].spanOk++;
    } else {
      cls.quoted_doc_span_bad++;
      if (spanBadSamples.length < 6)
        spanBadSamples.push({
          item_id: r.item_id,
          source_file: file,
          rec_span: [s, e],
          doc_len: doc.length,
          quote: quote.slice(0, 70),
        });
    }
  } else {
    cls.quote_not_in_doc++;
    byExt[ext].notInDoc++;
    if (notInDocSamples.length < 6)
      notInDocSamples.push({ item_id: r.item_id, source_file: file, quote: quote.slice(0, 70) });
  }

  // md table rows: the builder joins cells with " - ", producing a string
  // that is not verbatim in the document.
  const looksJoined = quote.includes(" - ");
  mdJoin[looksJoined ? "withJoin" : "withoutJoin"]++;
  if (!inDoc && doc !== undefined) {
    if (looksJoined) joinQuoteNotInDoc++;
    else joinQuoteInDoc++;
  }
}

console.log(`corpus records: ${records.length}`);
console.log(`source library: ${library.size} of ${wanted.size} cited files located`);
console.log("");
console.log("=== PROVENANCE CLASSES (against the real source documents) ===");
console.log(`  quote IS verbatim in the named document   ${cls.quoted_doc_span_ok + cls.quoted_doc_span_bad}`);
console.log(`     ...of which the recorded span selects it ${cls.quoted_doc_span_ok}`);
console.log(`     ...of which the recorded span does NOT   ${cls.quoted_doc_span_bad}`);
console.log(`  quote is NOT in the named document         ${cls.quote_not_in_doc}`);
console.log(`  named document could not be located        ${cls.doc_not_found}`);
console.log("");
console.log("=== BY SOURCE EXTENSION ===");
for (const [ext, v] of Object.entries(byExt).sort((a, b) => b[1].n - a[1].n)) {
  console.log(
    `  ${ext.padEnd(6)} n=${String(v.n).padStart(5)}  inDoc=${String(v.inDoc).padStart(5)}  notInDoc=${String(v.notInDoc).padStart(5)}  noDoc=${String(v.noDoc).padStart(4)}  spanOk=${String(v.spanOk).padStart(5)}`,
  );
}
console.log("");
console.log(`quotes containing a " - " join: ${mdJoin.withJoin} (no join: ${mdJoin.withoutJoin})`);
console.log(`  of the not-in-doc ones: joined=${joinQuoteNotInDoc} not-joined=${joinQuoteInDoc}`);
console.log("");
console.log("SAMPLE quote_not_in_doc:");
for (const s of notInDocSamples) console.log("  ", JSON.stringify(s));
console.log("SAMPLE span_does_not_select:");
for (const s of spanBadSamples) console.log("  ", JSON.stringify(s));
console.log("SAMPLE doc_not_found:");
for (const s of noDocSamples) console.log("  ", JSON.stringify(s));
