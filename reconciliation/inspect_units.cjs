#!/usr/bin/env node
/* Why are no premises gradeable? Inspect the numeric claims on activated premises. */
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
  await show("numeric_unit on ACTIVATED premises", `
    SELECT coalesce(p.numeric_unit,'(null)') AS unit, count(*)::int n,
           count(*) FILTER (WHERE p.numeric_value BETWEEN 0 AND 1)::int in_range,
           count(*) FILTER (WHERE p.influence_direction IS NOT NULL)::int has_dir
      FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
     WHERE a.game_id IS NOT NULL
     GROUP BY 1 ORDER BY 2 DESC LIMIT 12`);
  await show("numeric_unit across the WHOLE premise table", `
    SELECT coalesce(numeric_unit,'(null)') AS unit, count(*)::int n,
           count(*) FILTER (WHERE numeric_value BETWEEN 0 AND 1)::int in_range
      FROM lit.premise GROUP BY 1 ORDER BY 2 DESC LIMIT 15`);
  await show("activated premises with a probability-shaped claim", `
    SELECT p.premise_key, p.numeric_value, p.numeric_unit, p.influence_direction,
           count(*)::int acts
      FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
     WHERE a.game_id IS NOT NULL
       AND p.numeric_value BETWEEN 0 AND 1
       AND (p.numeric_unit IS NULL OR lower(p.numeric_unit) IN ('','probability','prob','p','fraction','share','rate'))
     GROUP BY 1,2,3,4 ORDER BY acts DESC LIMIT 12`);
  await show("numeric_value distribution on activated premises", `
    SELECT count(*)::int total,
           count(*) FILTER (WHERE numeric_value IS NULL)::int null_val,
           count(*) FILTER (WHERE numeric_value > 1)::int gt_one,
           count(*) FILTER (WHERE numeric_value BETWEEN 0 AND 1)::int in_range,
           min(numeric_value)::numeric min_v, max(numeric_value)::numeric max_v
      FROM lit.premise p JOIN lit.activation a ON a.premise_id = p.id
     WHERE a.game_id IS NOT NULL`);
  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
