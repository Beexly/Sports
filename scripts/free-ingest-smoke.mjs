#!/usr/bin/env node
/**
 * Live smoke for the free-first ingestion path. Proves the FREE sources actually
 * return data — no key, no spend. Run on demand:
 *
 *   npx tsx scripts/free-ingest-smoke.mjs
 *
 * Hits ESPN public scoreboard (all 7 sports) + Open-Meteo, then proves cross-source
 * NCAA confirmation (ESPN + henrygd). Read-only, facts only.
 */

import {
  fetchScoresFreeFirst,
} from "../apps/web/lib/data-sources/free-first-ingest.ts";
import { fetchWeatherFreeFirst } from "../apps/web/lib/data-sources/free-first-ingest.ts";
import { fetchEspnRankings } from "../apps/web/lib/data-sources/free-adapters/espn-rankings.ts";
import { fetchEspnStandings } from "../apps/web/lib/data-sources/free-adapters/espn-standings.ts";
import { fetchEspnScoreboard } from "../apps/web/lib/data-sources/free-adapters/espn-scores.ts";
import { fetchHenrygdScoreboard } from "../apps/web/lib/data-sources/free-adapters/henrygd-ncaa.ts";
import {
  crossCheckNcaaScores,
  toComparableFromEspn,
  toComparableFromHenrygd,
} from "../apps/web/lib/data-sources/ncaa-consensus.ts";

const SPORTS = ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"];

let ok = 0;
let fail = 0;

for (const sport of SPORTS) {
  try {
    const out = await fetchScoresFreeFirst(sport, { timeoutMs: 15000 });
    const n = out.data?.length ?? 0;
    console.log(`scores  ${sport.padEnd(6)} via ${out.usedSourceId} → ${n} games (free=${out.usedFree}, spend=${out.mustSpend})`);
    ok += 1;
  } catch (err) {
    console.error(`scores  ${sport.padEnd(6)} FAILED: ${err instanceof Error ? err.message : err}`);
    fail += 1;
  }
}

try {
  const polls = await fetchEspnRankings("ncaaf", { timeoutMs: 15000 });
  const ap = polls.find((p) => p.pollType === "ap") ?? polls[0];
  console.log(`rankings ncaaf via espn-public-api → ${polls.length} polls (${ap?.pollName}: #1 ${ap?.teams[0]?.team ?? "?"})`);
  ok += 1;
} catch (err) {
  console.error(`rankings FAILED: ${err instanceof Error ? err.message : err}`);
  fail += 1;
}

try {
  const s = await fetchEspnStandings("nfl", { timeoutMs: 15000 });
  console.log(`standings nfl  via espn-public-api → ${s.teams.length} teams (top ${s.teams[0]?.team ?? "?"} ${s.teams[0]?.wins ?? "?"}-${s.teams[0]?.losses ?? "?"})`);
  ok += 1;
} catch (err) {
  console.error(`standings FAILED: ${err instanceof Error ? err.message : err}`);
  fail += 1;
}

try {
  // Arrowhead Stadium, Kansas City.
  const w = await fetchWeatherFreeFirst(39.0489, -94.4839, undefined, { timeoutMs: 15000, forecastDays: 1 });
  const h0 = w.data?.result.hourly[0];
  console.log(`weather KC     via ${w.usedSourceId} → ${w.data?.result.hourly.length ?? 0} hrs (sample temp ${h0?.temperatureC ?? "?"}C, wind ${h0?.windSpeedKmh ?? "?"}km/h)`);
  ok += 1;
} catch (err) {
  console.error(`weather FAILED: ${err instanceof Error ? err.message : err}`);
  fail += 1;
}

// Cross-source NCAA confirmation: two independent FREE sources agreeing on a final.
// Slates are aligned dynamically — henrygd's latest completed slate drives the ESPN date —
// so this proves real agreement in any season (no paid call).
try {
  const henry = (await fetchHenrygdScoreboard("football/fbs", { timeoutMs: 15000 })).map(toComparableFromHenrygd);
  const completed = henry.filter((g) => g.completed && g.date);
  if (completed.length === 0) {
    console.log("consensus ncaaf → henrygd returned no completed games (offseason); skipped");
  } else {
    // Most common completed date in henrygd's slate.
    const counts = {};
    for (const g of completed) counts[g.date] = (counts[g.date] ?? 0) + 1;
    const modalDate = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const espn = (await fetchEspnScoreboard("ncaaf", { dates: modalDate.replaceAll("-", ""), timeoutMs: 15000 }))
      .map(toComparableFromEspn)
      .filter(Boolean);
    const report = crossCheckNcaaScores(espn, henry);
    console.log(
      `consensus ncaaf ${modalDate} → confirmed ${report.summary.confirmed}, ` +
        `conflicts ${report.summary.conflicts}, pending ${report.summary.pending} ` +
        `(ESPN ${espn.length} vs henrygd ${henry.length})`,
    );
    for (const a of report.agreements.slice(0, 2)) {
      console.log(`  ✓ CONFIRMED ${a.matchup} ${a.a.away}-${a.a.home} (ESPN + henrygd agree)`);
    }
  }
  ok += 1;
} catch (err) {
  console.error(`consensus FAILED: ${err instanceof Error ? err.message : err}`);
  fail += 1;
}

console.log(`\nfree-ingest smoke: ${ok} ok, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
