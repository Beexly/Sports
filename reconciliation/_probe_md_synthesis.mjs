#!/usr/bin/env node
/**
 * The markdown class: the builder creates a SYNTHETIC "abstract" by joining
 * table cells with " - ", then extracts a quote from that synthetic string.
 *
 * Question: if the builder instead used the RAW LINE as the source text,
 * how many markdown records would have a quote that IS verbatim in the
 * document, with a span that selects it?
 *
 * Reproduce: node reconciliation/_probe_md_synthesis.mjs
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

// the builder's md scan, reproduced exactly
const cardDir = resolve(root, "docs/predictions/research/2026-10-17");
const mdTargets = [
  join(cardDir, "nfl-analytics-reverse-engineering.md"),
  join(cardDir, "2026-10-18-nfl-analytics-daily-cards.md"),
];

const mdText = new Map();
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
    } else if (e.endsWith(".md") && !mdText.has(e)) {
      try {
        mdText.set(e, readFileSync(p, "utf8"));
      } catch {
        /* unreadable */
      }
    }
  }
}
for (const d of ["docs", "research"]) walk(resolve(root, d));
console.log(`indexed ${mdText.size} md files`);

const mdRecs = records.filter((r) => r.source_file && r.source_file.endsWith(".md"));
console.log(`md-sourced records in the corpus: ${mdRecs.length}`);

let inDoc = 0;
let notInDoc = 0;
// the cells: the builder's synthetic abstract is parts.slice(1).join(" - ")
// where parts came from splitting the row on "|".
// A quote drawn from a SINGLE cell would be verbatim in the document.
let anyCellVerbatim = 0;
const cellOk = [];
const cellBad = [];

for (const r of mdRecs) {
  const t = mdText.get(r.source_file);
  if (t === undefined) continue;
  const quote = r.evidence_quote ?? "";
  if (t.includes(quote)) {
    inDoc++;
    continue;
  }
  notInDoc++;
  // split the synthetic quote back into its cells and test each
  const cells = quote.split(" - ").map((c) => c.trim()).filter((c) => c.length >= 12);
  const hit = cells.find((c) => t.includes(c));
  if (hit) {
    anyCellVerbatim++;
    if (cellOk.length < 8) cellOk.push({ item_id: r.item_id, cell: hit.slice(0, 60) });
  } else if (cellBad.length < 8) {
    cellBad.push({ item_id: r.item_id, quote: quote.slice(0, 70) });
  }
}

console.log("");
console.log("=== MARKDOWN RECORDS ===");
console.log(`  quote verbatim in the md file        : ${inDoc}`);
console.log(`  quote NOT in the md file            : ${notInDoc}`);
console.log(`  ...but a single cell of it IS       : ${anyCellVerbatim}`);
console.log("");
console.log("  examples where a cell is verbatim:");
for (const s of cellOk) console.log("   ", JSON.stringify(s));
console.log("  examples where no cell is verbatim either:");
for (const s of cellBad) console.log("   ", JSON.stringify(s));

// what does the builder actually harvest from md?
console.log("");
console.log("=== WHAT THE BUILDER HARVESTS FROM A MD ROW ===");
const t = mdText.get("nfl-analytics-reverse-engineering.md") ?? "";
const lines = t.split("\n");
let sample = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith("|") && line.includes("Jalen Hurts") && line.includes("$8,300")) {
    sample = { i, line };
    break;
  }
}
if (sample) {
  console.log(`  raw line ${sample.i}: ${JSON.stringify(sample.line)}`);
  const parts = sample.line.split("|").map((s) => s.trim()).filter(Boolean);
  console.log(`  parts: ${JSON.stringify(parts)}`);
  console.log(`  synthetic abstract (parts.slice(1).join(" - ")):`);
  console.log(`    ${JSON.stringify(parts.slice(1).join(" - "))}`);
  console.log(`  the first cell IS verbatim in the file: ${t.includes(parts[1])}`);
}
