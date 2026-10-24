#!/usr/bin/env node
/* Why aren't the probability-claim premises being retrieved/graded? */
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
  const show = async (label, sql) => {
    const r = await db.query(sql);
    console.log(`\n--- ${label} ---`);
    console.table(r.rows);
  };
  await show("probability-claim premises", `
    SELECT p.source, count(*)::int n,
           count(*) FILTER (WHERE a.id IS NOT NULL)::int ever_activated,
           min(p.numeric_value)::numeric min_v, max(p.numeric_value)::numeric max_v
      FROM lit.premise p
      LEFT JOIN lit.activation a ON a.premise_id = p.id
     WHERE p.numeric_unit = 'probability'
     GROUP BY 1`);
  await show("sample bridge premise", `
    SELECT premise_key, title, numeric_value, numeric_unit, influence_direction,
           applicable_contexts, domain, pillar_tags
      FROM lit.premise WHERE numeric_unit='probability' LIMIT 3`);
  await show("settled NFL picks available for grading", `
    SELECT count(*)::int settled, count(DISTINCT p."gameId")::int games,
           count(*) FILTER (WHERE p.result IN ('WIN','LOSS'))::int decisive
      FROM picks p JOIN games g ON g.id = p."gameId"
     WHERE g."sportId"='cmpg6t7v900031heri45v3d8s' AND p."settledAt" IS NOT NULL`);
  await show("settled pick sample", `
    SELECT g.id::text gid, g."homeTeamName", g."awayTeamName", p.selection,
           p."pickType", p.result, g."homeScore", g."awayScore"
      FROM picks p JOIN games g ON g.id = p."gameId"
     WHERE g."sportId"='cmpg6t7v900031heri45v3d8s' AND p."settledAt" IS NOT NULL
     ORDER BY g."commenceTime" DESC LIMIT 6`);
  await show("signals: do team signals exist for those games?", `
    SELECT s.key, count(*)::int n, count(DISTINCT s."entityId")::int teams
      FROM signals s WHERE s.season=2026 AND s.week=6 GROUP BY 1 ORDER BY 2 DESC LIMIT 12`);
  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
