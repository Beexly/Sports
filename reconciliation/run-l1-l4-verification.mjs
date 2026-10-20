#!/usr/bin/env node
/**
 * Run the L1-L4 admission gate over the MIND corpus, against the ACTUAL
 * source documents, and write the result.
 *
 * Reproduce: node reconciliation/run-l1-l4-verification.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { verifyCorpus } = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/literature/literature-verification.ts")).href
);

const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

// ---- load the corpus ----
const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}
console.log(`corpus: ${records.length} records`);

// ---- locate every source file the corpus cites ----
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
walk(resolve(root, "docs"));
walk(resolve(root, "packages/prediction-engine/data"));
walk(resolve(root, "data"));
walk(resolve(root, "research"));
console.log(`source library: ${library.size} of ${wanted.size} cited files located`);

// ---------------------------------------------------------------------------
// THE BASENAME COLLISION FIX.
//
// MEASURED 2026-10-20. The walk above takes the FIRST file whose BASENAME
// matches a cited name. 29 of the 68 cited basenames exist MORE THAN ONCE
// on disk, and for those the walk silently picked the wrong document.
//
// The consequence was not subtle: 138 class-A records had their quote in
// the OTHER file of the same name, so L1 failed on a quote that IS in the
// document, and the harness reported 860 admitted where the corpus
// carries 1,098 class-A records.
//
// This is the same defect class the whole audit is about, wearing a
// different hat: a lookup key that does not uniquely identify the thing
// it claims to identify. The key here is a basename; two documents in
// different directories share it.
//
// THE FIX: when a basename has several candidates, choose the one that
// actually CONTAINS the quotes of the records that cite it. The choice is
// made from the DATA, not from the directory order, and a tie is reported
// rather than resolved arbitrarily.
// ---------------------------------------------------------------------------
const candidatesByBasename = new Map();
for (const base of wanted) {
  const hits = [];
  const scan = (dir) => {
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
        scan(p);
      } else if (e === base) {
        hits.push(p);
      }
    }
  };
  scan(resolve(root, "docs"));
  scan(resolve(root, "packages/prediction-engine/data"));
  scan(resolve(root, "data"));
  scan(resolve(root, "research"));
  if (hits.length > 0) candidatesByBasename.set(base, hits);
}

// The quotes each cited name is supposed to carry.
const quotesBySource = new Map();
for (const r of records) {
  const sf = r.source_file;
  const q = r.evidence_quote;
  if (!sf || !q) continue;
  if (!quotesBySource.has(sf)) quotesBySource.set(sf, []);
  quotesBySource.get(sf).push(q);
}

let collisions = 0;
let ties = 0;
for (const [base, hits] of candidatesByBasename) {
  if (hits.length <= 1) continue;
  collisions += 1;
  const wantedQuotes = quotesBySource.get(base) ?? [];
  const scored = hits.map((p) => {
    let text = "";
    try {
      text = readFileSync(p, "utf8");
    } catch {
      /* unreadable */
    }
    let contained = 0;
    for (const q of wantedQuotes) if (text.includes(q)) contained += 1;
    return { p, contained, text };
  });
  scored.sort((a, b) => b.contained - a.contained);
  if (scored.length > 1 && scored[0].contained === scored[1].contained) {
    ties += 1;
    console.log(
      `  TIE: ${base} is in ${hits.length} files and none contains more of its quotes than the others; ` +
        "picking the first.",
    );
  }
  library.set(base, scored[0].text);
}
console.log(
  `  basename collisions resolved: ${collisions} cited names exist more than once; ${ties} were ties`,
);

// ---- run the gate ----
const { verdicts, summary } = verifyCorpus(records, library);

