#!/usr/bin/env node
/**
 * Live smoke test for W-WEATHER-REC's remaining gate (DEC-014/DEC-023):
 * INTEGRATION_SPEC.md §2 "Strict as-of backtests" — confirm Open-Meteo
 * currently exposes a previous-runs / model-run selection capability, live,
 * so a backtest can request the forecast AS IT STOOD N days before valid
 * time rather than the historical-forecast API's default best-lead stitch
 * (which can leak a forecast issued AFTER a pick's asOfUtc).
 *
 * This does NOT modify packages/prediction-engine/src/edge-lab/loaders/weather-edge.ts
 * (vendored verbatim per DEC-014 — behavioral edits forbidden). It is a
 * read-only, no-key network probe proving the capability exists and behaves
 * as documented, so a future feature-store integration can rely on it.
 *
 * Run on demand: node scripts/weather-integration-smoke.mjs
 *
 * PASS requires, for a real NFL stadium and a real recent hour:
 *   1. HTTP 200 + parseable JSON from previous-runs-api.open-meteo.com.
 *   2. The response carries temperature_2m_previous_day1..3 fields with
 *      non-null numeric values for the target hour.
 *   3. At least one previous_dayN value DIFFERS from the current-run value
 *      for that same hour — proving these are genuinely distinct forecast
 *      runs, not the historical-forecast API's stitched/duplicated output.
 */

const LAMBEAU = { name: "Lambeau Field", latitude: 44.5013, longitude: -88.0622 };
const HOST = "https://previous-runs-api.open-meteo.com/v1/forecast";
const VARS = ["temperature_2m", "temperature_2m_previous_day1", "temperature_2m_previous_day2", "temperature_2m_previous_day3"];

function buildUrl() {
  const p = new URLSearchParams({
    latitude: String(LAMBEAU.latitude),
    longitude: String(LAMBEAU.longitude),
    hourly: VARS.join(","),
    past_days: "5",
    forecast_days: "1",
    temperature_unit: "fahrenheit",
    timezone: "GMT",
  });
  return `${HOST}?${p.toString()}`;
}

function fail(message) {
  console.error(`SMOKE FAIL: ${message}`);
  process.exit(1);
}

const url = buildUrl();
console.log(`GET ${url}`);

let res;
try {
  res = await fetch(url, { signal: AbortSignal.timeout(15000) });
} catch (err) {
  fail(`network error: ${err instanceof Error ? err.message : String(err)}`);
}
if (!res.ok) fail(`HTTP ${res.status}`);

const body = await res.json();
const hourly = body?.hourly;
if (!hourly || !Array.isArray(hourly.time)) fail("no hourly.time array in response");

// A target hour 3 days back — inside the past_days=5 window and old enough
// that day1/day2/day3 previous-run data should all be populated.
const targetIdx = hourly.time.findIndex((t, i) => i >= 24 * 2 && i < 24 * 3); // day index 2 of the window, noon-ish
if (targetIdx < 0) fail("could not locate a target hour in the response window");

const current = hourly.temperature_2m?.[targetIdx];
const day1 = hourly.temperature_2m_previous_day1?.[targetIdx];
const day2 = hourly.temperature_2m_previous_day2?.[targetIdx];
const day3 = hourly.temperature_2m_previous_day3?.[targetIdx];

for (const [label, v] of [["current", current], ["previous_day1", day1], ["previous_day2", day2], ["previous_day3", day3]]) {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${label} missing or non-numeric at hour ${hourly.time[targetIdx]}: ${v}`);
}

const distinctFromCurrent = [day1, day2, day3].some((v) => v !== current);
if (!distinctFromCurrent) {
  fail(
    `previous_dayN values are all identical to the current-run value (${current}) at ${hourly.time[targetIdx]} — ` +
      "this would mean the API is NOT actually returning distinct forecast runs, contradicting the documented capability.",
  );
}

console.log("SMOKE PASS: Open-Meteo's previous-runs-api genuinely serves distinct forecast runs for the same valid hour.");
console.log(`  hour: ${hourly.time[targetIdx]}`);
console.log(`  temperature_2m (current run): ${current}°F`);
console.log(`  temperature_2m_previous_day1: ${day1}°F`);
console.log(`  temperature_2m_previous_day2: ${day2}°F`);
console.log(`  temperature_2m_previous_day3: ${day3}°F`);
console.log("");
console.log("Interpretation: this API is the correct integration target for a leak-safe backtest");
console.log("path — request _previous_dayN where N = ceil(leadTimeHours / 24), never a smaller N,");
console.log("so the selected run is guaranteed issued <= asOfUtc (conservative rounding toward an");
console.log("OLDER run when the exact day boundary doesn't align). The historical-forecast-api the");
console.log("shipped loader currently uses for backtests does NOT offer this selection (confirmed via");
console.log("Open-Meteo's own docs: it stitches multiple runs into one continuous timeseries and does");
console.log("not expose per-hour issuance time) — wiring this into the feature store is a separate,");
console.log("not-yet-scoped follow-on; this script only closes the INTEGRATION_SPEC.md §2 capability");
console.log("confirmation gate, per DEC-014/DEC-023.");
process.exit(0);
