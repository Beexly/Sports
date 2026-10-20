#!/usr/bin/env node
/* Measure temporal resolution available for temporal causal discovery. */
const { Client } = require("pg");
const { execSync } = require("child_process");

const url = execSync(
  "neonctl connection-string --project-id summer-brook-99380762 --role-name hermes_ro",
  { encoding: "utf8" }
).trim().replace(/"/g, "");

(async () => {
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const q = async (label, sql) => {
    const r = await db.query(sql);
    console.log(`\n--- ${label} ---`);
    console.log(JSON.stringify(r.rows));
  };
  await q("signals: rows per key, distinct capture days", `
    SELECT key, count(*)::int rows, count(DISTINCT "capturedAt"::date)::int days
      FROM signals GROUP BY 1 ORDER BY rows DESC LIMIT 6`);
  await q("signals temporal span", `
    SELECT count(*)::int total, count(DISTINCT key)::int keys,
           min("capturedAt")::date oldest, max("capturedAt")::date newest
      FROM signals`);
  await q("game_signals temporal", `
    SELECT count(*)::int n, count(DISTINCT "signalKey")::int keys,
           min("fetchedAt")::date oldest, max("fetchedAt")::date newest
      FROM game_signals`);
  await q("same game_signals key over time (a queryable sequence?)", `
    SELECT "signalKey", count(*)::int n, count(DISTINCT "fetchedAt"::date)::int days
      FROM game_signals GROUP BY 1 ORDER BY n DESC LIMIT 6`);
  await q("odds_line_snapshots (market move resolution)", `
    SELECT count(*)::int n, min("capturedAt")::date oldest, max("capturedAt")::date newest
      FROM odds_line_snapshots`);
  await q("per-snapshot-per-day granularity for odds", `
    SELECT count(DISTINCT "capturedAt"::date)::int days,
           count(DISTINCT "capturedAt")::int distinct_stamps
      FROM odds_line_snapshots`);
  await q("pick_signal_snapshots (mint-time evidence)", `
    SELECT count(*)::int n FROM pick_signal_snapshots`);
  await q("settled picks available for residual work", `
    SELECT count(*)::int settled, count(DISTINCT "gameId")::int games
      FROM picks WHERE "settledAt" IS NOT NULL`);
  await q("signals: does the SAME key repeat for the SAME entity over time?", `
    SELECT count(*)::int entity_keys_with_multiple_captures
      FROM (SELECT "entityId", key FROM signals GROUP BY 1,2 HAVING count(*) > 1) t`);
  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
