#!/usr/bin/env node
/**
 * For absent JSON quotes, align against the file's record for the SAME id:
 * does the file's TITLE match the corpus's title for that id?
 *
 *   same title, different abstract  -> SOURCE DRIFT: the corpus quotes an
 *                                      older revision of the same paper. A
 *                                      rebuild against the current file
 *                                      fixes it mechanically.
 *   different/absent title          -> the quote belongs to another work.
 *
 * Reproduce: node reconciliation/_probe_same_id_drift.mjs
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

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);

const buckets = {
  same_paper_title_match: 0,
  different_paper: 0,
  id_not_in_file: 0,
  title_keyed_record: 0,
};
const driftSamples = [];
const diffSamples = [];
const idMissingSamples = [];

for (const r of records) {
  const f = r.source_file;
  if (!f || !f.endsWith(".json")) continue;
  const q = r.evidence_quote ?? "";
  if (q.length < 25) continue;
  const raw = lib.get(f);
  if (raw === undefined) continue;
  if (raw.includes(q)) continue; // already present

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    continue;
  }
  if (!Array.isArray(parsed)) continue;

  const corpusId = String(r.item_id ?? "").replace(/^arXiv:/i, "").trim();
  const corpusTitle = String(r.title ?? "");
  const isIdKeyed = /\d{4}\.\d{4,5}/.test(corpusId);
  const isTitleKeyed = !isIdKeyed && corpusTitle.length >= 12;

  // find the file's record with the same id
  const hit = parsed.find(
    (it) =>
      it &&
      typeof it === "object" &&
      String(it.arxiv_id ?? it.id ?? it.ref ?? it.doi ?? it.paperId ?? "") === corpusId,
  );
  if (!hit) {
    // maybe the file keys records by title
    const byTitle = parsed.find(
      (it) => it && typeof it === "object" && norm(it.title ?? it.name) === norm(corpusTitle),
    );
    if (byTitle) {
      buckets.title_keyed_record++;
      continue;
    }
    buckets.id_not_in_file++;
    if (idMissingSamples.length < 8)
      idMissingSamples.push({ item_id: corpusId, cited: f, quote: q.slice(0, 60) });
    continue;
  }
  const fileTitle = String(hit.title ?? hit.name ?? "");
  if (norm(fileTitle) === norm(corpusTitle)) {
    buckets.same_paper_title_match++;
    if (driftSamples.length < 10)
      driftSamples.push({
        item_id: corpusId,
        cited: f,
        corpus_quote_head: q.slice(0, 58),
        file_abstract_head: String(hit.abstract ?? "").slice(0, 58),
      });
  } else {
    buckets.different_paper++;
    if (diffSamples.length < 8)
      diffSamples.push({
        item_id: corpusId,
        cited: f,
        corpus_title: corpusTitle.slice(0, 50),
        file_title: fileTitle.slice(0, 50),
      });
  }
}

console.log("=== ABSENT JSON QUOTES: SAME PAPER (DRIFT) OR DIFFERENT PAPER? ===");
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(26)} ${v}`);
console.log("");
console.log("  same paper, quote from an older abstract revision:");
for (const s of driftSamples) console.log("   ", JSON.stringify(s));
console.log("  different paper:");
for (const s of diffSamples) console.log("   ", JSON.stringify(s));
console.log("  id not in the file at all:");
for (const s of idMissingSamples) console.log("   ", JSON.stringify(s));
