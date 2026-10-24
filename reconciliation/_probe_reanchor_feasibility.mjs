#!/usr/bin/env node
/**
 * RE-ANCHORING FEASIBILITY (spec Section 1.3).
 *
 * The spec orders a re-anchoring pass over
 * docs/research/2026-09-21/arxiv-deep/ (claimed: 1,511 deep extractions)
 * plus 429 Kaggle dataset descriptions, to re-bind detached quotes to
 * their true source documents.
 *
 * MEASURED PREMISE CHECK:
 *   docs/research/2026-09-21/arxiv-deep/  ->  1 file, not 1,511
 *   docs/agent-index/PAPER-CATALOG.md     ->  does not exist
 *   kaggle dataset descriptions           ->  9 files matching *kaggle*
 *
 * So the pass is run against what ACTUALLY exists, and this probe reports
 * how many detached quotes could be re-bound, and to where.
 *
 * Reproduce: node reconciliation/_probe_reanchor_feasibility.mjs
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

// ---- every candidate re-anchor target in the repo ----
const EXCLUDE = /(MIND_CORPUS_3000|MIND_CORPUS_5000|concept_grader_run|l1_l4_admission_gate_truthful)/;
const targets = [];
function walk(dir, depth = 0) {
  if (depth > 8) return;
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
      walk(p, depth + 1);
      continue;
    }
    if (!/\.(json|jsonl|md|txt)$/i.test(e)) continue;
    if (EXCLUDE.test(e)) continue;
    try {
      if (st.size > 40_000_000) continue;
      targets.push({ rel: relative(root, p).split("\\").join("/"), t: readFileSync(p, "utf8") });
    } catch {
      /* unreadable */
    }
  }
}
walk(root);
console.log(`candidate re-anchor targets in the repo: ${targets.length}`);

// ---- which detached quotes (quote NOT in its cited file) can be re-bound? ----
const citedText = new Map();
for (const { rel, t } of targets) {
  const base = rel.split("/").pop();
  if (!citedText.has(base)) citedText.set(base, t);
}

let detached = 0;
let reanchorable = 0;
const reanchorExamples = [];
let alreadyInPlace = 0;

for (const r of records) {
  const q = r.evidence_quote ?? "";
  const f = r.source_file;
  if (!q || !f) continue;
  const cited = citedText.get(f);
  if (cited !== undefined && cited.includes(q)) {
    alreadyInPlace++;
    continue;
  }
  detached++;
  // can the quote be found in a DIFFERENT file?
  let hit = null;
  for (const { rel, t } of targets) {
    if (rel.split("/").pop() === f) continue; // not the same file
    if (t.includes(q)) {
      hit = rel;
      break;
    }
  }
  if (hit) {
    reanchorable++;
    if (reanchorExamples.length < 15)
      reanchorExamples.push({ item_id: r.item_id, was: f, now: hit });
  }
}

console.log("");
console.log("=== RE-ANCHORING FEASIBILITY ===");
console.log(`  quotes already byte-present in their cited file : ${alreadyInPlace}`);
console.log(`  quotes detached from their cited file            : ${detached}`);
console.log(`  ...of which re-bindable to ANOTHER repo file    : ${reanchorable}`);
console.log(`  ...of which find NO home in the repo            : ${detached - reanchorable}`);
console.log("");
console.log("  re-anchorable examples:");
for (const s of reanchorExamples) console.log("   ", JSON.stringify(s));
