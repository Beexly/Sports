#!/usr/bin/env node
/**
 * Live smoke for the free-first ingestion path. Proves the FREE sources actually
 * return data — no key, no spend. Run on demand:
 *
 *   npx tsx scripts/free-ingest-smoke.mjs
 *
 * Hits ESPN public scoreboard (all 7 sports) + Open-Meteo. Read-only, facts only.
 */

import {
  fetchScoresFreeFirst,
} from "../apps/web/lib/data-sources/free-first-ingest.ts";
import { fetchWeatherFreeFirst } from "../apps/web/lib/data-sources/free-first-ingest.ts";

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
  // Arrowhead Stadium, Kansas City.
  const w = await fetchWeatherFreeFirst(39.0489, -94.4839, undefined, { timeoutMs: 15000, forecastDays: 1 });
  const h0 = w.data?.result.hourly[0];
  console.log(`weather KC     via ${w.usedSourceId} → ${w.data?.result.hourly.length ?? 0} hrs (sample temp ${h0?.temperatureC ?? "?"}C, wind ${h0?.windSpeedKmh ?? "?"}km/h)`);
  ok += 1;
} catch (err) {
  console.error(`weather FAILED: ${err instanceof Error ? err.message : err}`);
  fail += 1;
}

console.log(`\nfree-ingest smoke: ${ok} ok, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
