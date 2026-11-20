// Fixture-based unit tests for the leak-safe weather loader. No network: the
// injected fetchJson returns synthetic Open-Meteo responses shaped exactly like
// the documented API. Verifies the LOGIC (leak gate, dome, path selection,
// kickoff-hour extraction, candidate signals). Live API smoke-test is the
// build session's step (see INTEGRATION_SPEC.md).
import test from "node:test";
import assert from "node:assert/strict";
import { getAsOfGameWeather, buildForecastUrl, buildHistoricalForecastUrl, __internals } from "./dist/index.js";

const LAMBEAU = { name: "Lambeau Field", latitude: 44.5013, longitude: -88.0622, isIndoor: false };
const DOME = { name: "Ford Field", latitude: 42.34, longitude: -83.045, isIndoor: true };

// A documented-shape Open-Meteo response with a windy, rainy kickoff hour.
function omResponse(hourBucket, { temp = 34, precip = 0.15, precipProb = 80, wind = 22, gust = 38, dir = 300 } = {}) {
  // three hours: kickoff-1, kickoff, kickoff+1
  const [d, hh] = hourBucket.split("T");
  const hour = Number(hh.slice(0, 2));
  const t = (h) => `${d}T${String(h).padStart(2, "0")}:00`;
  return {
    latitude: 44.5, longitude: -88.06, timezone: "GMT",
    hourly_units: { temperature_2m: "°F", precipitation: "inch", precipitation_probability: "%", wind_speed_10m: "mp/h", wind_gusts_10m: "mp/h", wind_direction_10m: "°" },
    hourly: {
      time: [t(hour - 1), t(hour), t(hour + 1)],
      temperature_2m: [temp + 1, temp, temp - 1],
      precipitation: [0, precip, precip],
      precipitation_probability: [70, precipProb, 85],
      wind_speed_10m: [wind - 2, wind, wind + 1],
      wind_gusts_10m: [gust - 3, gust, gust + 2],
      wind_direction_10m: [dir, dir, dir],
    },
  };
}

const KICK = "2026-01-11T18:00:00Z";
const HOUR = "2026-01-11T18:00";

test("indoor site short-circuits to neutral, no network", async () => {
  let called = false;
  const r = await getAsOfGameWeather(
    { site: DOME, kickoffUtc: KICK, asOfUtc: "2026-01-11T12:00:00Z" },
    { fetchJson: async () => { called = true; return {}; }, now: () => new Date("2026-01-05T00:00:00Z") },
  );
  assert.equal(called, false, "must not hit the network for a dome");
  assert.equal(r.source, "indoor-neutral");
  assert.equal(r.indoor, true);
  assert.equal(r.windMph, 0);
  assert.equal(r.candidateSignals.passingSuppressionIndex, 0);
});

test("live/upcoming game uses the forecast API and extracts the kickoff hour", async () => {
  let url = "";
  const r = await getAsOfGameWeather(
    { site: LAMBEAU, kickoffUtc: KICK, asOfUtc: "2026-01-08T00:00:00Z" },
    { fetchJson: async (u) => { url = u; return omResponse(HOUR); }, now: () => new Date("2026-01-07T00:00:00Z") /* before kickoff */ },
  );
  assert.ok(url.startsWith("https://api.open-meteo.com/v1/forecast"), "live path must use the forecast host");
  assert.equal(r.source, "forecast");
  assert.equal(r.available, true);
  assert.equal(r.forecastValidHourUtc, HOUR);
  assert.equal(r.windMph, 22);
  assert.equal(r.windGustMph, 38);
  assert.equal(r.precipInch, 0.15);
  assert.equal(r.tempF, 34);
  assert.equal(r.provenance.leadTimeHours, 90);
  assert.ok(r.candidateSignals.passingSuppressionIndex > 0);
});

test("backtest (kickoff in the past) uses the historical-forecast API + carries the leak contract", async () => {
  let url = "";
  const r = await getAsOfGameWeather(
    { site: LAMBEAU, kickoffUtc: KICK, asOfUtc: "2026-01-08T00:00:00Z" },
    { fetchJson: async (u) => { url = u; return omResponse(HOUR); }, now: () => new Date("2026-02-01T00:00:00Z") /* after kickoff => backtest */ },
  );
  assert.ok(url.startsWith("https://historical-forecast-api.open-meteo.com/v1/forecast"), "backtest must use historical-forecast host");
  assert.equal(r.source, "historical-forecast");
  assert.match(r.provenance.note, /LEAK CONTRACT/);
  assert.match(r.provenance.note, /issued <= asOfUtc/);
});

test("leak guard: asOf after kickoff throws", async () => {
  await assert.rejects(
    () => getAsOfGameWeather({ site: LAMBEAU, kickoffUtc: KICK, asOfUtc: "2026-01-12T00:00:00Z" }, { fetchJson: async () => ({}) }),
    /Leak guard/,
  );
});

test("missing kickoff-hour row -> honest unavailable, not a zero", async () => {
  const r = await getAsOfGameWeather(
    { site: LAMBEAU, kickoffUtc: KICK, asOfUtc: "2026-01-08T00:00:00Z" },
    { fetchJson: async () => omResponse("2020-01-01T00:00"), now: () => new Date("2026-01-07T00:00:00Z") },
  );
  assert.equal(r.available, false);
  assert.equal(r.source, "unavailable");
  assert.equal(r.windMph, null, "no fabricated zero when data is missing");
});

test("upstream fetch failure -> honest unavailable", async () => {
  const r = await getAsOfGameWeather(
    { site: LAMBEAU, kickoffUtc: KICK, asOfUtc: "2026-01-08T00:00:00Z" },
    { fetchJson: async () => { throw new Error("ECONNRESET"); }, now: () => new Date("2026-01-07T00:00:00Z") },
  );
  assert.equal(r.available, false);
  assert.match(r.provenance.note, /honest unavailable/);
});

test("candidate signals are monotone in wind", () => {
  const calm = __internals.candidateSignals({ windMph: 3, windGustMph: 6, precipInch: 0 });
  const gale = __internals.candidateSignals({ windMph: 28, windGustMph: 45, precipInch: 0.2 });
  assert.ok(gale.passingSuppressionIndex > calm.passingSuppressionIndex);
  assert.ok(gale.kickingDifficultyIndex > calm.kickingDifficultyIndex);
  assert.ok(gale.passingSuppressionIndex <= 1 && calm.passingSuppressionIndex >= 0);
});

test("URL builders carry the required imperial + hourly params", () => {
  const f = buildForecastUrl(LAMBEAU);
  assert.match(f, /wind_speed_unit=mph/);
  assert.match(f, /temperature_unit=fahrenheit/);
  assert.match(f, /wind_gusts_10m/);
  const h = buildHistoricalForecastUrl(LAMBEAU, new Date(KICK));
  assert.match(h, /start_date=2026-01-10/);
  assert.match(h, /end_date=2026-01-12/);
});
