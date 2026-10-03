#!/usr/bin/env node
/**
 * fit-signal-scales.mjs — reproduce the committed signal scale table.
 *
 * READ-ONLY. Every statement is a SELECT, the client refuses anything else, and
 * the script has no write path at all unless `--write` is passed, in which case
 * it rewrites exactly one committed file and prints the before/after.
 *
 * WHAT IT MEASURES, and why each half is the way it is:
 *
 *  1. SCALE (anchor + spread) per key, by Welford over that key's own
 *     population. The raw `value` column is the source of truth here because
 *     that is what the writer reads. `injury.availability` is EXCLUDED and
 *     declared instead: its reading is a three-valued ordinal, so a fitted
 *     spread over it measures nothing. (The script still reports the measured
 *     figure so a reader can see the declared value is not arbitrary.)
 *
 *  2. WEIGHT per key, by WITHIN-player correlation against a settled outcome.
 *     The outcome is next-week `player_game_stats.fantasyPointsPpr` above the
 *     population median. Team win/loss was the preferred outcome and is NOT
 *     available: `player_game_stats.team` joins 0 of 32 distinct strings to
 *     `games.homeTeamName`/`awayTeamName`, and `games` carries no season or week
 *     column, so there is no join path to a score.
 *
 *     Within-player matters and is not a stylistic choice. Measured on the same
 *     data, the between-player correlation for `pgs.fantasy_ppr` is 0.373 and
 *     the within-player is 0.094; for `pgs.target_share` in 2024 alone it is
 *     0.314 vs 0.0046. The gap is player identity, not forecast, and a weight
 *     fitted on the between-player number would advertise predictive power the
 *     data does not contain.
 *
 *  3. EVIDENCE is counted in DISTINCT FIXTURES (season x week), never rows,
 *     matching the fixture-not-row law in tune-signal-weights-grouped.ts.
 *
 * USAGE
 *   node apps/web/scripts/fit-signal-scales.mjs           # print + diff vs committed
 *   node apps/web/scripts/fit-signal-scales.mjs --write   # rewrite the committed file
 *
 * Requires DATABASE_URL. Writes nothing to any database.
 */
import pg from "file:///C:/Users/Garrett/Sports/node_modules/pg/lib/index.js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const TABLE_FILE = join(HERE, "../../../packages/prediction-engine/src/signal-scale-table.ts");

/** The keys the writer emits. A census driven by a key nothing emits is a lie. */
const KEYS = [
  "pgs.target_share",
  "pgs.fantasy_ppr",
  "pgs.passing_epa",
  "pgs.rushing_epa",
  "pgs.receiving_epa",
  "snap.offense_pct",
  "snap.st_pct",
  "snap.defense_pct",
  "ngs.cpoe",
  "ngs.avg_separation",
  "ngs.yac_above_expectation",
  "ngs.air_yards_to_sticks",
  "injury.availability",
];

/** Injury's scale is DECLARED, not fitted — see the note above. */
const DECLARED_SCALES = { "injury.availability": { anchor: 0, spread: 0.5 } };

const MIN_FIXTURES = 100;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set; nothing was measured.");
  process.exit(2);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 480_000,
  query_timeout: 500_000,
});

/** Refuse anything that is not a single SELECT. */
const onlySelect = /^(\s*)(SELECT|WITH)\b/i;
async function q(label, sql) {
  if (!onlySelect.test(sql)) throw new Error(`refusing non-SELECT: ${label}`);
  const res = await client.query(sql);
  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify(res.rows, null, 2));
  return res.rows;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

