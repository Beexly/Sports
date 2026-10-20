#!/usr/bin/env node
/**
 * Are the 1,281 "quote not in the JSON document" records:
 *   (a) GENUINELY ABSENT (the text is a different paper),
 *   (b) PRESENT but byte-different because of JSON escaping
 *       (backslash, quote, newline, unicode escapes), or
 *   (c) PRESENT in another string field of the same file?
 *
 * This distinguishes "fabricated provenance" from "a mechanical encoding
 * artifact" -- a completely different remediation.
 *
 * Reproduce: node reconciliation/_probe_json_escape_mechanism.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

// index every JSON file the corpus cites
const wanted = new Set(
  records.map((r) => r.source_file).filter((f) => f && f.endsWith(".json")),
);
const fileIndex = new Map(); // basename -> {raw, decodedStrings:Set, parsed}
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
    } else if (wanted.has(e) && !fileIndex.has(e)) {
      const raw = readFileSync(p, "utf8");
      let decoded = new Set();
      let ok = true;
      try {
        const parsed = JSON.parse(raw);
        const stack = [parsed];
        while (stack.length) {
          const v = stack.pop();
          if (typeof v === "string") decoded.add(v);
          else if (v && typeof v === "object") stack.push(...Object.values(v));
        }
      } catch {
        ok = false;
      }
      fileIndex.set(e, { raw, decoded, ok });
    }
  }
}
for (const d of ["docs", "data", "research", "intelligence", "packages/prediction-engine/data"]) {
  walk(resolve(root, d));
}
console.log(`indexed ${fileIndex.size} cited JSON files`);

const res = {
  byte_present: 0,
  decoded_present: 0,
  nowhere: 0,
  decode_error: 0,
};
const nowhereSamples = [];
const decodedOnlySamples = [];
let mdChecked = 0;
let mdPresent = 0;

for (const r of records) {
  const f = r.source_file;
  if (!f) continue;
  const quote = r.evidence_quote ?? "";
  if (f.endsWith(".md")) {
    // markdown: check the raw md file for the quote
    mdChecked++;
    continue;
  }
  const hit = fileIndex.get(f);
  if (!hit) {
    res.decode_error++;
    continue;
  }
  if (hit.raw.includes(quote)) {
    res.byte_present++;
    continue;
  }
  // is it present as a DECODED string value in the file?
  let found = false;
  for (const s of hit.decoded) {
    if (s.includes(quote)) {
      found = true;
      break;
    }
  }
  if (found) {
    res.decoded_present++;
    if (decodedOnlySamples.length < 10) {
      decodedOnlySamples.push({
        item_id: r.item_id,
        source_file: f,
        quote: quote.slice(0, 70),
      });
    }
  } else {
    res.nowhere++;
    if (nowhereSamples.length < 12) {
      nowhereSamples.push({
        item_id: r.item_id,
        source_file: f,
        quote: quote.slice(0, 70),
      });
    }
  }
}

console.log("");
console.log("=== JSON-SOURCED RECORDS: WHERE IS THE QUOTE? ===");
console.log(`  byte-present in the raw file                 : ${res.byte_present}`);
console.log(`  present only after JSON-decoding a value    : ${res.decoded_present}`);
console.log(`  present NOWHERE in the file                 : ${res.nowhere}`);
console.log(`  file could not be indexed                   : ${res.decode_error}`);
console.log("");
console.log("  quotes recovered by JSON-decoding (the file DOES hold this text):");
for (const s of decodedOnlySamples) console.log("   ", JSON.stringify(s));
console.log("  quotes genuinely nowhere in the file:");
for (const s of nowhereSamples) console.log("   ", JSON.stringify(s));

// ---- the markdown case: check the real md file for the quote ----
console.log("");
console.log("=== MARKDOWN-SOURCED RECORDS ===");
const mdFiles = new Map();
function walkMd(dir) {
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
      walkMd(p);
    } else if (e.endsWith(".md") && !mdFiles.has(e)) {
      try {
        mdFiles.set(e, readFileSync(p, "utf8"));
      } catch {
        /* unreadable */
      }
    }
  }
}
for (const d of ["docs", "research", "intelligence"]) walkMd(resolve(root, d));

let mdIn = 0;
let mdOut = 0;
const mdOutSamples = [];
for (const r of records) {
  if (!r.source_file || !r.source_file.endsWith(".md")) continue;
  const t = mdFiles.get(r.source_file);
  if (t === undefined) continue;
  if (t.includes(r.evidence_quote ?? "")) mdIn++;
  else {
    mdOut++;
    if (mdOutSamples.length < 8) {
      mdOutSamples.push({
        item_id: r.item_id,
        source_file: r.source_file,
        quote: (r.evidence_quote ?? "").slice(0, 80),
      });
    }
  }
}
console.log(`  md records: quote IS byte-present in the md file : ${mdIn}`);
console.log(`  md records: quote is NOT in the md file          : ${mdOut}`);
for (const s of mdOutSamples) console.log("   ", JSON.stringify(s));

// what DOES the md row look like in the file?
console.log("");
console.log("=== WHAT THE MD FILE ACTUALLY CONTAINS (for one sample) ===");
const s0 = mdOutSamples[0];
if (s0) {
  const t = mdFiles.get(s0.source_file) ?? "";
  // find the first cell of the quote
  const head = s0.quote.split(" - ")[0];
  const i = t.indexOf(head);
  console.log(`  looking for first cell: ${JSON.stringify(head)}`);
  console.log(`  found at offset: ${i}`);
  if (i >= 0) {
    console.log(`  file text around it: ${JSON.stringify(t.slice(Math.max(0, i - 120), i + 220))}`);
  }
}
