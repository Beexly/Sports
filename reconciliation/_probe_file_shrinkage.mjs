#!/usr/bin/env node
/**
 * Per cited JSON file: how many corpus records cite it, how many records
 * does the file hold NOW, and how many of the citing records' ids are still
 * in the file?
 *
 * This sizes the "the source file was replaced" class: if the file holds
 * fewer records than the corpus cites, the corpus points at a document that
 * no longer contains those records.
 *
 * Reproduce: node reconciliation/_probe_file_shrinkage.mjs
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

const byFile = new Map();
for (const r of records) {
  const f = r.source_file;
  if (!f) continue;
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(r);
}

const paths = new Map();
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
    } else if (!paths.has(e)) paths.set(e, p);
  }
}
for (const d of ["docs", "data", "research", "intelligence", "packages/prediction-engine/data"]) {
  walk(resolve(root, d));
}

console.log("file".padEnd(50), "cited".padStart(7), "inFile".padStart(7), "idFound".padStart(8), "quoteFound".padStart(11));
console.log("-".repeat(88));

let sumCited = 0;
let sumIdFound = 0;
let sumQuoteFound = 0;
for (const [f, rs] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  const p = paths.get(f);
  let inFile = 0;
  let idFound = 0;
  let quoteFound = 0;
  if (p) {
    const raw = readFileSync(p, "utf8");
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* not json */
    }
    if (Array.isArray(parsed)) {
      inFile = parsed.length;
      const ids = new Set();
      for (const it of parsed) {
        if (it && typeof it === "object")
          ids.add(String(it.arxiv_id ?? it.id ?? it.ref ?? it.doi ?? it.paperId ?? it.question ?? it.title ?? ""));
      }
      for (const r of rs) {
        const id = String(r.item_id ?? "").replace(/^arXiv:/i, "").trim();
        if (ids.has(id)) idFound++;
        const t = String(r.title ?? "");
        if (t && ids.has(t)) idFound++;
        if (raw.includes(r.evidence_quote ?? "")) quoteFound++;
      }
    } else {
      quoteFound = rs.filter((r) => raw.includes(r.evidence_quote ?? "")).length;
    }
  }
  sumCited += rs.length;
  sumIdFound += idFound;
  sumQuoteFound += quoteFound;
  console.log(
    f.slice(0, 48).padEnd(50),
    String(rs.length).padStart(7),
    String(inFile).padStart(7),
    String(idFound).padStart(8),
    String(quoteFound).padStart(11),
  );
}
console.log("-".repeat(88));
console.log(
  "TOTAL".padEnd(50),
  String(sumCited).padStart(7),
  "".padStart(7),
  String(sumIdFound).padStart(8),
  String(sumQuoteFound).padStart(11),
);
