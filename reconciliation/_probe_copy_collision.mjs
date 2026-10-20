#!/usr/bin/env node
/**
 * The corpus records `source_file` as a BASENAME. 29 of the 69 cited
 * basenames exist in MORE THAN ONE place in the repo.
 *
 * If the builder read copy A and a verifier resolves the basename to copy B,
 * then L1 fails for reasons that have nothing to do with honesty -- the
 * quote IS in the document, just not in the copy that gets opened.
 *
 * Question: for each record, WHICH copy actually contains its quote, and
 * does the copy differ between builder and verifier?
 *
 * Reproduce: node reconciliation/_probe_copy_collision.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");

const records = [];
for (const line of readFileSync(CORPUS, "utf8").split("\n")) {
  if (!line.trim()) continue;
  records.push(JSON.parse(line));
}

const cited = new Set(records.map((r) => r.source_file).filter(Boolean));
// basename -> all copies in the repo
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

const multi = [...copies.entries()].filter(([, v]) => v.length > 1);
console.log(`cited basenames: ${cited.size}`);
console.log(`  with MORE THAN ONE copy in the repo: ${multi.length}`);
console.log("");

const res = {
  single: 0,
  multi_found_in_one: 0,
  multi_found_in_none: 0,
  multi_found_in_all: 0,
  ambiguous_found_in_several: 0,
};
const examples = [];

for (const [base, paths] of copies) {
  const recs = records.filter((r) => r.source_file === base);
  if (paths.length === 1) {
    const t = readFileSync(paths[0], "utf8");
    for (const r of recs) if (t.includes(r.evidence_quote ?? "")) res.single++;
    continue;
  }
  const texts = paths.map((p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return "";
    }
  });
  for (const r of recs) {
    const hits = texts.map((t) => t.includes(r.evidence_quote ?? ""));
    const n = hits.filter(Boolean).length;
    if (n === 0) {
      res.multi_found_in_none++;
      if (examples.length < 10)
        examples.push({
          item_id: r.item_id,
          base,
          copies: paths.length,
          found_in: "NONE",
          quote: (r.evidence_quote ?? "").slice(0, 50),
        });
    } else if (n === hits.length) {
      res.multi_found_in_all++;
    } else if (n === 1) {
      res.multi_found_in_one++;
      if (examples.length < 10)
        examples.push({
          item_id: r.item_id,
          base,
          copies: paths.length,
          found_in: paths[hits.indexOf(true)].replace(root, ""),
          quote: (r.evidence_quote ?? "").slice(0, 50),
        });
    } else {
      res.ambiguous_found_in_several++;
    }
  }
}

console.log("=== DOES A BASENAME COLLISION EXPLAIN THE MISSING QUOTES? ===");
console.log(`  single-copy basenames, quote found              : ${res.single}`);
console.log(`  multi-copy basenames, quote in EXACTLY one copy : ${res.multi_found_in_one}`);
console.log(`  multi-copy basenames, quote in ALL copies       : ${res.multi_found_in_all}`);
console.log(`  multi-copy basenames, quote in SEVERAL copies   : ${res.ambiguous_found_in_several}`);
console.log(`  multi-copy basenames, quote in NO copy          : ${res.multi_found_in_none}`);
console.log("");
console.log("  examples:");
for (const e of examples) console.log("   ", JSON.stringify(e));

// per-basename breakdown for the multi-copy set
console.log("");
console.log("=== PER-BASENAME: which copy holds the quotes? ===");
for (const [base, paths] of multi.sort((a, b) => b[1].length - a[1].length)) {
  const recs = records.filter((r) => r.source_file === base);
  const texts = paths.map((p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return "";
    }
  });
  const perCopy = texts.map((t) => recs.filter((r) => t.includes(r.evidence_quote ?? "")).length);
  console.log(`  ${base.slice(0, 42).padEnd(44)} recs=${String(recs.length).padStart(4)}  perCopy=[${perCopy.join(", ")}]`);
  for (const p of paths) console.log(`      ${relative(root, p)}`);
}
