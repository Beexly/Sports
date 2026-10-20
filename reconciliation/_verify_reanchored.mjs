/**
 * THROWAWAY VERIFIER: re-runs the independent gate over the RE-ANCHORED
 * output and checks the invariants the pass promises. Independent of the
 * pass's own reporting.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
register(new URL("./ts-resolve-hook.mjs", import.meta.url));
const { verifyCorpus } = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/literature/literature-verification.ts")).href
);

const IN = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
const OUT = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.reanchored.jsonl");
const load = (p) => readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).map(JSON.parse);
const before = load(IN);
const after = load(OUT);

// library: exactly the paths the records name + the paper corpus
const library = new Map();
const paths = [...new Set(after.map((r) => r.source_path).filter(Boolean))].sort();
for (const rel of paths) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, "utf8");
  library.set(rel, text);
  if (!library.has(basename(rel))) library.set(basename(rel), text);
}

const { summary } = verifyCorpus(after, library);
console.log("=== INDEPENDENT GATE OVER THE RE-ANCHORED OUTPUT ===");
for (const [k, v] of Object.entries(summary)) {
  if (typeof v === "object") continue;
  console.log(`  ${k.padEnd(22)} ${v}`);
}
console.log(`  failed_layer_counts    ${JSON.stringify(summary.failed_layer_counts)}`);

let badSpan = 0;
let badUncitable = 0;
let badQuarantine = 0;
let quarantined = 0;
for (const r of after) {
  const span = r.evidence_span;
  if (r.record_class === "CITABLE_VERIFIED") {
    const doc = r.source_path ? library.get(r.source_path) : undefined;
    const ok =
      doc !== undefined &&
      typeof span?.start_char === "number" &&
      doc.slice(span.start_char, span.end_char) === r.evidence_quote;
    if (!ok) badSpan++;
  } else {
    if (typeof span?.start_char === "number" || r.verification_tier === "MSVH_S1_EXACT") badUncitable++;
  }
  if (r.status === "QUARANTINED") {
    quarantined++;
    if (r.source_file !== null || r.source_path !== null || r.citable !== false) badQuarantine++;
    if (typeof r.quarantine_reason !== "string" || !r.quarantine_reason) badQuarantine++;
  }
}

const idsBefore = before.map((r) => r.item_id).sort();
const idsAfter = after.map((r) => r.item_id).sort();
const sameIds = idsBefore.length === idsAfter.length && idsBefore.every((v, i) => v === idsAfter[i]);

console.log("");
console.log("=== INVARIANTS ===");
console.log(`  record count preserved (${before.length} -> ${after.length}) : ${before.length === after.length}`);
console.log(`  item_id multiset preserved                   : ${sameIds}`);
console.log(`  CITABLE_VERIFIED whose span != their quote   : ${badSpan}`);
console.log(`  non-citable claiming a span or EXACT tier    : ${badUncitable}`);
console.log(`  QUARANTINED records                          : ${quarantined}`);
console.log(`  quarantined with a surviving source/reason   : ${badQuarantine}`);
const classes = {};
for (const r of after) classes[r.record_class] = (classes[r.record_class] ?? 0) + 1;
const statuses = {};
for (const r of after) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
console.log(`  classes  ${JSON.stringify(classes)}`);
console.log(`  statuses ${JSON.stringify(statuses)}`);
