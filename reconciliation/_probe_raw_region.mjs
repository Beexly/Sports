#!/usr/bin/env node
/**
 * CAN THE BUILDER COMPUTE HONEST SPANS?
 *
 * For a record in a JSON file, the file stores the record's text as a JSON
 * string value. The value's RAW form (as it appears in the file bytes) is
 * `JSON.stringify(value).slice(1, -1)`.
 *
 * If that raw form is found in the file, the builder knows the EXACT byte
 * range of the record's text inside the document -- and can therefore emit a
 * span that really selects the quote.
 *
 * This probe measures, per cited JSON file:
 *   - are the records' raw text regions locatable at all?
 *   - what happens to the class table when the quote is taken from the RAW
 *     region instead of from a decodeHtml'd copy?
 *
 * Reproduce: node reconciliation/_probe_raw_region.mjs
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

const stats = {
  fileTotal: 0,
  fileLocatable: 0,
  recTotal: 0,
  recRawRegionFound: 0,
  recRawRegionMissing: 0,
  rawRegionIsByteExact: 0,
  rawRegionDiffers: 0,
};
const samples = [];

for (const [f, raw] of lib) {
  stats.fileTotal++;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    continue;
  }
  if (!Array.isArray(parsed)) continue;
  stats.fileLocatable++;

  // the corpus records that cite this file
  const recs = records.filter((r) => r.source_file === f);
  for (const r of recs) {
    stats.recTotal++;
    // find the element in the file this record came from
    const id = String(r.item_id ?? "").replace(/^arXiv:/i, "").trim();
    const title = String(r.title ?? "");
    let el = parsed.find(
      (it) =>
        it &&
        typeof it === "object" &&
        String(it.arxiv_id ?? it.id ?? it.ref ?? it.doi ?? it.paperId ?? it.question ?? "") === id,
    );
    if (!el) {
      el = parsed.find((it) => it && typeof it === "object" && String(it.title ?? "") === title);
    }
    if (!el) {
      stats.recRawRegionMissing++;
      continue;
    }
    // the field the builder quotes from
    const fieldVal =
      el.abstract ?? el.description ?? el.answer ?? el.definition ?? el.ref ??
      el.notes ?? el.rationale ?? el.summary ?? el.text;
    if (typeof fieldVal !== "string" || !fieldVal) {
      stats.recRawRegionMissing++;
      continue;
    }
    // the RAW form of that value, as the file stores it
    const rawForm = JSON.stringify(fieldVal).slice(1, -1);
    const idx = raw.indexOf(rawForm);
    if (idx < 0) {
      stats.recRawRegionMissing++;
      if (samples.length < 8) samples.push({ item_id: r.item_id, cited: f, issue: "raw region not found" });
      continue;
    }
    stats.recRawRegionFound++;
    if (rawForm === fieldVal) stats.rawRegionIsByteExact++;
    else {
      stats.rawRegionDiffers++;
      if (samples.length < 8)
        samples.push({
          item_id: r.item_id,
          cited: f,
          issue: "raw region differs from decoded value",
          raw_head: rawForm.slice(0, 50),
          val_head: fieldVal.slice(0, 50),
        });
    }
  }
}

console.log("=== CAN THE BUILDER LOCATE A RECORD'S RAW TEXT REGION IN ITS FILE? ===");
console.log(`  cited JSON files indexed        : ${stats.fileTotal}`);
console.log(`  ...parseable as a JSON array     : ${stats.fileLocatable}`);
console.log(`  corpus records on those files    : ${stats.recTotal}`);
console.log(`  raw text region LOCATABLE        : ${stats.recRawRegionFound}`);
console.log(`  raw text region NOT locatable    : ${stats.recRawRegionMissing}`);
console.log(`  ...of which raw === decoded value : ${stats.rawRegionIsByteExact}`);
console.log(`  ...of which raw !== decoded value : ${stats.rawRegionDiffers}`);
for (const s of samples) console.log("   ", JSON.stringify(s));
