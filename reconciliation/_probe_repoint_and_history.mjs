#!/usr/bin/env node
/**
 * For every record whose quote is NOT byte-present in its cited file, can the
 * quote be RE-POINTED to a different file that (a) really contains the quote
 * and (b) really is a source for that record (same id or title)?
 *
 * The corpus file itself is EXCLUDED from the search -- otherwise every quote
 * "exists in the repo" trivially, because the corpus quotes are the corpus.
 *
 * Also re-runs the git-history check with POSIX path separators, because the
 * first pass used Windows separators and every `git show` silently failed.
 *
 * Reproduce: node reconciliation/_probe_repoint_and_history.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

// ---- index every plausible SOURCE file (exclude corpus outputs) ----
const EXCLUDE = /(MIND_CORPUS_3000|MIND_CORPUS_5000|concept_grader_run|l1_l4_admission_gate_truthful)/;
const sources = [];
function walk(dir, depth = 0) {
  if (depth > 8) return;
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
      walk(p, depth + 1);
      continue;
    }
    if (!/\.(json|jsonl|md|txt)$/i.test(e)) continue;
    if (EXCLUDE.test(e)) continue;
    try {
      if (st.size > 40_000_000) continue;
      sources.push({ p, rel: relative(root, p).split("\\").join("/"), t: readFileSync(p, "utf8") });
    } catch {
      /* unreadable */
    }
  }
}
walk(root);
console.log(`indexed ${sources.length} candidate source files (corpus outputs excluded)`);

const curByBase = new Map();
for (const s of sources) {
  const b = s.p.split(/[\\/]/).pop();
  if (!curByBase.has(b)) curByBase.set(b, s);
}

const res = {
  already_present: 0,
  repointable: 0,
  present_elsewhere_unrelated: 0,
  nowhere: 0,
  no_cited_file: 0,
};
const repointableSamples = [];
const unrelatedSamples = [];
const nowhereSamples = [];

function identityTokens(r) {
  const toks = new Set();
  const id = String(r.item_id ?? "").replace(/^arXiv:/i, "").trim();
  if (id && id.length >= 5 && /\d{4}\.\d{4,5}/.test(id)) toks.add(id);
  const title = String(r.title ?? "").trim();
  if (title.length >= 12) toks.add(title);
  return toks;
}

for (const r of records) {
  const f = r.source_file;
  const quote = r.evidence_quote ?? "";
  if (!f) {
    res.no_cited_file++;
    continue;
  }
  const cited = curByBase.get(f);
  if (cited && cited.t.includes(quote)) {
    res.already_present++;
    continue;
  }
  const toks = identityTokens(r);
  let repoint = null;
  let presentUnrelated = false;
  for (const s of sources) {
    if (!s.t.includes(quote)) continue;
    // is this file a legitimate source for THIS record?
    let match = false;
    for (const tk of toks) {
      if (s.t.includes(tk)) {
        match = true;
        break;
      }
    }
    if (match) {
      repoint = s;
      break;
    }
    presentUnrelated = true;
  }
  if (repoint) {
    res.repointable++;
    if (repointableSamples.length < 12)
      repointableSamples.push({ item_id: r.item_id, cited: f, repoint_to: repoint.rel });
  } else if (presentUnrelated) {
    res.present_elsewhere_unrelated++;
    if (unrelatedSamples.length < 10)
      unrelatedSamples.push({ item_id: r.item_id, cited: f, quote: quote.slice(0, 60) });
  } else {
    res.nowhere++;
    if (nowhereSamples.length < 12)
      nowhereSamples.push({ item_id: r.item_id, cited: f, quote: quote.slice(0, 60) });
  }
}

console.log("");
console.log("=== CAN ABSENT QUOTES BE RE-POINTED TO A REAL SOURCE FILE? ===");
console.log(`  already byte-present in the cited file : ${res.already_present}`);
console.log(`  RE-POINTABLE to a real source file     : ${res.repointable}`);
console.log(`  present in the repo but unrelated      : ${res.present_elsewhere_unrelated}`);
console.log(`  nowhere in the repo                    : ${res.nowhere}`);
console.log(`  no cited file (curated)                : ${res.no_cited_file}`);
console.log("");
console.log("  re-pointable:");
for (const s of repointableSamples) console.log("   ", JSON.stringify(s));
console.log("  present but unrelated:");
for (const s of unrelatedSamples) console.log("   ", JSON.stringify(s));
console.log("  nowhere:");
for (const s of nowhereSamples) console.log("   ", JSON.stringify(s));

// ---- git history, with POSIX separators this time ----
console.log("");
console.log("=== GIT HISTORY (POSIX paths) ===");
const byFile = new Map();
for (const r of records) {
  const f = r.source_file;
  if (!f || !f.endsWith(".json")) continue;
  const q = r.evidence_quote ?? "";
  if (q.length < 25) continue;
  const cited = curByBase.get(f);
  if (cited && cited.t.includes(q)) continue;
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push({ item_id: r.item_id, quote: q });
}
let recov = 0;
let unrec = 0;
const unrecSamples = [];
for (const [f, rs] of byFile) {
  const cited = curByBase.get(f);
  if (!cited) continue;
  let revs = [];
  try {
    revs = execFileSync("git", ["-C", root, "log", "--all", "--format=%H", "--", cited.rel], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    /* no history */
  }
  const missing = new Set(rs.map((r) => r.quote));
  for (const rev of revs) {
    if (!missing.size) break;
    let content = null;
    try {
      content = execFileSync("git", ["-C", root, "show", `${rev}:${cited.rel}`], {
        encoding: "utf8",
        maxBuffer: 512 * 1024 * 1024,
      });
    } catch {
      continue;
    }
    for (const q of [...missing]) {
      if (content.includes(q)) {
        missing.delete(q);
        recov++;
      }
    }
  }
  for (const q of missing) {
    unrec++;
    if (unrecSamples.length < 10)
      unrecSamples.push({ item_id: rs.find((r) => r.quote === q).item_id, cited: f, revs: revs.length, quote: q.slice(0, 60) });
  }
}
console.log(`  absent JSON quotes recoverable from a past revision : ${recov}`);
console.log(`  absent JSON quotes in NO revision of that file       : ${unrec}`);
for (const s of unrecSamples) console.log("   ", JSON.stringify(s));
