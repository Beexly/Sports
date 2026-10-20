#!/usr/bin/env node
/**
 * Are the JSON quotes absent from their cited file present in ANY past git
 * revision of that file? (File-grouped: one `git show` per revision, not
 * per record.)
 *
 * Recoverable  -> the quote was once in the source; rebuild against that
 *                 revision or re-fetch the source.
 * Unrecoverable -> the text is in no revision of the source lineage.
 *
 * Reproduce: node reconciliation/_probe_git_history_recovery.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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
const curPath = new Map();
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
    } else if (wanted.has(e) && !curPath.has(e)) curPath.set(e, p);
  }
}
for (const d of ["docs", "data", "research", "intelligence", "packages/prediction-engine/data"]) {
  walk(resolve(root, d));
}

// group the absent-quote records by cited file
const byFile = new Map();
for (const r of records) {
  const f = r.source_file;
  if (!f || !f.endsWith(".json")) continue;
  const quote = r.evidence_quote ?? "";
  if (quote.length < 25) continue;
  const p = curPath.get(f);
  if (!p) continue;
  let cur = null;
  try {
    cur = readFileSync(p, "utf8");
  } catch {
    /* unreadable */
  }
  if (cur && cur.includes(quote)) continue;
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push({ item_id: r.item_id, quote, path: p });
}
console.log(`files with absent quotes: ${byFile.size}`);

const gitLogPath = (rel) => {
  try {
    return execFileSync("git", ["-C", root, "log", "--all", "--format=%H", "--", rel], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};
const gitShow = (rev, rel) => {
  try {
    return execFileSync("git", ["-C", root, "show", `${rev}:${rel}`], {
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch {
    return null;
  }
};

let recoverable = 0;
let unrecoverable = 0;
const recSamples = [];
const unrecSamples = [];

for (const [f, recs] of byFile) {
  const rel = recs[0].path.replace(root + "\\", "").replace(root + "/", "");
  const revs = gitLogPath(rel);
  if (!revs.length) {
    unrecoverable += recs.length;
    continue;
  }
  const stillMissing = new Set(recs.map((r) => r.quote));
  for (const rev of revs) {
    if (stillMissing.size === 0) break;
    const content = gitShow(rev, rel);
    if (content === null) continue;
    for (const q of [...stillMissing]) {
      if (content.includes(q)) {
        stillMissing.delete(q);
        recoverable++;
        if (recSamples.length < 10)
          recSamples.push({ item_id: recs.find((r) => r.quote === q).item_id, cited: f, rev: rev.slice(0, 10) });
      }
    }
  }
  for (const q of stillMissing) {
    unrecoverable++;
    if (unrecSamples.length < 16)
      unrecSamples.push({ item_id: recs.find((r) => r.quote === q).item_id, cited: f, quote: q.slice(0, 66) });
  }
}

console.log("");
console.log("=== ABSENT JSON QUOTES: RECOVERABLE FROM GIT HISTORY? ===");
console.log(`  recoverable from a past revision : ${recoverable}`);
console.log(`  in NO revision of that file       : ${unrecoverable}`);
console.log("");
console.log("  recoverable:");
for (const s of recSamples) console.log("   ", JSON.stringify(s));
console.log("  unrecoverable:");
for (const s of unrecSamples) console.log("   ", JSON.stringify(s));
