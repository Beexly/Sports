#!/usr/bin/env node
/**
 * For a sample of records whose quote is absent from the cited file, align
 * the corpus quote against the file's own text FOR THE SAME RECORD ID and
 * report the first divergence.
 *
 * Three possible stories:
 *   SAME TEXT, DIFFERENT BYTES  -> a mechanical difference (escapes, tags,
 *                                  whitespace) that a correct builder can
 *                                  reproduce by copying the file's bytes.
 *   SAME PAPER, REWRITTEN      -> the file holds a different revision of
 *                                  the abstract (v1 vs v2).
 *   DIFFERENT PAPER             -> the quote belongs to another work.
 *
 * Reproduce: node reconciliation/_probe_alignment.mjs
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

// ---- group the absent-quote records by cited file ----
const byFile = new Map();
for (const r of records) {
  const f = r.source_file;
  if (!f || !f.endsWith(".json")) continue;
  const q = r.evidence_quote ?? "";
  if (q.length < 25) continue;
  const raw = lib.get(f);
  if (raw === undefined) continue;
  if (raw.includes(q)) continue;
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(r);
}

const buckets = { identical_after_decode: 0, near_match_rewritten: 0, unrelated_text: 0, no_record_in_file: 0 };
const samples = { near_match_rewritten: [], unrelated_text: [], no_record_in_file: [] };

/** longest common prefix length */
function lcp(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

for (const [f, recs] of byFile) {
  const raw = lib.get(f);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    continue;
  }
  if (!Array.isArray(parsed)) continue;
  const byId = new Map();
  for (const it of parsed) {
    if (!it || typeof it !== "object") continue;
    const id = String(it.arxiv_id ?? it.id ?? it.ref ?? it.doi ?? it.paperId ?? "");
    if (id) byId.set(id, it);
  }
  for (const r of recs) {
    const id = String(r.item_id ?? "").replace(/^arXiv:/i, "").trim();
    const it = byId.get(id);
    if (!it) {
      buckets.no_record_in_file++;
      if (samples.no_record_in_file.length < 6)
        samples.no_record_in_file.push({ item_id: r.item_id, cited: f, quote: (r.evidence_quote || "").slice(0, 70) });
      continue;
    }
    const fileAbstract = decodeHtml(it.abstract ?? it.description ?? it.text ?? "");
    const q = r.evidence_quote ?? "";
    if (fileAbstract.includes(q)) {
      buckets.identical_after_decode++;
      continue;
    }
    const p = lcp(fileAbstract, q);
    const rel = fileAbstract.length ? p / fileAbstract.length : 0;
    if (rel > 0.5) {
      buckets.near_match_rewritten++;
      if (samples.near_match_rewritten.length < 8)
        samples.near_match_rewritten.push({
          item_id: r.item_id,
          cited: f,
          common_prefix_pct: Math.round(rel * 100),
          at_prefix: q.slice(Math.max(0, p - 30), p + 40),
          file_at_prefix: fileAbstract.slice(Math.max(0, p - 30), p + 40),
        });
    } else {
      buckets.unrelated_text++;
      if (samples.unrelated_text.length < 8)
        samples.unrelated_text.push({
          item_id: r.item_id,
          cited: f,
          common_prefix_pct: Math.round(rel * 100),
          quote_head: q.slice(0, 70),
          file_head: fileAbstract.slice(0, 70),
        });
    }
  }
}

console.log("=== ALIGNING ABSENT JSON QUOTES AGAINST THE FILE'S OWN ABSTRACT ===");
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(26)} ${v}`);
console.log("");
for (const [k, list] of Object.entries(samples)) {
  if (!list.length) continue;
  console.log(`  --- ${k} ---`);
  for (const s of list) console.log("   ", JSON.stringify(s));
}
