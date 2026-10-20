#!/usr/bin/env node
/**
 * THE DESIGN DECISION.
 *
 * A corpus record's `evidence_quote` must be a byte-exact substring of the
 * source document, and `evidence_span` must index the document so that
 * document.slice(start,end) === quote.
 *
 * The builder currently extracts the quote from decodeHtml(field), and the
 * field is a JSON string in the file -- so the file holds it JSON-ESCAPED
 * (\", \\, \u2019, and HTML entities like &#34;).
 *
 * This probe scans each cited JSON file for its string tokens WITH OFFSETS,
 * locates the token each corpus record came from, and reports:
 *   - is the token locatable?
 *   - does the token's RAW bytes contain escapes? (=> the quote would have
 *     to carry them to stay byte-exact)
 *   - how much of the corpus survives if the quote is cut from RAW bytes?
 *
 * Reproduce: node reconciliation/_probe_json_token_offsets.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

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

/**
 * Scan a JSON text for every string token, with its byte offsets and its
 * DECODED value. The token's raw content is text.slice(start,end).
 */
function scanStringTokens(text) {
  const tokens = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '"') {
      const start = i + 1;
      let j = start;
      let decoded = "";
      while (j < n) {
        const c = text[j];
        if (c === "\\") {
          const e = text[j + 1];
          if (e === "u") {
            decoded += String.fromCharCode(parseInt(text.substr(j + 2, 4), 16));
            j += 6;
            continue;
          }
          const map = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" };
          decoded += map[e] ?? e;
          j += 2;
          continue;
        }
        if (c === '"') break;
        decoded += c;
        j++;
      }
      tokens.push({ start, end: j, decoded, raw: text.slice(start, j) });
      i = j + 1;
      continue;
    }
    i++;
  }
  return tokens;
}

const stats = {
  records: 0,
  token_located: 0,
  token_not_located: 0,
  raw_equals_decoded: 0,
  raw_differs: 0,
  quote_present_in_raw: 0,
  quote_present_in_decoded: 0,
  quote_in_neither: 0,
};
const diffSamples = [];
const neitherSamples = [];

for (const [f, text] of lib) {
  const tokens = scanStringTokens(text);
  const byDecoded = new Map();
  for (const t of tokens) {
    if (!byDecoded.has(t.decoded)) byDecoded.set(t.decoded, []);
    byDecoded.get(t.decoded).push(t);
  }
  const recs = records.filter((r) => r.source_file === f);
  for (const r of recs) {
    stats.records++;
    const q = r.evidence_quote ?? "";
    // the field the builder used
    let fieldVal = null;
    for (const key of ["abstract", "description", "answer", "definition", "ref", "notes", "rationale", "summary"]) {
      // find the record object and its field -- approximate: search tokens for a
      // decoded value that CONTAINS the quote
      for (const t of tokens) {
        if (t.decoded.includes(q)) {
          fieldVal = t;
          break;
        }
      }
      if (fieldVal) break;
    }
    if (fieldVal) {
      stats.token_located++;
      if (fieldVal.raw === fieldVal.decoded) stats.raw_equals_decoded++;
      else {
        stats.raw_differs++;
        if (diffSamples.length < 8)
          diffSamples.push({
            item_id: r.item_id,
            cited: f,
            raw_head: fieldVal.raw.slice(0, 60),
            decoded_head: fieldVal.decoded.slice(0, 60),
          });
      }
      if (fieldVal.raw.includes(q)) stats.quote_present_in_raw++;
      else if (fieldVal.decoded.includes(q)) stats.quote_present_in_decoded++;
      else stats.quote_in_neither++;
    } else {
      stats.token_not_located++;
      stats.quote_in_neither++;
      if (neitherSamples.length < 8)
        neitherSamples.push({ item_id: r.item_id, cited: f, quote: q.slice(0, 60) });
    }
  }
}

console.log("=== JSON TOKEN OFFSETS: CAN A BYTE-EXACT QUOTE BE CUT FROM THE FILE? ===");
console.log(`  json-sourced corpus records            : ${stats.records}`);
console.log(`  a containing string token is locatable  : ${stats.token_located}`);
console.log(`  no containing token (quote is absent)   : ${stats.token_not_located}`);
console.log(`  ...token raw bytes === decoded value    : ${stats.raw_equals_decoded}`);
console.log(`  ...token raw bytes !== decoded value    : ${stats.raw_differs}`);
console.log(`  quote is a substring of the RAW token   : ${stats.quote_present_in_raw}`);
console.log(`  quote is only in the DECODED token     : ${stats.quote_present_in_decoded}`);
console.log(`  quote in neither                       : ${stats.quote_in_neither}`);
console.log("");
console.log("  raw != decoded (so a byte-exact quote would carry escapes):");
for (const s of diffSamples) console.log("   ", JSON.stringify(s));
console.log("  quote in neither:");
for (const s of neitherSamples) console.log("   ", JSON.stringify(s));
