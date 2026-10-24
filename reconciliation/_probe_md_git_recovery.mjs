#!/usr/bin/env node
/**
 * For the cited files whose quotes are in NO copy in the working tree, do
 * earlier git revisions of those files contain the quotes?
 *
 * This decides whether the missing markdown quotes are recoverable (the
 * file was rewritten) or gone (the corpus quotes text no version ever had).
 *
 * Reproduce: node reconciliation/_probe_md_git_recovery.mjs
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

const cited = new Set(records.map((r) => r.source_file).filter(Boolean));
const copies = new Map();
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
    if (!cited.has(e)) continue;
    if (!copies.has(e)) copies.set(e, []);
    copies.get(e).push(p);
  }
}
walk(root);

const gitLog = (rel) => {
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

let recov = 0;
let gone = 0;
const recovSamples = [];
const goneSamples = [];

for (const [base, paths] of copies) {
  const recs = records.filter((r) => r.source_file === base);
  // which quotes are missing from EVERY working-tree copy?
  const missing = recs.filter((r) => {
    const q = r.evidence_quote ?? "";
    if (!q) return false;
    return !paths.some((p) => {
      try {
        return readFileSync(p, "utf8").includes(q);
      } catch {
        return false;
      }
    });
  });
  if (!missing.length) continue;

  const stillMissing = new Set(missing.map((r) => r.evidence_quote));
  for (const p of paths) {
    if (!stillMissing.size) break;
    const rel = relative(root, p).split("\\").join("/");
    for (const rev of gitLog(rel)) {
      if (!stillMissing.size) break;
      const content = gitShow(rev, rel);
      if (content === null) continue;
      for (const q of [...stillMissing]) {
        if (content.includes(q)) {
          stillMissing.delete(q);
          recov++;
          if (recovSamples.length < 10)
            recovSamples.push({ item_id: missing.find((r) => r.evidence_quote === q).item_id, base, rev: rev.slice(0, 10) });
        }
      }
    }
  }
  for (const q of stillMissing) {
    gone++;
    if (goneSamples.length < 10)
      goneSamples.push({
        item_id: missing.find((r) => r.evidence_quote === q).item_id,
        base,
        copies: paths.length,
        quote: q.slice(0, 60),
      });
  }
}

console.log("=== MISSING QUOTES: RECOVERABLE FROM GIT, OR GONE? ===");
console.log(`  recoverable from an earlier git revision : ${recov}`);
console.log(`  in NO revision of any copy                : ${gone}`);
console.log("");
console.log("  recoverable:");
for (const s of recovSamples) console.log("   ", JSON.stringify(s));
console.log("  gone:");
for (const s of goneSamples) console.log("   ", JSON.stringify(s));
