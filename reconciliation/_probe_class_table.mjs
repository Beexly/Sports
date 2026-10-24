#!/usr/bin/env node
/**
 * THE CLASS TABLE. For every corpus record, what is the honest relationship
 * between its evidence_quote and the document it names?
 *
 * Classes, in order of preference:
 *   EXACT          quote is byte-present in the document
 *   NORMALIZED     quote matches after whitespace normalisation (nbsp, runs
 *                  of spaces) -- the document DOES hold this text
 *   DECODED        quote matches after HTML/XML entity + tag decoding
 *   SYNTHESIZED    the builder MANUFACTURED the text (md cell join, Pinnacle
 *                  market sentence) -- no document ever held it
 *   DRIFT          the document holds a different revision of the same paper
 *   ABSENT         the text is in no revision of the document
 *
 * Reproduce: node reconciliation/_probe_class_table.mjs
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

const wanted = new Set(records.map((r) => r.source_file).filter(Boolean));
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
/** whitespace-normalise, including nbsp and unicode spaces */
function normWs(s) {
  return String(s).replace(/[\s\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/g, " ").trim();
}

const cls = { EXACT: 0, NORMALIZED: 0, DECODED: 0, SYNTHESIZED: 0, ABSENT: 0, NO_FILE: 0 };
const byExt = {};
const samples = { NORMALIZED: [], DECODED: [], SYNTHESIZED: [], ABSENT: [] };

for (const r of records) {
  const f = r.source_file;
  const q = r.evidence_quote ?? "";
  const ext = f ? (f.includes(".") ? f.slice(f.lastIndexOf(".")) : "(none)") : "(none)";
  byExt[ext] = byExt[ext] ?? { EXACT: 0, NORMALIZED: 0, DECODED: 0, SYNTHESIZED: 0, ABSENT: 0, NO_FILE: 0 };

  if (!f) {
    cls.NO_FILE++;
    byExt[ext].NO_FILE++;
    continue;
  }
  const doc = lib.get(f);
  if (doc === undefined) {
    cls.NO_FILE++;
    byExt[ext].NO_FILE++;
    continue;
  }
  if (doc.includes(q)) {
    cls.EXACT++;
    byExt[ext].EXACT++;
    continue;
  }
  // whitespace-normalised
  const nq = normWs(q);
  if (nq && normWs(doc).includes(nq)) {
    cls.NORMALIZED++;
    byExt[ext].NORMALIZED++;
    if (samples.NORMALIZED.length < 6)
      samples.NORMALIZED.push({ item_id: r.item_id, cited: f, quote: q.slice(0, 64) });
    continue;
  }
  // decoded
  let decodedDoc = null;
  if (f.endsWith(".json")) {
    try {
      const parsed = JSON.parse(doc);
      const vals = [];
      const stack = [parsed];
      while (stack.length) {
        const v = stack.pop();
        if (typeof v === "string") vals.push(v);
        else if (v && typeof v === "object") stack.push(...Object.values(v));
      }
      decodedDoc = vals.map(decodeHtml).join("\n");
    } catch {
      /* not json */
    }
  }
  if (decodedDoc && (decodedDoc.includes(q) || normWs(decodedDoc).includes(nq))) {
    cls.DECODED++;
    byExt[ext].DECODED++;
    if (samples.DECODED.length < 6)
      samples.DECODED.push({ item_id: r.item_id, cited: f, quote: q.slice(0, 64) });
    continue;
  }
  // SYNTHESIZED? the builder made this text up
  const isSynth =
    /^Pinnacle closing price /.test(q) || // market row -> sentence
    (q.includes(" - ") && !doc.includes(q.split(" - ")[0])); // md cell join
  if (isSynth) {
    cls.SYNTHESIZED++;
    byExt[ext].SYNTHESIZED++;
    if (samples.SYNTHESIZED.length < 6)
      samples.SYNTHESIZED.push({ item_id: r.item_id, cited: f, quote: q.slice(0, 64) });
    continue;
  }
  cls.ABSENT++;
  byExt[ext].ABSENT++;
  if (samples.ABSENT.length < 8)
    samples.ABSENT.push({ item_id: r.item_id, cited: f, quote: q.slice(0, 64) });
}

console.log("=== THE CLASS TABLE: relationship between each quote and its document ===");
for (const [k, v] of Object.entries(cls)) console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}  ${((v / records.length) * 100).toFixed(1)}%`);
console.log("");
console.log("=== BY SOURCE TYPE ===");
for (const [ext, v] of Object.entries(byExt).sort((a, b) => b[1].EXACT + b[1].ABSENT - (a[1].EXACT + a[1].ABSENT))) {
  const tot = Object.values(v).reduce((a, b) => a + b, 0);
  console.log(`  ${ext.padEnd(8)} n=${String(tot).padStart(5)}  EXACT=${String(v.EXACT).padStart(5)} NORM=${String(v.NORMALIZED).padStart(4)} DEC=${String(v.DECODED).padStart(4)} SYNTH=${String(v.SYNTHESIZED).padStart(5)} ABS=${String(v.ABSENT).padStart(4)} NOFILE=${String(v.NO_FILE).padStart(3)}`);
}
console.log("");
for (const [k, list] of Object.entries(samples)) {
  if (!list.length) continue;
  console.log(`  --- ${k} ---`);
  for (const s of list) console.log("   ", JSON.stringify(s));
}
