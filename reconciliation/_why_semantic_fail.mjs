#!/usr/bin/env node
/**
 * WHY DO THE 2,674 FAIL?
 *
 * The builder computes `_failed_layers` for every record whose gate
 * verdict was not admitted, but it does NOT persist that field into
 * the corpus -- so the corpus records the FACT of a failure and not
 * the REASON. That is the same defect class this whole reconciliation
 * exists to remove: a label ("LINK_VERIFIED_SEMANTIC_FAIL") that says
 * THAT something failed without saying WHAT.
 *
 * So: import the builder's own classifier and re-run it over the
 * corpus, capturing the failed layers, and report the distribution.
 *
 * The point is to answer one question with a measurement: of the
 * 2,674 records whose quotes ARE byte-exact in their documents, how
 * many fail L2 (the number is not in the quote), how many fail L4
 * (the document is not about a sport), and how many fail both?
 *
 * Reproduce: node reconciliation/_why_semantic_fail.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = join(
  root,
  "docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl",
);

// On Windows an absolute path is not a valid ESM specifier -- it must
// be a file:// URL.
const mod = await import(
  pathToFileURL(join(root, "scripts/build-grounded-mind-corpus.mjs")).href
);

// The builder's classifier is not exported by name in every build;
// find it by shape.
const classifierExports = Object.keys(mod).filter((k) => {
  const v = mod[k];
  return typeof v === "function" && /classif|gateRecord|classifyRecord/i.test(k);
});
console.log(
  `=== builder exports matching a classifier: ${
    classifierExports.join(", ") || "(none found by name)"
  } ===`,
);

// The gate itself is the authority on the four layers.
const gate = await import(
  pathToFileURL(
    join(
      root,
      "packages/prediction-engine/src/literature/literature-verification.ts",
    ),
  ).href
);
console.log(`=== gate exports: ${Object.keys(gate).join(", ")} ===\n`);

const lines = readFileSync(CORPUS, "utf8").split("\n").filter(Boolean);
const records = lines.map((l) => JSON.parse(l));

const byStatus = {};
for (const r of records) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

console.log("=== THE CORPUS AS IT STANDS (post-A087, re-run and confirmed) ===");
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(5)}  ${k}`);
}
console.log(
  `\n  admitted (ACTIVE): ${byStatus.ACTIVE ?? 0} / ${records.length} = ` +
    `${((100 * (byStatus.ACTIVE ?? 0)) / records.length).toFixed(2)}%`,
);

/**
 * THE COUNT THAT MATTERS.
 *
 * The 2,674 LINK_VERIFIED_SEMANTIC_FAIL records all have their quote
 * byte-exact in the document they name -- that is what "LINK_VERIFIED"
 * means. They fail a LATER layer. So the question "how many records
 * are uncited for real reasons" has a precise answer:
 *
 *   uncited FOR REAL REASONS  = UNCITED_NO_SOURCE (no document, or no
 *                                locatable quote in it)
 *   verified but not admissible = LINK_VERIFIED_SEMANTIC_FAIL
 */
const genuinelyUncited = byStatus.UNCITED_NO_SOURCE ?? 0;
const verifiedNotAdmissible = byStatus.LINK_VERIFIED_SEMANTIC_FAIL ?? 0;

console.log("\n=== THE SPLIT THAT MATTERS ===");
console.log(
  `  quote NOT locatable in any document   ${String(genuinelyUncited).padStart(5)}` +
    `   (${((100 * genuinelyUncited) / records.length).toFixed(2)}%)  <- uncited for real reasons`,
);
console.log(
  `  quote byte-exact, claim not supported ${String(verifiedNotAdmissible).padStart(5)}` +
    `   (${((100 * verifiedNotAdmissible) / records.length).toFixed(2)}%)  <- a SEMANTIC failure, not a provenance one`,
);
console.log(
  `  admitted                              ${String(byStatus.ACTIVE ?? 0).padStart(5)}` +
    `   (${((100 * (byStatus.ACTIVE ?? 0)) / records.length).toFixed(2)}%)  <- the truthful admission rate`,
);
console.log(
  `  derived from a table, not a quote     ${String(byStatus.DERIVED_TABLE ?? 0).padStart(5)}` +
    `   (${((100 * (byStatus.DERIVED_TABLE ?? 0)) / records.length).toFixed(2)}%)  <- not citable by construction`,
);

/**
 * Now: WHAT do the 2,674 fail ON? Re-run the gate's own predicate
 * logic over the corpus, using the spans the builder already stored.
 *
 * A record is LINK_VERIFIED when its evidence_span selects its quote.
 * It is SEMANTIC_FAIL when a later layer fails. So for each such
 * record, test the remaining layers directly against the record's
 * own fields.
 */
console.log("\n=== WHICH LAYER FAILS, for the LINK_VERIFIED_SEMANTIC_FAIL set ===");

// Build the layer-4 exclusion vocabulary from the gate module itself
// if it exposes one; otherwise use the spec's set.
const EXCL = [
  "no free lunch",
  "thermodynamic",
  "radar synthetic aperture",
  "mri spin-lattice",
  "ufcoctagon",
  "underwater acoustic",
];

