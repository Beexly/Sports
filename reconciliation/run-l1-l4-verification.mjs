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
console.log("wrote reconciliation/l1_l4_admission_gate_truthful.json");
