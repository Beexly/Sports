/**
 * Deep pull from live DB: calibration, CLV, signal coverage, game context.
 * Read-only. Uses DATABASE_URL env. Postgres requires quoted camelCase columns.
 */
const { Client } = require("pg");

async function q(client, sql) {
  const r = await client.query(sql);
  return r.rows;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const pickCal = await q(client, `
    SELECT
      COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE result = 'WIN')::int AS wins,
      COUNT(*) FILTER (WHERE result = 'LOSS')::int AS losses,
      COUNT(*) FILTER (WHERE result = 'PUSH')::int AS pushes,
      COUNT(*) FILTER (WHERE result = 'VOID')::int AS voids,
      COUNT(*) FILTER (WHERE "clvValue" IS NOT NULL)::int AS n_clv,
      COUNT(*) FILTER (WHERE "clvPositive" = true)::int AS clv_pos,
      ROUND(AVG("clvValue")::numeric,4) AS avg_clv,
      ROUND(AVG(confidence)::numeric,2) AS avg_conf,
      ROUND(AVG("edgeScore")::numeric,2) AS avg_edge
    FROM picks
    WHERE result IS NOT NULL;
  `);
  console.log("=== PICK CALIBRATION (live) ===");
  console.log(JSON.stringify(pickCal[0], null, 2));

  const byType = await q(client, `
    SELECT "pickType"::text AS pick_type,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses,
           ROUND(AVG(confidence)::numeric,2) AS avg_conf,
           ROUND(AVG("edgeScore")::numeric,2) AS avg_edge,
           ROUND(AVG("clvValue")::numeric,4) AS avg_clv
    FROM picks
    WHERE result IN ('WIN','LOSS')
    GROUP BY 1 ORDER BY n DESC;
  `);
  console.log("\n=== BY PICK TYPE ===");
  console.table(byType);

  const byModel = await q(client, `
    SELECT "modelVersion", COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses,
           ROUND(AVG(confidence)::numeric,2) AS avg_conf
    FROM picks WHERE result IN ('WIN','LOSS')
    GROUP BY 1 ORDER BY n DESC LIMIT 15;
  `);
  console.log("\n=== BY MODEL VERSION ===");
  console.table(byModel);

  const confBins = await q(client, `
    SELECT (confidence/10)*10 AS bin,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           ROUND(100.0*COUNT(*) FILTER (WHERE result='WIN')/NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')),0),2) AS win_pct
    FROM picks WHERE result IN ('WIN','LOSS') AND confidence IS NOT NULL
    GROUP BY 1 ORDER BY 1;
  `);
  console.log("\n=== CONFIDENCE CALIBRATION (live) ===");
  console.table(confBins);

  const sigCov = await q(client, `
    SELECT
      COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE "hadOddsSignal")::int AS odds,
      COUNT(*) FILTER (WHERE "hadLineMovementSignal")::int AS line_move,
      COUNT(*) FILTER (WHERE "hadRestSignal")::int AS rest,
      COUNT(*) FILTER (WHERE "hadScheduleSignal")::int AS schedule,
      COUNT(*) FILTER (WHERE "hadAtsFormSignal")::int AS ats_form,
      COUNT(*) FILTER (WHERE "hadH2HSignal")::int AS h2h,
      COUNT(*) FILTER (WHERE "hadWeatherSignal")::int AS weather,
      COUNT(*) FILTER (WHERE "hadInjurySignal")::int AS injury,
      COUNT(*) FILTER (WHERE "hadRatingsSignal")::int AS ratings,
      COUNT(*) FILTER (WHERE "hadPlayerSignal")::int AS player,
      COUNT(*) FILTER (WHERE "hadNgsSignal")::int AS ngs,
      COUNT(*) FILTER (WHERE "hadPaceSignal")::int AS pace,
      COUNT(*) FILTER (WHERE "hadOfficialsSignal")::int AS officials
    FROM pick_signal_snapshots;
  `);
  console.log("\n=== SIGNAL COVERAGE (pick_signal_snapshots) ===");
  console.log(JSON.stringify(sigCov[0], null, 2));

  const signals = ["hadInjurySignal","hadWeatherSignal","hadLineMovementSignal","hadNgsSignal","hadRestSignal","hadAtsFormSignal"];
  for (const sig of signals) {
    const row = await q(client, `
      SELECT
        ROUND(100.0*COUNT(*) FILTER (WHERE s."${sig}" AND p.result='WIN')/NULLIF(COUNT(*) FILTER (WHERE s."${sig}" AND p.result IN ('WIN','LOSS')),0),2) AS win_pct_present,
        COUNT(*) FILTER (WHERE s."${sig}" AND p.result IN ('WIN','LOSS'))::int AS n_present,
        ROUND(100.0*COUNT(*) FILTER (WHERE NOT s."${sig}" AND p.result='WIN')/NULLIF(COUNT(*) FILTER (WHERE NOT s."${sig}" AND p.result IN ('WIN','LOSS')),0),2) AS win_pct_absent,
        COUNT(*) FILTER (WHERE NOT s."${sig}" AND p.result IN ('WIN','LOSS'))::int AS n_absent
      FROM pick_signal_snapshots s JOIN picks p ON p.id = s."pickId";
    `);
    console.log(`\n-- signal impact ${sig}`);
    console.log(JSON.stringify(row[0]));
  }

  const ctx = await q(client, `
    SELECT
      COUNT(*)::int AS n,
      ROUND(AVG("restDaysHome")::numeric,2) AS avg_rest_home,
      ROUND(AVG("restDaysAway")::numeric,2) AS avg_rest_away,
      ROUND(AVG("lineMovementSpread")::numeric,4) AS avg_line_move_spread,
      ROUND(AVG("dataQualityScore")::numeric,4) AS avg_data_quality,
      COUNT(*) FILTER (WHERE "isBackToBackHome")::int AS b2b_home,
      COUNT(*) FILTER (WHERE "isBackToBackAway")::int AS b2b_away
    FROM games;
  `);
  console.log("\n=== GAME CONTEXT ===");
  console.log(JSON.stringify(ctx[0], null, 2));

  const sigFam = await q(client, `
    SELECT "sourceCategory"::text AS cat, "sourceName", "signalKey",
           COUNT(*)::int AS n,
           ROUND(AVG("trustLevel")::numeric,3) AS avg_trust
    FROM game_signals
    GROUP BY 1,2,3 ORDER BY n DESC LIMIT 40;
  `);
  console.log("\n=== GAME SIGNAL FAMILIES ===");
  console.table(sigFam);

  const proof = await q(client, `
    SELECT
      COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE "marketFairProb" IS NOT NULL)::int AS n_market,
      COUNT(*) FILTER (WHERE "modelProb" IS NOT NULL)::int AS n_model,
      ROUND(AVG("marketFairProb")::numeric,4) AS avg_market,
      ROUND(AVG("modelProb")::numeric,4) AS avg_model,
      ROUND(AVG(confidence)::numeric,2) AS avg_conf
    FROM pick_proof_receipts;
  `);
  console.log("\n=== PROOF RECEIPTS (market vs model) ===");
  console.log(JSON.stringify(proof[0], null, 2));

  const brier = await q(client, `
    WITH joined AS (
      SELECT p.result, r."modelProb", r."marketFairProb"
      FROM pick_proof_receipts r
      JOIN picks p ON p.id = r."pickId"
      WHERE p.result IN ('WIN','LOSS') AND r."modelProb" IS NOT NULL
    )
    SELECT
      COUNT(*)::int AS n,
      ROUND(AVG(POWER("modelProb" - CASE WHEN result='WIN' THEN 1.0 ELSE 0.0 END, 2))::numeric,4) AS brier_model,
      ROUND(AVG(POWER("marketFairProb" - CASE WHEN result='WIN' THEN 1.0 ELSE 0.0 END, 2))::numeric,4) AS brier_market
    FROM joined;
  `);
  console.log("\n=== BRIER (live proof receipts) ===");
  console.log(JSON.stringify(brier[0], null, 2));

  const ngs = await q(client, `
    SELECT "statType", COUNT(*)::int AS n,
           COUNT(DISTINCT "gsisId")::int AS players,
           MIN(season)::int AS min_season, MAX(season)::int AS max_season
    FROM next_gen_stats GROUP BY 1 ORDER BY n DESC;
  `);
  console.log("\n=== NEXT GEN STATS ===");
  console.table(ngs);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
