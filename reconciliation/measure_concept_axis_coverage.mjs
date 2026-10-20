#!/usr/bin/env node
/**
 * Measure how many MIND premises resolve to a measure in the real
 * registry.
 *
 * This is the acceptance measurement for
 * reconciliation/staged_improvements/08-measure-resolver-concept-axis.md
 * ("Measured end to end: the grader runs over the gradeable premises and
 * reports how many were graded, how many were excluded and why").
 *
 * It reads:
 *   - packages/prediction-engine/data/MIND_CORPUS_3000.jsonl (the corpus)
 *   - the live lit.premise table on the Neon dev branch (the index)
 *
 * and applies the SAME resolution the resolver applies, so the number is
 * the number the code produces, not a re-derivation of it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { Client } from "pg";

// Raw Node cannot resolve the "./x.js" specifier the TypeScript build
// requires, so a resolve hook maps it to the sibling .ts file. This lets
// the script import the repo's REAL modules with no build step.
import { register } from "node:module";
register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { MEASURE_REGISTRY, MEASURE_RESOLUTION_ORDER, resolveMeasure } = await import(
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

// ---------------------------------------------------------------- corpus
const corpusPath = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
const mind = readFileSync(corpusPath, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

/**
 * Apply the resolver to a MIND record.
 *
 * The MIND record's context tags and direction are the same fields the
 * indexer copies into lit.premise.applicable_contexts and
 * lit.premise.influence_direction, so this is the same resolution the
 * live grader would perform.
 */
function resolveMindRecord(r) {
  const nc = r.numeric_claim || {};
  return {
    key: r.item_id,
    title: r.title,
    claimType: r.claim_type,
    domain: r.domain,
    direction: r.influence_direction,
    contexts: r.applicable_contexts || [],
    metric: nc.metric ?? null,
    hasNumber: typeof nc.value === "number",
    resolution: resolveMeasure(r.applicable_contexts || [], r.influence_direction),
  };
}

const resolved = mind.map(resolveMindRecord);

const byRefusal = {};
const byTag = {};
const byClaimType = {};
for (const r of resolved) {
  const key = r.resolution.refusal ?? "RESOLVED";
  byRefusal[key] = (byRefusal[key] || 0) + 1;
  if (r.resolution.resolvedTag) {
    byTag[r.resolution.resolvedTag] = (byTag[r.resolution.resolvedTag] || 0) + 1;
    byClaimType[r.claimType] = (byClaimType[r.claimType] || 0) + 1;
  }
}

// The gradeable population: resolved AND assertable (correlational or
// causal) AND with a named metric (not a placeholder).
const PLACEHOLDERS = new Set([
  "situational_game_unit", "statistical_parameter", "temporal_epoch",
  "empirical_sample_size", "performance_ratio", null,
]);
const gradeable = resolved.filter(
  (r) =>
    r.resolution.measure !== null &&
    (r.claimType === "correlational" || r.claimType === "causal"),
);
const fullySpecified = gradeable.filter(
  (r) => !PLACEHOLDERS.has(r.metric) && r.hasNumber,
);

// ------------------------------------------------------- the live index
let indexCounts = null;
let indexResolved = null;
try {
  const db = new Client({
    connectionString: connString(),
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  const total = await db.query(
    "SELECT count(*)::int n FROM lit.premise",
  );
  const bySource = await db.query(
    `SELECT source, count(*)::int n,
            count(*) FILTER (WHERE numeric_unit IN ('probability','prob','p','fraction','share','rate')
                             AND numeric_value BETWEEN 0 AND 1)::int prob_gradeable
       FROM lit.premise GROUP BY 1 ORDER BY 2 DESC`,
  );
  // Resolve every live premise through the SAME resolver.
  const rows = await db.query(
    `SELECT premise_key, source, claim_type, influence_direction,
            applicable_contexts, numeric_metric, numeric_unit, numeric_value
       FROM lit.premise`,
  );
  const refusals = {};
  const tags = {};
  let resolvedCount = 0;
  let resolvedGradeable = 0;
  for (const p of rows.rows) {
    const r = resolveMeasure(p.applicable_contexts || [], p.influence_direction);
    const key = r.refusal ?? "RESOLVED";
    refusals[key] = (refusals[key] || 0) + 1;
    if (r.measure) {
      resolvedCount += 1;
      tags[r.resolvedTag] = (tags[r.resolvedTag] || 0) + 1;
      if (p.claim_type === "correlational" || p.claim_type === "causal") {
        resolvedGradeable += 1;
      }
    }
  }
  indexCounts = {
    total_premises: total.rows[0].n,
    by_source: bySource.rows,
    resolved_to_a_measure: resolvedCount,
    resolved_and_correlational_or_causal: resolvedGradeable,
    refusals,
    resolved_tag_distribution: Object.fromEntries(
      Object.entries(tags).sort((a, b) => b[1] - a[1]),
    ),
  };
  indexResolved = true;
  await db.end();
} catch (err) {
  indexCounts = { error: err.message };
}

const out = {
  artifact: "concept_axis_coverage",
  measured_at: new Date().toISOString(),
  resolver: "packages/prediction-engine/src/literature/literature-measures.ts",
  registry_size: MEASURE_REGISTRY.length,
  registry_tags: MEASURE_RESOLUTION_ORDER.slice(),
  mind_corpus: {
    records: mind.length,
    resolved_to_a_measure: resolved.length - (byRefusal.no_context_tags || 0) -
      (byRefusal.no_measurable_tag || 0) - (byRefusal.conditional_direction || 0) -
      (byRefusal.no_direction || 0),
    refusals: byRefusal,
    resolved_tag_distribution: Object.fromEntries(
      Object.entries(byTag).sort((a, b) => b[1] - a[1]),
    ),
    resolved_claim_type_distribution: byClaimType,
    gradeable_correlational_or_causal: gradeable.length,
    fully_specified_also_named_metric: fullySpecified.length,
    fully_specified_examples: fullySpecified.slice(0, 8).map((r) => ({
      key: r.key,
      title: r.title,
      metric: r.metric,
      direction: r.direction,
      contexts: r.contexts,
      measure: r.resolution.measure?.contextTag,
      measure_surface: r.resolution.measure
        ? `${r.resolution.measure.table}.${r.resolution.measure.column}`
        : null,
      is_proxy: r.resolution.measure?.isProxy ?? null,
    })),
  },
  live_index: indexCounts,
  reproduction: "node reconciliation/measure_concept_axis_coverage.mjs",
};

const p = resolve(root, "reconciliation/concept_axis_coverage.json");
writeFileSync(p, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
