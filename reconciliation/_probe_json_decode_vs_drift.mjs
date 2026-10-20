#!/usr/bin/env node
/**
 * For JSON-sourced records whose quote is NOT byte-present in the cited
 * file, test the two remaining candidate mechanisms:
 *
 *   (M2a) HTML ENTITY / TAG DECODING. The builder runs decodeHtml() on the
 *         raw string before extracting the quote, so `&quot;` becomes `"`,
 *         `\\emph{...}` tags are stripped, and whitespace is collapsed. The
 *         DECODED text is not byte-present in the raw file.
 *   (M2b) SOURCE DRIFT. The cited file was re-fetched/rewritten AFTER the
 *         corpus was built, so the corpus quotes an older revision.
 *
 * Reproduce: node reconciliation/_probe_json_decode_vs_drift.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

// the builder's own decodeHtml, verbatim
function decodeHtml(raw) {
  if (!raw) return "";
  let s = String(raw);
  s = s.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&apos;/g, "'");
  s = s.replace(/&#39;/g, "'");
  s = s.replace(/&amp;/g, "&");
  s = s.replace(/&lt;/g, "<");
  s = s.replace(/&gt;/g, ">");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

const wanted = new Set(
  records.map((r) => r.source_file).filter((f) => f && f.endsWith(".json")),
);
const lib = new Map();
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
    } else if (wanted.has(e) && !lib.has(e)) {
      try {
        lib.set(e, readFileSync(p, "utf8"));
      } catch {
        /* unreadable */
      }
    }
  }
}
for (const d of ["docs", "data", "research", "intelligence", "packages/prediction-engine/data"]) {
  walk(resolve(root, d));
}

const res = {
  byte_present: 0,
  decodeHtml_present: 0,
  absent_entirely: 0,
  file_missing: 0,
};
const absentSamples = [];
const decodeOnlySamples = [];

for (const r of records) {
  const f = r.source_file;
  if (!f || !f.endsWith(".json")) continue;
  const quote = r.evidence_quote ?? "";
  const raw = lib.get(f);
  if (raw === undefined) {
    res.file_missing++;
    continue;
  }
  if (raw.includes(quote)) {
    res.byte_present++;
    continue;
  }
  // does the DECODED file contain it?
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    res.file_missing++;
    continue;
  }
  const vals = [];
  const stack = [parsed];
  while (stack.length) {
    const v = stack.pop();
    if (typeof v === "string") vals.push(v);
    else if (v && typeof v === "object") stack.push(...Object.values(v));
  }
  let found = false;
  for (const v of vals) {
    if (decodeHtml(v).includes(quote)) {
      found = true;
      break;
    }
  }
  if (found) {
    res.decodeHtml_present++;
    if (decodeOnlySamples.length < 10)
      decodeOnlySamples.push({ item_id: r.item_id, cited: f, quote: quote.slice(0, 66) });
  } else {
    res.absent_entirely++;
    if (absentSamples.length < 14)
      absentSamples.push({ item_id: r.item_id, cited: f, quote: quote.slice(0, 66) });
  }
}

console.log("=== JSON-SOURCED RECORDS: BYTE vs DECODED vs ABSENT ===");
console.log(`  byte-present in the cited file      : ${res.byte_present}`);
console.log(`  present after decodeHtml()          : ${res.decodeHtml_present}`);
console.log(`  ABSENT even after decodeHtml()     : ${res.absent_entirely}`);
console.log(`  file not indexed                    : ${res.file_missing}`);
console.log("");
console.log("  recovered by decodeHtml (source drift of encoding only):");
for (const s of decodeOnlySamples) console.log("   ", JSON.stringify(s));
console.log("  absent even after decodeHtml:");
for (const s of absentSamples) console.log("   ", JSON.stringify(s));

// ---- (M2b) SOURCE DRIFT: was the cited file rewritten after the corpus? ----
console.log("");
console.log("=== SOURCE DRIFT: last commit touching each cited file vs the corpus ===");
const corpusCommit = execFileSync("git", ["-C", root, "log", "-1", "--format=%H %cI", "--", "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl"], { encoding: "utf8" }).trim();
console.log(`  corpus last committed: ${corpusCommit}`);
for (const f of [...wanted].slice(0, 12)) {
  try {
    const c = execFileSync("git", ["-C", root, "log", "-1", "--format=%h %cI", "--", `*${f}`], { encoding: "utf8" }).trim();
    console.log(`    ${f.padEnd(46)} ${c || "(no history)"}`);
  } catch {
    console.log(`    ${f.padEnd(46)} (error)`);
  }
}