await client.connect();
try {
  // A. Provenance. If this changes, the committed table is stale and the refit
  //    is reporting a different population than the one it claims to describe.
  await q("A. population under fit", `
    WITH injury_fixed AS (
      SELECT CASE
        WHEN coalesce("practiceStatus",'') ILIKE '%DID NOT PARTICIPATE%' THEN -1
        WHEN coalesce("reportStatus",'') ILIKE '%OUT%' THEN -1
        WHEN coalesce("reportStatus",'') ILIKE '%DOUBTFUL%'
          OR coalesce("reportStatus",'') ILIKE '%QUESTIONABLE%' THEN 0
        WHEN coalesce("practiceStatus",'') ILIKE '%FULL%' THEN 1
        WHEN coalesce("practiceStatus",'') ILIKE '%LIMITED%' THEN 1
        ELSE NULL END AS v
      FROM injuries
    ),
    persisted AS (
      SELECT key, value, "capturedAt" FROM signals WHERE value IS NOT NULL
    )
    SELECT (SELECT count(*) FROM persisted)::int AS persisted_rows,
           (SELECT count(DISTINCT key) FROM persisted)::int AS persisted_keys,
           (SELECT min("capturedAt") FROM persisted) AS first_captured,
           (SELECT max("capturedAt") FROM persisted) AS last_captured,
           (SELECT count(*) FROM player_game_stats WHERE season BETWEEN 2020 AND 2025)::int AS pgs_rows,
           (SELECT count(*) FROM snap_counts)::int AS snap_rows,
           (SELECT count(*) FROM next_gen_stats)::int AS ngs_rows,
           (SELECT count(*) FROM injuries)::int AS injury_rows,
           (SELECT count(*) FROM injury_fixed WHERE v IS NOT NULL)::int AS injury_encodable`);

  // B. Per-key scale on the populations the writer actually reads.
  const scales = await q("B. anchors and spreads", `
    WITH injury_fixed AS (
      SELECT CASE
        WHEN coalesce("practiceStatus",'') ILIKE '%DID NOT PARTICIPATE%' THEN -1
        WHEN coalesce("reportStatus",'') ILIKE '%OUT%' THEN -1
        WHEN coalesce("reportStatus",'') ILIKE '%DOUBTFUL%'
          OR coalesce("reportStatus",'') ILIKE '%QUESTIONABLE%' THEN 0
        WHEN coalesce("practiceStatus",'') ILIKE '%FULL%' THEN 1
        WHEN coalesce("practiceStatus",'') ILIKE '%LIMITED%' THEN 1
        ELSE NULL END AS v
      FROM injuries
    ),
    allrows AS (
      SELECT 'pgs.target_share' AS key, "targetShare" AS value FROM player_game_stats
      UNION ALL SELECT 'pgs.fantasy_ppr', "fantasyPointsPpr" FROM player_game_stats
      UNION ALL SELECT 'pgs.passing_epa', "passingEpa" FROM player_game_stats
      UNION ALL SELECT 'pgs.rushing_epa', "rushingEpa" FROM player_game_stats
      UNION ALL SELECT 'pgs.receiving_epa', "receivingEpa" FROM player_game_stats
      UNION ALL SELECT 'snap.offense_pct', "offensePct" FROM snap_counts
      UNION ALL SELECT 'snap.st_pct', "stPct" FROM snap_counts
      UNION ALL SELECT 'snap.defense_pct', "defensePct" FROM snap_counts
      UNION ALL SELECT 'ngs.cpoe', cpoe FROM next_gen_stats
      UNION ALL SELECT 'ngs.avg_separation', "avgSeparation" FROM next_gen_stats
      UNION ALL SELECT 'ngs.yac_above_expectation', "avgYacAboveExpectation" FROM next_gen_stats
      UNION ALL SELECT 'ngs.air_yards_to_sticks', "avgAirYardsToSticks" FROM next_gen_stats
      UNION ALL SELECT 'injury.availability', v FROM injury_fixed
    )
    SELECT key, count(*)::int AS n,
           round(avg(value)::numeric, 6) AS anchor,
           round(stddev_pop(value)::numeric, 6) AS spread
    FROM allrows WHERE value IS NOT NULL GROUP BY key ORDER BY key`);

  // C. The outcome's own balance. A 95/5 target makes every correlation look
  //    large; this is here so a refit cannot quietly inherit that.
  await q("C. outcome balance", `
    SELECT count(*)::int AS n,
           round(avg(("fantasyPointsPpr" > (
             SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "fantasyPointsPpr")
             FROM player_game_stats WHERE "fantasyPointsPpr" IS NOT NULL
           ))::int)::numeric, 6) AS base_rate,
           round((
             SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "fantasyPointsPpr")
             FROM player_game_stats WHERE "fantasyPointsPpr" IS NOT NULL
           )::numeric, 4) AS median
    FROM player_game_stats WHERE "fantasyPointsPpr" IS NOT NULL`);

  // D. The fit: within-player (residual) correlation, evidence in fixtures.
  const fits = await q("D. within-player fit vs next-week PPR", `
    WITH injury_fixed AS (
      SELECT coalesce("playerId","gsisId") AS eid, season, week,
        CASE
          WHEN coalesce("practiceStatus",'') ILIKE '%DID NOT PARTICIPATE%' THEN -1
          WHEN coalesce("reportStatus",'') ILIKE '%OUT%' THEN -1
          WHEN coalesce("reportStatus",'') ILIKE '%DOUBTFUL%'
            OR coalesce("reportStatus",'') ILIKE '%QUESTIONABLE%' THEN 0
          WHEN coalesce("practiceStatus",'') ILIKE '%LIMITED%' THEN 1
          WHEN coalesce("practiceStatus",'') ILIKE '%FULL%' THEN 1
          ELSE NULL END AS v
      FROM injuries
    ),
    cur AS (
      SELECT "entityId" AS eid, season, week, key, value
      FROM signals WHERE season BETWEEN 2020 AND 2025 AND value IS NOT NULL
      UNION ALL
      SELECT eid, season, week, 'injury.availability', v FROM injury_fixed WHERE v IS NOT NULL
    ),
    nxt AS (
      SELECT "playerId" AS pid, season, week, "fantasyPointsPpr" AS f
      FROM player_game_stats WHERE "fantasyPointsPpr" IS NOT NULL
    ),
    med AS (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY f) AS m FROM nxt),
    lab AS (
      SELECT cur.key, cur.eid, cur.value, (nxt.f > med.m)::int AS outcome,
             (cur.season::text || 'w' || cur.week::text) AS fix
      FROM cur JOIN nxt
        ON nxt.pid = cur.eid AND nxt.season = cur.season AND nxt.week = cur.week + 1
      CROSS JOIN med
    ),
    dm AS (
      SELECT key, eid, fix, value, outcome,
             value   - avg(value)   OVER (PARTITION BY key, eid) AS dv,
             outcome - avg(outcome) OVER (PARTITION BY key, eid) AS dy
      FROM lab
    )
    SELECT key, count(*)::int AS rows, count(DISTINCT fix)::int AS fixtures,
           count(DISTINCT eid)::int AS players,
           round(corr(value, outcome::float8)::numeric, 6) AS between_r,
           round(corr(dv, dy::float8)::numeric, 6) AS within_r
    FROM dm GROUP BY key ORDER BY key`);

  // E. Assembled table, in the same shape the committed file carries.
  const scaleByKey = new Map(scales.map((r) => [r.key, r]));
  const fitByKey = new Map(fits.map((r) => [r.key, r]));
  const rows = KEYS.map((key) => {
    const s = scaleByKey.get(key);
    const f = fitByKey.get(key);
    const declared = DECLARED_SCALES[key];
    const within = f ? Number(f.within_r) : 0;
    const between = f ? Number(f.between_r) : 0;
    const fixtures = f ? Number(f.fixtures) : 0;

    let verdict;
    let reason;
    let weight = 0;
    if (!s) {
      verdict = "no-readings";
      reason = "no usable readings in the source population";
    } else if (!f) {
      verdict = "unjoinable-outcome";
      reason = "no settled outcome joins this key, so no weight can be fitted (0, not a guess)";
    } else if (fixtures < MIN_FIXTURES) {
      verdict = "insufficient-fixtures";
      reason = `${fixtures} independent fixtures, below the floor of ${MIN_FIXTURES}; the correlation is not separable from noise`;
    } else {
      verdict = "earned";
      weight = clamp(within * Math.sqrt(fixtures / MIN_FIXTURES), -1, 1);
      reason = `within-player r=${within.toFixed(4)} over ${fixtures} fixtures`;
    }

    return {
      key,
      anchor: declared ? declared.anchor : Number(s.anchor),
      spread: declared ? declared.spread : Number(s.spread),
      n: Number(s?.n ?? 0),
      weight: Number(weight.toFixed(6)),
      withinCorrelation: within,
      betweenCorrelation: between,
      fixtures,
      entities: f ? Number(f.players) : 0,
      verdict,
      reason,
    };
  });

  console.log("\n===== E. assembled table =====");
  console.log(JSON.stringify(rows, null, 2));

  const earned = rows.filter((r) => r.verdict === "earned").sort((a, b) => b.weight - a.weight);
  console.log(`\n${earned.length} key(s) earned weight:`);
  for (const r of earned) {
    console.log(`  ${r.key.padEnd(30)} ${r.weight.toFixed(6)}  (within ${r.withinCorrelation})`);
  }
  console.log(`${rows.length - earned.length} key(s) at weight 0.`);

  // F. Diff against the committed file, unless asked to write.
  if (process.argv.includes("--write")) {
    const body = rows
      .map(
        (r) => `  {
    key: ${JSON.stringify(r.key)},
    anchor: ${r.anchor},
    spread: ${r.spread},
    n: ${r.n},
    weight: ${r.weight},
    withinCorrelation: ${r.withinCorrelation},
    betweenCorrelation: ${r.betweenCorrelation},
    fixtures: ${r.fixtures},
    entities: ${r.entities},
    verdict: ${JSON.stringify(r.verdict)},
    reason: ${JSON.stringify(r.reason)},
  },`,
      )
      .join("\n");
    const current = readFileSync(TABLE_FILE, "utf8");
    const start = current.indexOf("export const SIGNAL_SCALES");
    const open = current.indexOf("[", start);
    const close = current.indexOf("] as const satisfies", start);
    if (start < 0 || open < 0 || close < 0) {
      throw new Error("could not locate SIGNAL_SCALES in the committed file; refusing to write");
    }
    const next = current.slice(0, open) + "[\n" + body + "\n" + current.slice(close);
    if (next === current) {
      console.log("\nno change: the committed table already matches this fit.");
    } else {
      writeFileSync(TABLE_FILE, next, "utf8");
      console.log(`\nwrote ${TABLE_FILE}`);
      console.log("REVIEW THE DIFF — a refit that moves a weight is a claim change, not a chore.");
    }
  } else {
    console.log(
      "\n(dry run: nothing written. Re-run with --write to update the committed table.)",
    );
  }
} finally {
  await client.end();
}