const semanticFails = records.filter(
  (r) => r.status === "LINK_VERIFIED_SEMANTIC_FAIL",
);

/**
 * The numeric token of a claim.
 *
 * The claim may be a NUMBER, a STRING, or an OBJECT with a `.value`.
 * The gate resolves it the same way (it falls back to
 * `parsed_float_magnitude`, then to `claim.value`), so this must too
 * -- otherwise a claim like `{ value: 0.25, unit: "sec" }` reports as
 * having no token, which is a bug in the REPORT and not in the data.
 */
const numToken = (c, magnitude) => {
  if (magnitude !== null && magnitude !== undefined && Number.isFinite(Number(magnitude))) {
    return String(magnitude);
  }
  if (c === null || c === undefined) return null;
  if (typeof c === "object") {
    if (c.value !== null && c.value !== undefined && Number.isFinite(Number(c.value))) {
      return String(c.value);
    }
    return null;
  }
  const m = String(c).match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i);
  return m ? m[0] : null;
};

const layerCounts = { L2: 0, L4: 0, L2_AND_L4: 0, OTHER: 0 };
let noNumericToken = 0;
let hasExclHit = 0;

// USE THE GATE'S OWN PREDICATES.
//
// The first version of this script re-implemented the L2 and L4 rules
// in the report, which is the wrong instrument: if the report and the
// gate ever disagree, the report is the one that is wrong -- and a
// report that reimplements the rules under test cannot be trusted to
// measure the gate. So the gate's own exported checks are called, on
// the corpus records, and their verdicts are counted.
//
// The signature of each check is read from the module itself.
console.log("=== the gate's check signatures ===");
for (const k of [
  "checkL1Provenance",
  "checkL2NumericContainment",
  "checkL3SpanAnchoring",
  "checkL4MechanismEntailment",
]) {
  const fn = gate[k];
  console.log(`  ${k}: ${fn ? fn.length + " arg(s)" : "MISSING"}`);
}

// L4 needs the SOURCE DOCUMENT, because it checks that the mechanism
// is IN the document and that the document is about a sport. So the
// documents are loaded -- once each, by path -- and the gate's own
// L1 and L4 predicates are called against them.
const docCache = new Map();
const loadDoc = (p) => {
  if (!p) return undefined;
  if (docCache.has(p)) return docCache.get(p);
  const abs = join(root, p);
  let txt;
  try {
    txt = readFileSync(abs, "utf8");
  } catch {
    txt = undefined;
  }
  docCache.set(p, txt);
  return txt;
};

for (const r of semanticFails) {
  const q = String(r.evidence_quote ?? "");
  const nu = numToken(r.numeric_claim, r.parsed_float_magnitude);
  if (!nu) noNumericToken++;

  // L2: the gate's own predicate, called with the record's own
  // fields. One argument -- the record.
  const l2 = gate.checkL2NumericContainment({
    evidence_quote: q,
    numeric_claim: r.numeric_claim,
    parsed_float_magnitude: r.parsed_float_magnitude ?? null,
  });

  // L1 and L4 need the document. The builder recorded the path.
  const doc = loadDoc(r.source_path);
  const l1 = gate.checkL1Provenance(
    { evidence_quote: q, ...r },
    doc,
  );
  const l4 = gate.checkL4MechanismEntailment(
    {
      mechanism_quote: r.mechanism_quote ?? "",
      applicable_context_fields: r.applicable_context_fields ?? [],
      ...r,
    },
    doc,
  );

  const low = q.toLowerCase();
  const exclHit = (gate.CROSS_DOMAIN_EXCLUSION_TERMS ?? EXCL).some((e) =>
    low.includes(String(e).toLowerCase()),
  );
  if (exclHit) hasExclHit++;

  // The record is LINK_VERIFIED, so L1 and L3 already passed. The
  // failure is in L2 or L4.
  if (!l2 && !l4) layerCounts.L2_AND_L4++;
  else if (!l2) layerCounts.L2++;
  else if (!l4) layerCounts.L4++;
  else layerCounts.OTHER++;
}

console.log(
  `  L2 only  (the number is not in the quote)      ${String(layerCounts.L2).padStart(5)}`,
);
console.log(
  `  L4 only  (the mechanism is not entailed)       ${String(layerCounts.L4).padStart(5)}`,
);
console.log(
  `  L2 AND L4                                    ${String(layerCounts.L2_AND_L4).padStart(5)}`,
);
console.log(
  `  neither (some other layer)                    ${String(layerCounts.OTHER).padStart(5)}`,
);
console.log(
  `  (of the L2 failures, ${noNumericToken} had no numeric token in the claim at all)`,
);
console.log(
  `  (${hasExclHit} quotes hit the cross-domain exclusion vocabulary)`,
);

console.log(
  "\n=== NOTE: the builder does not persist _failed_layers, so the",
);
console.log(
  "    counts above are re-derived here from the record's own fields.",
);
console.log(
  "    They are the gate's rules applied to the corpus, not the",
);
console.log(
  "    builder's own tally. If they disagree with the builder, the",
);
console.log(
  "    builder's tally is the authority and this report is wrong.",
);
