#!/usr/bin/env node
/**
 * Is the corpus's DIRECTION signal, or noise?
 *
 * THE QUESTION. The concept grader works: 140 premises are graded with
 * no silent failures. But the agreement rates are weak (median 0.4911,
 * max 0.5153), and every premise sharing a measure shares a score --
 * so the score is a MEASURE-level number, not a premise-level one.
 *
 * That is consistent with the direction being noise: the corpus's
 * `influence_direction` came from a two-regex keyword fallback
 * (96.5% of records match neither regex --
 * reconciliation/concept_axis_coverage.md), so most directions are
 * arbitrary and the agreement rate should sit at 0.5.
 *
 * THE TEST. For each measure that the corpus actually reaches, grade
 * the SAME data with the corpus's asserted direction and with the
 * INVERTED direction. If the corpus's direction carries information,
 * its rate should be materially above the inverted one. If the direction
 * is noise, the two rates will be mirror images around 0.5 and the
 * choice is arbitrary.
 *
 * A third number matters: the BEST achievable rate for that measure,
 * i.e. the rate under the better of the two directions. That is the
 * ceiling the concept axis can reach on this data, and it says whether
 * the CONCEPT carries information even when the DIRECTION does not.
 *
 * Reproduce: node reconciliation/measure_direction_signal.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import { execSync } from "node:child_process";
import { Client } from "pg";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { gradeConceptPremises } = await import(
  pathToFileURL(
    resolve(root, "packages/prediction-engine/src/literature/literature-concept-grader.ts"),
  ).href
);
const { MEASURE_REGISTRY } = await import(
  pathToFileURL(
    resolve(root, "packages/prediction-engine/src/literature/literature-measures.ts"),
  ).href
);

const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";
const PROJECT = "summer-brook-99380762";

function connString() {
  const out = execSync(
    `neonctl connection-string ${BRANCH} --project-id ${PROJECT} --role-name neondb_owner`,
    { encoding: "utf8" },
  );
  return out.trim().split("\n").pop().replace(/"/g, "");
}

const db = new Client({ connectionString: connString(), ssl: { rejectUnauthorized: false } });
await db.connect();
const adapter = {
  query: async (sql, values) => {
    const r = await db.query(sql, values ?? []);
    return { rows: r.rows, rowCount: r.rowCount };
  },
};

const rows = await db.query(
  `SELECT premise_key, source, claim_type, influence_direction,
          applicable_contexts, numeric_metric, numeric_unit, numeric_value, title
     FROM lit.premise
    WHERE applicable_contexts IS NOT NULL AND cardinality(applicable_contexts) > 0
      AND influence_direction IN ('positive','negative')`,
);

const premises = rows.rows.map((r) => ({
  premise_key: r.premise_key,
  source: r.source,
  claim_type: r.claim_type,
  influence_direction: r.influence_direction,
  applicable_contexts: r.applicable_contexts,
  numeric_metric: r.numeric_metric,
  numeric_unit: r.numeric_unit,
  numeric_value: r.numeric_value,
  title: r.title,
}));

// Grade the corpus's direction, and the inverted one, on the SAME data.
const asAsserted = await gradeConceptPremises(adapter, premises, { minSupport: 8 });
const inverted = await gradeConceptPremises(
  adapter,
  premises.map((p) => ({
    ...p,
    influence_direction: p.influence_direction === "positive" ? "negative" : "positive",
  })),
  { minSupport: 8 },
);

const assertedBy = new Map(asAsserted.grades.map((g) => [g.premise_key, g]));
const invertedBy = new Map(inverted.grades.map((g) => [g.premise_key, g]));

// Per MEASURE: the corpus's rate, the inverted rate, and the ceiling.
const perMeasure = new Map();
for (const [key, g] of assertedBy) {
  const inv = invertedBy.get(key);
  if (!inv) continue;
  const tag = g.measure_tag;
  let m = perMeasure.get(tag);
  if (!m) {
    m = { measure: tag, premises: 0, asserted_rates: [], inverted_rates: [], support: g.support };
    perMeasure.set(tag, m);
  }
  m.premises += 1;
  m.asserted_rates.push(g.agreements / g.judged);
  m.inverted_rates.push(inv.agreements / inv.judged);
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const measures = [...perMeasure.values()].map((m) => {
  const asserted = mean(m.asserted_rates);
  const invertedRate = mean(m.inverted_rates);
  const best = Math.max(asserted, invertedRate);
  return {
    measure: m.measure,
    premises: m.premises,
    support: m.support,
    asserted_rate: asserted === null ? null : Number(asserted.toFixed(4)),
    inverted_rate: invertedRate === null ? null : Number(invertedRate.toFixed(4)),
    gap_asserted_minus_inverted:
      asserted === null ? null : Number((asserted - invertedRate).toFixed(4)),
    best_achievable_rate: best === null ? null : Number(best.toFixed(4)),
    edge_over_chance: best === null ? null : Number((best - 0.5).toFixed(4)),
    direction_carries_information:
      asserted === null
        ? null
        : asserted - invertedRate > 0.01
          ? "YES: the corpus's direction beats the inverted one by more than 1 point"
          : asserted - invertedRate < -0.01
            ? "NO: the corpus's direction is WORSE than the inverse -- the direction is noise"
            : "INDISTINGUISHABLE: the two are within 1 point of each other",
  };
});

// Per-premise: how many of the corpus's directions beat the inverse?
let better = 0;
let worse = 0;
let tied = 0;
for (const [key, g] of assertedBy) {
  const inv = invertedBy.get(key);
  if (!inv) continue;
  const a = g.agreements / g.judged;
  const b = inv.agreements / inv.judged;
  if (a - b > 1e-9) better += 1;
  else if (b - a > 1e-9) worse += 1;
  else tied += 1;
}

const out = {
  artifact: "direction_signal_measurement",
  measured_at: new Date().toISOString(),
  question: "Does the corpus's influence_direction carry information, or is it keyword-fallback noise?",
  method:
    "Grade the same data twice per premise: once with the corpus's asserted direction and once with it INVERTED. The gap between the two says whether the direction choice is meaningful.",
  premises_graded: asAsserted.grades.length,
  per_measure: measures,
  per_premise_direction_test: {
    corpus_direction_better_than_inverse: better,
    corpus_direction_worse_than_inverse: worse,
    tied: tied,
    note:
      "A premise's rate and its inverse's rate sum to 1 over the same judgments, so 'tied' means the two are exactly complementary -- the direction choice makes no difference at all.",
  },
  ceiling: {
    note:
      "The best achievable rate per measure, i.e. the ceiling the concept axis can reach on this data with a PERFECT direction. If even the ceiling is near 0.5, the concept carries no association and no direction can rescue it.",
    best_rate_over_coin_flip: measures.map((m) => ({
      measure: m.measure,
      best_rate: m.best_achievable_rate,
      edge_over_chance: m.edge_over_chance,
    })),
  },
  reproduction: "node reconciliation/measure_direction_signal.mjs",
};

const p = resolve(root, "reconciliation/direction_signal_measurement.json");
writeFileSync(p, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await db.end();
