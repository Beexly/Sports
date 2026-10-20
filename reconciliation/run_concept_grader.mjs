#!/usr/bin/env node
/**
 * Run the concept grader against the live database.
 *
 * This is the end-to-end measurement for the concept axis: it resolves
 * premises to measures, measures the concept in real games, compares the
 * asserted direction against what happened, and reports the support and
 * the agreement rate for every premise it could grade.
 *
 * It reads:
 *   - the live lit.premise table on the Neon dev branch
 *   - the real game/stat tables
 *
 * and it uses the REAL grader module, imported directly, so the numbers
 * are the numbers the code produces.
 *
 * Reproduce: node reconciliation/run_concept_grader.mjs
 */
import { writeFileSync } from "node:fs";
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
const { gradeConceptPremises } = await import(
  pathToFileURL(
    resolve(root, "packages/prediction-engine/src/literature/literature-concept-grader.ts"),
  ).href
);
const { resolveMeasure } = await import(
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

// ---- the premises to grade -------------------------------------------
// Everything in the index that the resolver can send to a measure.
const rows = await db.query(
  `SELECT premise_key, source, claim_type, influence_direction,
          applicable_contexts, numeric_metric, numeric_unit, numeric_value, title
     FROM lit.premise
    WHERE applicable_contexts IS NOT NULL AND cardinality(applicable_contexts) > 0`,
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

// ---- run the grader ---------------------------------------------------
const report = await gradeConceptPremises(adapter, premises, { minSupport: 8 });

// ---- also report the small, fully-specified population ---------------
// The 18 records with a specific metric AND a usable direction, and the 3
// of those with a measurable context, are the immediate target.
const SPECIFIC = new Set([
  "public_darling_spread_shading", "blocker_survival_threshold",
  "two_high_disguise_rate", "separation_over_expected",
  "fourth_quarter_pass_rush_decay", "modern_home_field_advantage",
  "false_start_suppression_without_crowd", "coach_aversion_total_shift",
  "true_pathwise_trailing_equity", "dpi_hazard_rate_ratio",
  "post_turnover_box_run_rate_spike", "joint_tail_correlation_edge",
  "ol_continuity_threshold", "closing_line_value_alpha",
  "positive_definite_eigenvalue_floor", "injury_fatigue_hazard_spike",
  "empirical_rate", "off_target_throw_increase",
  "next_score_drive_states", "spread_or_scoring_margin",
]);

const targeted = premises.filter((p) => SPECIFIC.has(p.numeric_metric));
const targetedReport = await gradeConceptPremises(adapter, targeted, { minSupport: 8 });

const out = {
  artifact: "concept_grader_run",
  measured_at: new Date().toISOString(),
  grader: "packages/prediction-engine/src/literature/literature-concept-grader.ts",
  resolver: "packages/prediction-engine/src/literature/literature-measures.ts",
  branch: BRANCH,
  whole_index: {
    premises_with_contexts: premises.length,
    resolved_to_a_measure: report.resolved,
    graded: report.graded,
    refusal_counts: report.refusal_counts,
    grades: report.grades.map((g) => ({
      premise_key: g.premise_key,
      measure: g.measure_tag,
      surface: g.measure_surface,
      is_proxy: g.measure_is_proxy,
      measure_match: g.measure_match,
      support: g.support,
      judged: g.judged,
      agreements: g.agreements,
      disagreements: g.disagreements,
      agreement_rate: g.judged ? Number((g.agreements / g.judged).toFixed(4)) : null,
      activation_score: g.activation_score,
    })),
  },
  targeted_population: {
    note:
      "The 20 records with a SPECIFIC metric (the only ones whose metric names a quantity). The 18 with a usable direction are the immediately gradeable set; 3 more need only a direction.",
    premises: targeted.length,
    resolved: targetedReport.resolved,
    graded: targetedReport.graded,
    refusal_counts: targetedReport.refusal_counts,
    grades: targetedReport.grades.map((g) => ({
      premise_key: g.premise_key,
      measure: g.measure_tag,
      surface: g.measure_surface,
      is_proxy: g.measure_is_proxy,
      measure_match: g.measure_match,
      support: g.support,
      judged: g.judged,
      agreements: g.agreements,
      disagreements: g.disagreements,
      agreement_rate: g.judged ? Number((g.agreements / g.judged).toFixed(4)) : null,
      activation_score: g.activation_score,
      direction: g.direction,
    })),
    refusals: targetedReport.refusals,
  },
  honesty_note:
    "This run produces EVIDENCE only. A concept premise's activation_score is not a published probability, no concept premise is allowed to move trueProb, and the market-comparison gate (maxBrierScoreVsMarket 0.250) has not been applied to this axis. A premise scoring 0 here is not a failure of the mechanism -- it is the mechanism working.",
  reproduction: "node reconciliation/run_concept_grader.mjs",
};

const p = resolve(root, "reconciliation/concept_grader_run.json");
writeFileSync(p, JSON.stringify(out, null, 1));
console.log(JSON.stringify({
  whole_index: {
    premises_with_contexts: out.whole_index.premises_with_contexts,
    resolved: out.whole_index.resolved_to_a_measure,
    graded: out.whole_index.graded,
    refusal_counts: out.whole_index.refusal_counts,
  },
  targeted_population: {
    premises: out.targeted_population.premises,
    resolved: out.targeted_population.resolved,
    graded: out.targeted_population.graded,
    refusal_counts: out.targeted_population.refusal_counts,
    grades: out.targeted_population.grades,
  },
}, null, 1));

await db.end();
