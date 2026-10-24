#!/usr/bin/env node
/**
 * VERIFY THE REBUILT CORPUS AGAINST THE INDEPENDENT GATE.
 *
 * The builder's own referee is inside the builder, so it could be wrong in
 * the same way the builder is wrong. This runs the SEPARATE gate module
 * (packages/prediction-engine/src/literature/literature-verification.ts)
 * over the corpus the builder just wrote, and reports the class table and
 * the per-layer results.
 *
 * It also checks the two properties the class system promises:
 *   1. every CITABLE_VERIFIED record's span selects its quote from the
 *      document it names;
 *   2. NO non-citable record claims a span or the EXACT tier.
 *
 * Reproduce: node reconciliation/verify-rebuilt-corpus.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const { verifyCorpus } = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/literature/literature-verification.ts")).href
);

const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}
console.log(`corpus records: ${records.length}`);

// ---- index every source file the corpus cites, BY PATH ----
// The corpus names its source by basename AND by repo-relative path. The
// path is authoritative: 29 of the 69 cited basenames exist in more than
// one place, and the offsets are only meaningful against the file the
// record was read from.
const cited = new Set(records.map((r) => r.source_file).filter(Boolean));
const byBase = new Map(); // basename -> [{rel, text}]
const byPath = new Map(); // rel path -> text

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
    const rel = relative(root, p).split("\\").join("/");
    byPath.set(rel, text);
    if (!byBase.has(e)) byBase.set(e, []);
    byBase.get(e).push({ rel, text });
  }
}
walk(root);
console.log(`cited basenames resolved: ${byBase.size} of ${cited.size}`);
console.log(`cited PATHS resolved:     ${byPath.size}`);

// ---- build the library the gate reads, keyed by BOTH ----
const library = new Map();
for (const [base, copies] of byBase) {
  // for the basename key, use the copy a record actually points at when
  // it has a path; otherwise the first copy.
  const preferred = records.find(
    (r) => r.source_file === base && r.source_path && byPath.has(r.source_path),
  );
  library.set(base, preferred ? byPath.get(preferred.source_path) : copies[0].text);
}
for (const [rel, text] of byPath) library.set(rel, text);

// ---- run the independent gate ----
const { verdicts, summary } = verifyCorpus(records, library);

console.log("");
console.log("=== INDEPENDENT L1-L4 GATE, OVER THE REBUILT CORPUS ===");
console.log(`  total records              ${summary.total}`);
console.log(`  source file not located    ${summary.source_missing}`);
console.log(`  L1 verbatim provenance     ${summary.l1_passed}  (${pct(summary.l1_passed, summary.total)})`);
console.log(`  L2 numeric containment     ${summary.l2_passed}  (${pct(summary.l2_passed, summary.total)})`);
console.log(`  L3 span anchoring          ${summary.l3_passed}  (${pct(summary.l3_passed, summary.total)})`);
console.log(`  L4 mechanism entailment    ${summary.l4_passed}  (${pct(summary.l4_passed, summary.total)})`);
console.log(`  ADMITTED (all four)        ${summary.admitted}  (${summary.admission_rate_pct}%)`);
console.log("");
console.log("  failures by layer:");
for (const [k, v] of Object.entries(summary.failed_layer_counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(18)} ${String(v).padStart(5)}  (${pct(v, summary.total)})`);
}

// ---- the class table ----
const classes = {};
for (const r of records) {
  const c = r.record_class ?? "(none)";
  classes[c] = (classes[c] ?? 0) + 1;
}
console.log("");
console.log("=== THE THREE-CLASS PARTITION ===");
for (const [k, v] of Object.entries(classes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(26)} ${String(v).padStart(5)}  (${pct(v, records.length)})`);
}

// ---- THE TWO HONESTY INVARIANTS ----
console.log("");
console.log("=== HONESTY INVARIANTS ===");
let citableBad = 0;
let uncitableBad = 0;
const badSamples = [];
for (const r of records) {
  const cls = r.record_class;
  const span = r.evidence_span;
  const hasSpan = typeof span?.start_char === "number" && typeof span?.end_char === "number";
  if (cls === "CITABLE_VERIFIED") {
    // the offsets must select the quote from the document it names
    const doc = r.source_path ? byPath.get(r.source_path) : undefined;
    const ok =
      doc !== undefined &&
      typeof span?.start_char === "number" &&
      typeof span?.end_char === "number" &&
      doc.slice(span.start_char, span.end_char) === r.evidence_quote;
    if (!ok) {
      citableBad++;
      if (badSamples.length < 6) badSamples.push({ item_id: r.item_id, src: r.source_path, span });
    }
  } else {
    // a non-citable record must NOT claim a span or the EXACT tier
    const claimsSpan = hasSpan;
    const claimsExact =
      r.verification_tier === "MSVH_S1_EXACT" || span?.verification_tier === "MSVH_S1_EXACT";
    if (claimsSpan || claimsExact) {
      uncitableBad++;
      if (badSamples.length < 6)
        badSamples.push({
          item_id: r.item_id,
          cls,
          claimsSpan,
          claimsExact,
          tier: r.verification_tier,
        });
    }
  }
}
console.log(
  `  CITABLE_VERIFIED records whose span does NOT select their quote : ${citableBad}`,
);
console.log(
  `  non-citable records claiming a span or the EXACT tier          : ${uncitableBad}`,
);
for (const s of badSamples) console.log("   ", JSON.stringify(s));

// ---- per class, under the independent gate ----
const byClass = {};
for (let i = 0; i < records.length; i++) {
  const r = records[i];
  const v = verdicts[i];
  const c = r.record_class ?? "(none)";
  byClass[c] = byClass[c] ?? { n: 0, admitted: 0, l1: 0, l3: 0, l2: 0, l4: 0 };
  byClass[c].n++;
  if (v.admitted) byClass[c].admitted++;
  if (v.l1_provenance) byClass[c].l1++;
  if (v.l2_numeric_containment) byClass[c].l2++;
  if (v.l3_span_anchoring) byClass[c].l3++;
  if (v.l4_mechanism_entailment) byClass[c].l4++;
}
console.log("");
console.log("=== PER CLASS, UNDER THE INDEPENDENT GATE ===");
for (const [c, v] of Object.entries(byClass).sort((a, b) => b[1].n - a[1].n)) {
  console.log(
    `  ${c.padEnd(26)} n=${String(v.n).padStart(5)}  L1=${String(v.l1).padStart(5)}  L2=${String(v.l2).padStart(5)}  L3=${String(v.l3).padStart(5)}  L4=${String(v.l4).padStart(5)}  ADMITTED=${String(v.admitted).padStart(5)}`,
  );
}

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : "n/a";
}
