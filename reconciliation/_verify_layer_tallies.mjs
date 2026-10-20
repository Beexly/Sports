#!/usr/bin/env node
/**
 * PER-CLAYER TALLIES, UNDER THE GATE'S OWN PREDICATES.
 *
 * The end-to-end doc reports a per-class table:
 *
 *   CITABLE_VERIFIED      n=1,098  L1=1,098 L2=1,098 L3=1,098 L4=1,098
 *   HONESTLY_UNCITED_PRIOR n=2,881  L1=2,484 L2=  828 L3=    0 L4=  867
 *
 * But the corpus's own status field says 2,674 LINK_VERIFIED_SEMANTIC_FAIL
 * + 397 UNCITED_NO_SOURCE = 3,071 records in the non-admitted classes,
 * and 2,674 + 397 != 2,881. So the table does not reconcile with the
 * corpus, and one of the two is wrong.
 *
 * This re-derives the per-class, per-layer tallies by calling the
 * gate's OWN exported predicates (checkL1Provenance, L2, L3, L4)
 * against each corpus record and its real source document.
 *
 * Reproduce: node reconciliation/_verify_layer_tallies.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = join(
  root,
  "docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl",
);

const gate = await import(
  pathToFileURL(
    join(
      root,
      "packages/prediction-engine/src/literature/literature-verification.ts",
    ),
  ).href
);

const lines = readFileSync(CORPUS, "utf8").split("\n").filter(Boolean);
const records = lines.map((l) => JSON.parse(l));

const docCache = new Map();
const loadDoc = (p) => {
  if (!p) return undefined;
  if (docCache.has(p)) return docCache.get(p);
  let txt;
  try {
    txt = readFileSync(join(root, p), "utf8");
  } catch {
    txt = undefined;
  }
  docCache.set(p, txt);
  return txt;
};

const classes = {};
for (const r of records) {
  const cls = r.record_class ?? "(none)";
  classes[cls] ??= { n: 0, L1: 0, L2: 0, L3: 0, L4: 0, admitted: 0, byStatus: {} };
  const c = classes[cls];
  c.n++;
  c.byStatus[r.status] = (c.byStatus[r.status] ?? 0) + 1;

  const doc = loadDoc(r.source_path);
  const rec = {
    evidence_quote: r.evidence_quote ?? "",
    mechanism_quote: r.mechanism_quote ?? "",
    numeric_claim: r.numeric_claim ?? null,
    parsed_float_magnitude: r.parsed_float_magnitude ?? null,
    applicable_context_fields: r.applicable_context_fields ?? [],
    evidence_span: r.evidence_span ?? null,
    mechanism_span: r.mechanism_span ?? null,
  };

  const l1 = gate.checkL1Provenance(rec, doc);
  const l2 = gate.checkL2NumericContainment(rec);
  const l3 = gate.checkL3SpanAnchoring(rec, doc);
  const l4 = gate.checkL4MechanismEntailment(rec, doc);
  if (l1) c.L1++;
  if (l2) c.L2++;
  if (l3) c.L3++;
  if (l4) c.L4++;
  if (l1 && l2 && l3 && l4) c.admitted++;
}

console.log("=== PER-CLASS, PER-LAYER TALLIES (the gate's own predicates) ===\n");
console.log(
  "  class                          n      L1      L2      L3      L4   admitted",
);
for (const [cls, c] of Object.entries(classes).sort((a, b) => b[1].n - a[1].n)) {
  console.log(
    `  ${cls.padEnd(30)}${String(c.n).padStart(5)}${String(c.L1).padStart(7)}` +
      `${String(c.L2).padStart(7)}${String(c.L3).padStart(7)}${String(c.L4).padStart(7)}` +
      `${String(c.admitted).padStart(10)}`,
  );
  for (const [st, n] of Object.entries(c.byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${st.padEnd(42)}${String(n).padStart(6)}`);
  }
}

const tot = { n: 0, L1: 0, L2: 0, L3: 0, L4: 0, admitted: 0 };
for (const c of Object.values(classes)) {
  for (const k of Object.keys(tot)) tot[k] += c[k];
}
console.log("\n=== THE TOTALS ===\n");
console.log(`  corpus records            ${tot.n}`);
console.log(`  L1 verbatim provenance     ${tot.L1}  (${((100 * tot.L1) / tot.n).toFixed(1)}%)`);
console.log(`  L2 numeric containment     ${tot.L2}  (${((100 * tot.L2) / tot.n).toFixed(1)}%)`);
console.log(`  L3 span anchoring          ${tot.L3}  (${((100 * tot.L3) / tot.n).toFixed(1)}%)`);
console.log(`  L4 mechanism entailment    ${tot.L4}  (${((100 * tot.L4) / tot.n).toFixed(1)}%)`);
console.log(`  ADMITTED (all four)        ${tot.admitted}  (${((100 * tot.admitted) / tot.n).toFixed(1)}%)`);
console.log(
  `\n  status ACTIVE              ${records.filter((r) => r.status === "ACTIVE").length}`,
);
console.log(
  `  admitted by the gate       ${tot.admitted}  -- MUST equal the ACTIVE count if the`,
);
console.log(
  "                            two views of the corpus agree.",
);
