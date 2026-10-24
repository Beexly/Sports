#!/usr/bin/env node
/**
 * For JSON-sourced records whose quote is NOT in the cited file: is the
 * quote anywhere in the repo at all? And is the record's own title/abstract
 * present in the cited file?
 *
 * Two sub-questions per record:
 *   1. Does the cited file contain a record with the same id/title? (the
 *      record EXISTS, but the quote is from elsewhere)
 *   2. Does the quote exist ANYWHERE in the repo working tree?
 *
 * Reproduce: node reconciliation/_probe_quote_recovery.mjs
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

// ---- read every text file in the repo once (skip big binaries) ----
const allText = [];
function walk(dir, depth = 0) {
  if (depth > 8) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === ".next") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, depth + 1);
      continue;
    }
    if (!/\.(json|md|txt|jsonl|ts|mjs|js|csv|html)$/i.test(e.name)) continue;
    try {
      const st = statSync(p);
      if (st.size > 60_000_000) continue;
      allText.push({ p, t: readFileSync(p, "utf8") });
    } catch {
      /* unreadable */
    }
  }
}
walk(root);
console.log(`read ${allText.length} text files in the repo`);

const jsonFiles = new Map();
for (const { p, t } of allText) {
  if (!p.endsWith(".json")) continue;
  const base = p.split(/[\\/]/).pop();
  if (!jsonFiles.has(base)) jsonFiles.set(base, []);
  jsonFiles.get(base).push({ p, t });
}

// ---- index each cited JSON file by id + title ----
function buildIndex(p, t) {
  let parsed;
  try {
    parsed = JSON.parse(t);
  } catch {
    return null;
  }
  const byId = new Map();
  const arr = Array.isArray(parsed) ? parsed : null;
  if (!arr) return null;
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const id = String(it.arxiv_id ?? it.id ?? it.ref ?? it.doi ?? it.paperId ?? it.slug ?? "");
    const title = String(it.title ?? it.name ?? "");
    if (id) byId.set(id, it);
    if (title) byId.set("T:" + title, it);
  }
  return byId;
}

const idxCache = new Map();
function indexFor(base) {
  if (idxCache.has(base)) return idxCache.get(base);
  const copies = jsonFiles.get(base) ?? [];
  let built = [];
  for (const { p, t } of copies) {
    const ix = buildIndex(p, t);
    if (ix) built.push({ p, ix });
  }
  idxCache.set(base, built);
  return built;
}

const stats = {
  id_in_cited_file: 0,
  id_nowhere: 0,
  quote_in_repo_other_file: 0,
  quote_nowhere_in_repo: 0,
};
const quoteFoundIn = [];
const idMissing = [];
let checked = 0;

for (const r of records) {
  const f = r.source_file;
  if (!f || !f.endsWith(".json")) continue;
  const quote = r.evidence_quote ?? "";
  if (quote.length < 25) continue;
  const built = indexFor(f);
  if (!built.length) continue;
  checked++;

  // 1. is the record's id present in the cited file?
  const id = String(r.item_id ?? "").replace(/^arXiv:/i, "");
  const title = String(r.title ?? "");
  let idHit = null;
  let titleHit = null;
  for (const { ix } of built) {
    if (id && ix.has(id)) idHit = { p: built[0].p, item: ix.get(id) };
    if (title && ix.has("T:" + title)) titleHit = ix.get("T:" + title);
  }
  if (idHit || titleHit) stats.id_in_cited_file++;
  else stats.id_nowhere++;

  // 2. is the quote in the repo at all?
  if (built.some(({ ix }) => [...ix.values()].some((it) => JSON.stringify(it).includes(quote)))) {
    stats.quote_in_repo_other_file++;
    continue;
  }
  let foundPath = null;
  for (const { p, t } of allText) {
    if (t.includes(quote)) {
      foundPath = p;
      break;
    }
  }
  if (foundPath) {
    stats.quote_in_repo_other_file++;
    if (quoteFoundIn.length < 12)
      quoteFoundIn.push({ item_id: r.item_id, cited: f, found_at: foundPath.replace(root, "") });
  } else {
    stats.quote_nowhere_in_repo++;
    if (idMissing.length < 12)
      idMissing.push({
        item_id: r.item_id,
        cited: f,
        id_in_cited: !!(idHit || titleHit),
        title: title.slice(0, 60),
        quote: quote.slice(0, 70),
      });
  }
}

console.log("");
console.log(`=== JSON records checked (quote >= 25 chars): ${checked} ===`);
console.log(`  the record's id/title IS in the cited file : ${stats.id_in_cited_file}`);
console.log(`  the record's id/title is NOT in the file   : ${stats.id_nowhere}`);
console.log(`  the quote EXISTS somewhere in the repo     : ${stats.quote_in_repo_other_file}`);
console.log(`  the quote exists NOWHERE in the repo       : ${stats.quote_nowhere_in_repo}`);
console.log("");
console.log("  quotes found in ANOTHER file:");
for (const s of quoteFoundIn) console.log("   ", JSON.stringify(s));
console.log("  quotes found nowhere:");
for (const s of idMissing) console.log("   ", JSON.stringify(s));
