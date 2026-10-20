#!/usr/bin/env node
/**
 * WHY DO 3,314 RECORDS FAIL L2?
 *
 * L2 is the only layer still cutting a large number of records. It asks
 * for the record's numeric_claim to appear LITERALLY in the quote,
 * bounded by non-digit characters, with no unit-word escape.
 *
 * This breaks the failures down by cause, so the fix targets a cause and
 * not a symptom.
 *
 * Reproduce: node reconciliation/_probe_l2_failures.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
register(new URL("./ts-resolve-hook.mjs", import.meta.url));
const { verifyCorpus, resolveSource } = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/literature/literature-verification.ts")).href
);

const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

const cited = new Set(records.map((r) => r.source_file).filter(Boolean));
const byPath = new Map();
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
    try {
      byPath.set(relative(root, p).split("\\").join("/"), readFileSync(p, "utf8"));
    } catch {
      /* skip */
    }
  }
}
walk(root);

const library = new Map();
for (const r of records) {
  if (r.source_path && byPath.has(r.source_path)) library.set(r.source_path, byPath.get(r.source_path));
}
for (const [p, t] of byPath) library.set(p, t);

const { verdicts } = verifyCorpus(records, library);

const causes = {};
const samples = {};
for (let i = 0; i < records.length; i++) {
  const r = records[i];
  const v = verdicts[i];
  if (v.l2_numeric_containment) continue;
  if (!v.l1_provenance) continue; // only look at records whose quote IS real

  const claim = r.numeric_claim;
  const q = r.evidence_quote ?? "";

  let cause;
  if (claim === null || claim === undefined) {
    cause = "NO_NUMERIC_CLAIM";
  } else if (typeof claim === "object") {
    const val = claim.value;
    if (val === null || val === undefined) {
      cause = "CLAIM_HAS_NO_VALUE";
    } else if (typeof val === "string" && val.trim() === "") {
      cause = "CLAIM_VALUE_EMPTY_STRING";
    } else {
      const s = String(val);
      if (!q.includes(s)) {
        cause = "VALUE_ABSENT_FROM_QUOTE";
      } else {
        // the number IS present but not token-bounded: e.g. 0.25 in 10.253
        cause = "NOT_TOKEN_BOUNDED";
      }
    }
  } else {
    cause = "CLAIM_IS_STRING";
  }
  causes[cause] = (causes[cause] ?? 0) + 1;
  if (!samples[cause]) samples[cause] = [];
  if (samples[cause].length < 4) {
    samples[cause].push({
      item_id: r.item_id,
      claim: typeof claim === "object" ? claim : claim,
      quote_head: q.slice(0, 110),
    });
  }
}

console.log("=== L2 FAILURE CAUSES, restricted to records whose quote IS in the document ===");
const tot = Object.values(causes).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(causes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(26)} ${String(v).padStart(5)}  (${((v / tot) * 100).toFixed(1)}%)`);
}
console.log(`  ${"TOTAL".padEnd(26)} ${String(tot).padStart(5)}`);
for (const [k, arr] of Object.entries(samples)) {
  console.log(`\n--- ${k}`);
  for (const s of arr) console.log("   ", JSON.stringify(s));
}