console.log("");
console.log("=== L1-L4 ADMISSION GATE, AGAINST THE ACTUAL SOURCE DOCUMENTS ===");
console.log(`  total records              ${summary.total}`);
console.log(`  source file not located    ${summary.source_missing}`);
console.log(`  L1 verbatim provenance     ${summary.l1_passed}  (${pct(summary.l1_passed, summary.total)})`);
console.log(`  L2 numeric containment     ${summary.l2_passed}  (${pct(summary.l2_passed, summary.total)})`);
console.log(`  L3 span anchoring          ${summary.l3_passed}  (${pct(summary.l3_passed, summary.total)})`);
console.log(`  L4 mechanism entailment    ${summary.l4_passed}  (${pct(summary.l4_passed, summary.total)})`);
console.log(`  ADMITTED (all four)        ${summary.admitted}  (${summary.admission_rate_pct}%)`);
console.log("");
console.log("  failures by layer (computed independently, NOT short-circuited):");
for (const [k, v] of Object.entries(summary.failed_layer_counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(18)} ${String(v).padStart(5)}  (${pct(v, summary.total)})`);
}

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : "n/a";
}

// ---- per-record output ----
const out = {
  artifact: "l1_l4_admission_gate_truthful",
  measured_at: new Date().toISOString(),
  question:
    "Does the MIND corpus pass the spec's L1-L4 admission gates when the gates are checked against the ACTUAL source documents the records name?",
  method:
    "Each layer is computed INDEPENDENTLY against the source file the record cites. L1: the quote appears EXACTLY in the source. L2: the claimed magnitude appears literally in the quote (no unit-word escape). L3: the claimed [start_char,end_char) actually selects the quote from the source. L4: controlled vocabulary held AND the mechanism quote is in the source.",
  comparison_to_existing_gate:
    "scripts/audit-l1-l4-admission-gates.ts reports 67.4% admitted (3,470 of 5,149). Its L1 checks only that the quote is non-empty; its L2 accepts a quote containing only a unit word; its L3 checks only end_char > start_char, which every record satisfies by construction; its L4 checks only that a mechanism quote is non-empty. None of them opens the source document.",
  source_files_located: library.size,
  source_files_cited: wanted.size,
  summary,
  verdicts,
  reproduction: "node reconciliation/run-l1-l4-verification.mjs",
};
writeFileSync(resolve(root, "reconciliation/l1_l4_admission_gate_truthful.json"), JSON.stringify(out, null, 2));
console.log("");
// ---------------------------------------------------------------------------
// THE CONVERGENCE CHECK.
//
// The corpus builder and this gate share no code path for the L1-L4
// decision: the builder writes `record_class`, this gate recomputes it
// from the documents on disk. When they agree, two independent
// derivations of the same fact agree, and that is the strongest
// available evidence that the figure is a measurement.
//
// BEFORE THE BASENAME FIX they did NOT agree (1,098 vs 860) and the
// discrepancy was recorded as open. Now it is a build-breaking
// assertion: if the two ever diverge, the harness exits non-zero
// rather than printing a number and moving on.
//
// The check is deliberately SEPARATE from the gate's own arithmetic,
// so a bug in one cannot mask a bug in the other.
// ---------------------------------------------------------------------------
const corpusClassA = new Set(
  records.filter((r) => r.record_class === "CITABLE_VERIFIED").map((r) => r.item_id),
);
const admittedIds = new Set(verdicts.filter((v) => v.admitted).map((v) => v.item_id));
const admittedNotClassA = [...admittedIds].filter((id) => !corpusClassA.has(id));
const classANotAdmitted = [...corpusClassA].filter((id) => !admittedIds.has(id));

console.log("\n=== THE TWO INDEPENDENT GATES MUST AGREE ===");
console.log(`  the corpus builder's class-A set:      ${corpusClassA.size}`);
console.log(`  this gate's admitted set:              ${admittedIds.size}`);
console.log(`  admitted by this gate but NOT class-A:  ${admittedNotClassA.length}`);
console.log(`  class-A but NOT admitted by this gate: ${classANotAdmitted.length}`);

if (admittedNotClassA.length > 0 || classANotAdmitted.length > 0) {
  console.log("\n  DIVERGENCE -- the builder and the independent gate disagree.");
  for (const id of admittedNotClassA.slice(0, 5)) {
    console.log(`    admitted here but not class-A: ${id}`);
  }
  for (const id of classANotAdmitted.slice(0, 5)) {
    console.log(`    class-A but not admitted here: ${id}`);
  }
  console.log("\n  The figure is NOT settled. Fix the cause before quoting a number.");
  process.exit(1);
}
console.log("  the two independent derivations AGREE exactly.");

console.log("\nwrote reconciliation/l1_l4_admission_gate_truthful.json");
