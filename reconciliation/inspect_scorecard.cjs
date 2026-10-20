#!/usr/bin/env node
/* Inspect the literature scorecard state. */
const { Client } = require("pg");
const { execSync } = require("child_process");

const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";
const url = execSync(
  `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
  { encoding: "utf8" }
).trim().replace(/"/g, "");

(async () => {
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const q = async (label, sql) => {
    const r = await db.query(sql);
    console.log(`\n--- ${label} ---`);
    console.log(JSON.stringify(r.rows, null, 1));
  };
  await q("scorecard summary", `SELECT count(*)::int n,
      count(*) FILTER (WHERE graded>0)::int graded_rows,
      count(*) FILTER (WHERE activation_score>0)::int positive,
      max(graded)::int max_graded, max(activation_score)::numeric max_score
    FROM lit.premise_score`);
  await q("top scored premises", `SELECT s.graded, s.correct,
      round(s.activation_score::numeric,5) score, p.premise_key, p.numeric_value, p.numeric_unit
    FROM lit.premise_score s JOIN lit.premise p ON p.id=s.premise_id
    WHERE s.graded>0 ORDER BY s.activation_score DESC LIMIT 8`);
  await q("residual stats", `SELECT count(*)::int n, count(DISTINCT premise_id)::int premises,
      round(avg(abs(residual))::numeric,5) mae,
      count(*) FILTER (WHERE outcome_correct)::int correct,
      count(DISTINCT game_id)::int games FROM lit.residual`);
  await q("activation distribution", `SELECT round(activation_score::numeric,6) score, count(*)::int n
    FROM lit.activation GROUP BY 1 ORDER BY 1 DESC LIMIT 8`);
  await q("events", `SELECT count(*)::int events, count(DISTINCT signal_key)::int signals,
      round(avg(latency_ms)::numeric,2) avg_ms,
      count(*) FILTER (WHERE used_hnsw)::int hnsw FROM lit.retrieval_event`);
  await q("signal families hit", `SELECT split_part(signal_key,'.',1) fam, count(*)::int events,
      round(avg(hit_count)::numeric,2) avg_hits FROM lit.retrieval_event GROUP BY 1 ORDER BY 2 DESC`);
  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
