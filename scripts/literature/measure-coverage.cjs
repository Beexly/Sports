#!/usr/bin/env node
/**
 * Coverage measurement for the literature index.
 *
 * Answers the three questions the work was scoped to answer:
 *   1. How many live events trigger literature evaluation?
 *   2. How many premises have been promoted (to causal edges)?
 *   3. Do the residuals improve? (do residuals shrink over time?)
 *
 * Writes reconciliation/literature-coverage.json.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";

function conn() {
  const url = execSync(
    `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

(async () => {
  const db = conn();
  await db.connect();

  const out = { branch: BRANCH, measured_at: new Date().toISOString() };

  // ---- 1. index size ----
  const idx = await db.query(
    `SELECT (SELECT count(*) FROM lit.premise)::int                     AS premises,
            (SELECT count(*) FROM lit.premise_vector)::int              AS premise_vectors,
            (SELECT count(*) FROM lit.corpus_item)::int                 AS corpus_items,
            (SELECT count(*) FROM lit.corpus_item WHERE embedding IS NOT NULL)::int AS corpus_vectors,
            (SELECT count(*) FROM lit.premise WHERE structure_state='structured')::int AS structured,
            (SELECT count(*) FROM lit.premise WHERE structure_state='raw')::int         AS raw_premises`
  );
  out.index = idx.rows[0];

  // ---- pillar coverage ----
  const pil = await db.query(
    `SELECT p AS pillar, count(*)::int AS premises
       FROM lit.premise, unnest(pillar_tags) p
      GROUP BY 1 ORDER BY 2 DESC`
  );
  out.pillar_coverage = pil.rows;

  const noPillar = await db.query(
    `SELECT count(*)::int AS n FROM lit.premise WHERE cardinality(pillar_tags) = 0`
  );
  out.premises_without_pillar = noPillar.rows[0].n;

  // ---- 2. live events ----
  const ev = await db.query(
    `SELECT count(*)::int                                AS retrieval_events,
            count(DISTINCT signal_key)::int              AS distinct_signals,
            count(DISTINCT game_id)::int                 AS distinct_games,
            count(*) FILTER (WHERE hit_count > 0)::int    AS events_with_hits,
            round(avg(latency_ms)::numeric, 2)            AS avg_latency_ms,
            max(latency_ms)::numeric                     AS max_latency_ms,
            count(*) FILTER (WHERE used_hnsw)::int        AS hnsw_backed
       FROM lit.retrieval_event`
  );
  out.retrieval_events = ev.rows[0];

  // ---- signal-level coverage: which signal families reach the literature ----
  const sig = await db.query(
    `SELECT split_part(signal_key, '.', 1) AS family,
            count(*)::int                     AS events,
            count(*) FILTER (WHERE hit_count > 0)::int AS events_with_hits,
            round(avg(hit_count)::numeric, 2) AS avg_hits
       FROM lit.retrieval_event
      GROUP BY 1 ORDER BY 2 DESC`
  );
  out.signal_family_coverage = sig.rows;

  // ---- activations ----
  const act = await db.query(
    `SELECT count(*)::int                          AS activations,
            count(DISTINCT premise_id)::int         AS distinct_premises_activated,
            count(DISTINCT retrieval_event_id)::int AS events_with_activations,
            round(avg(activation_score)::numeric, 5) AS avg_activation_score
       FROM lit.activation`
  );
  out.activations = act.rows[0];

  // ---- 3. residuals and improvement ----
  const res = await db.query(
    `SELECT count(*)::int                              AS residuals,
            count(DISTINCT premise_id)::int             AS premises_graded,
            count(DISTINCT game_id)::int                AS games_graded,
            round(avg(abs(residual))::numeric, 6)       AS mean_abs_residual,
            round(avg(residual)::numeric, 6)            AS mean_signed_residual,
            count(*) FILTER (WHERE outcome_correct)::int AS correct
       FROM lit.residual`
  );
  out.residuals = res.rows[0];

  // residual trend: mean |residual| in the first half vs the second half of
  // the graded history. If the loop works, the later residuals are smaller.
  const trend = await db.query(
    `WITH ordered AS (
        SELECT residual, row_number() OVER (ORDER BY graded_at) AS rn,
               count(*) OVER () AS total
          FROM lit.residual
     )
     SELECT CASE WHEN rn <= total / 2 THEN 'first_half' ELSE 'second_half' END AS half,
            count(*)::int AS n,
            round(avg(abs(residual))::numeric, 6) AS mean_abs_residual,
            round(avg(residual * residual)::numeric, 6) AS mse
       FROM ordered GROUP BY 1 ORDER BY 1`
  );
  out.residual_trend = trend.rows;
  const halves = Object.fromEntries(trend.rows.map((r) => [r.half, r]));
  out.residuals_improved =
    halves.first_half && halves.second_half
      ? Number(halves.second_half.mean_abs_residual) < Number(halves.first_half.mean_abs_residual)
      : null;

  // ---- promoted premises / causal edges ----
  const pr = await db.query(
    `SELECT count(*)::int                              AS scored_premises,
            count(*) FILTER (WHERE activation_score > 0)::int AS scoring_premises,
            count(*) FILTER (WHERE promoted)::int       AS promoted_flag,
            round(avg(activation_score)::numeric, 6)   AS avg_activation_score,
            max(activation_score)::numeric              AS max_activation_score
       FROM lit.premise_score`
  );
  out.premise_scores = pr.rows[0];

  const edges = await db.query(
    `SELECT count(*)::int AS causal_edges,
            count(*) FILTER (WHERE status='promoted')::int AS promoted_edges,
            count(*) FILTER (WHERE status='retired')::int  AS retired_edges
       FROM lit.causal_edge`
  );
  out.causal_edges = edges.rows[0];

  const tests = await db.query(
    `SELECT verdict, count(*)::int AS n, round(avg(estimate)::numeric, 6) AS avg_estimate,
            round(avg(p_value)::numeric, 6) AS avg_p_value
       FROM lit.intervention_test GROUP BY 1 ORDER BY 2 DESC`
  );
  out.intervention_tests = tests.rows;

  // ---- discovery ----
  const disc = await db.query(
    `SELECT count(*)::int AS corpus_hits,
            count(DISTINCT corpus_id)::int AS distinct_corpus_surfaced,
            (SELECT count(*) FROM lit.corpus_item WHERE structured_at IS NOT NULL)::int AS structured_from_corpus
       FROM lit.discovery_hit`
  );
  out.discovery = disc.rows[0];

  // ---- retrieval latency distribution (the HNSW claim) ----
  const lat = await db.query(
    `SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p50_ms,
            round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p95_ms,
            round(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p99_ms
       FROM lit.retrieval_event WHERE latency_ms IS NOT NULL`
  );
  out.latency = lat.rows[0];

  // ---- index plan check ----
  const plan = await db.query(
    `EXPLAIN (COSTS OFF)
     SELECT p.id FROM lit.premise_vector v JOIN lit.premise p ON p.id = v.premise_id
      WHERE p.structure_state='structured'
      ORDER BY v.embedding <=> (SELECT embedding FROM lit.premise_vector LIMIT 1) LIMIT 20`
  );
  out.query_plan = plan.rows.map((r) => r["QUERY PLAN"]);
  out.uses_hnsw_index = out.query_plan.some((l) => /Index Scan using premise_vector_hnsw_idx/i.test(l));

  const outp = path.join(REPO, "reconciliation", "literature-coverage.json");
  fs.writeFileSync(outp, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  console.log("\nwrote", outp);

  await db.end();
})().catch((e) => { console.error("ERR", e); process.exit(1); });
