#!/usr/bin/env node
/* Are the DARK evaluators' inputs ALREADY in the database?
   If yes, the fix is a 5-line env->DB adapter per evaluator, not a new producer. */
const { Client } = require("pg");
const { execSync } = require("child_process");
const fs = require("fs");

const url = execSync(
  "neonctl connection-string --project-id summer-brook-99380762 --role-name hermes_ro",
  { encoding: "utf8" }
).trim().replace(/"/g, "");

const census = JSON.parse(fs.readFileSync("reconciliation/dark_sources_census.json", "utf8"));

(async () => {
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();

  console.log("=== signals table: all 32 keys with row counts ===");
  const sig = await db.query(
    `SELECT key, count(*)::int n, count(DISTINCT "entityId")::int entities
       FROM signals GROUP BY 1 ORDER BY 2 DESC`
  );
  for (const r of sig.rows) console.log(`   ${String(r.n).padStart(7)}  ${r.entities} entities  ${r.key}`);

  console.log("\n=== games table: do rest/travel/rivalry inputs exist? ===");
  const g = await db.query(
    `SELECT count(*)::int games,
            count(*) FILTER (WHERE "restDaysHome" IS NOT NULL)::int rest_home,
            count(*) FILTER (WHERE "restDaysAway" IS NOT NULL)::int rest_away,
            count(*) FILTER (WHERE "isBackToBackHome" IS NOT NULL)::int b2b_home,
            count(*) FILTER (WHERE "homeTeamName" IS NOT NULL)::int names
       FROM games`
  );
  console.log("   ", JSON.stringify(g.rows[0]));

  console.log("\n=== supporting tables for the declared dataDependencies ===");
  for (const t of ["player_game_stats", "players", "injuries", "team_game_logs",
                   "team_game_efficiency", "snap_counts", "next_gen_stats", "historical_games",
                   "pfr_adv_stats", "depth_chart_entries", "player_rush_profiles", "entities"]) {
    try {
      const r = await db.query(`SELECT count(*)::int n FROM "${t}"`);
      console.log(`   ${String(r.rows[0].n).padStart(8)}  ${t}`);
    } catch (e) {
      console.log(`   MISSING   ${t}`);
    }
  }

  console.log("\n=== which DARK env keys have a DB-backed equivalent already computed? ===");
  // Map each DARK evaluator to the signals-table key that would supply it.
  const supply = {
    nfl_short_week_road_deficit: ["game.rest_days", "schedule_density_7d_home", "schedule_density_7d_away"],
    nfl_age_conditioned_rest: ["player.age", "roster.age"],
    nfl_turnover_luck: ["ngs.avg_separation"],
    nfl_qb_receiver_continuity: ["pgs.target_share"],
    nfl_backup_qb_target_distribution: ["pgs.target_share"],
    nfl_wr1_vacated_target_efficiency: ["pgs.target_share"],
    nfl_qb_twp_regression: ["pgs.passing_epa"],
    nfl_high_altitude_fatigue: ["weather.altitude"],
    nfl_turf_surface_fatigue: ["venue.turf"],
  };
  for (const e of census.evaluators) {
    const keys = supply[e.signal_id];
    if (!keys) continue;
    const found = [];
    for (const k of keys) {
      const base = k.split(".")[0];
      const r = await db.query(
        `SELECT key, count(*)::int n FROM signals WHERE key ILIKE $1 LIMIT 3`, [`${base}%`]
      );
      if (r.rows.length) found.push(`${k} -> ${r.rows.map((x) => x.key).join(",")} (${r.rows[0].n} rows)`);
    }
    console.log(`   ${e.signal_id.padEnd(38)} ${found.length ? found.join(" | ") : "NO signals-table equivalent"}`);
  }

  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
