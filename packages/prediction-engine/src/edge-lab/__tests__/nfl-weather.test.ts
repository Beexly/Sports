/**
 * Weather features must be leak-free: a game may only ever see a forecast that
 * was issued BEFORE its decision cutoff, and the as-of store's audit must show
 * zero lookahead across everything served. The critical test is that a forecast
 * issued too late is dropped, not silently used.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import {
  buildWeatherFeatureRows,
  totalSuppressionIndex,
  WEATHER_FEATURE_KEYS,
  type GameWeatherForecast,
} from "../features/nfl-weather.js";

const T0 = Date.parse("2021-12-12T18:00:00.000Z");
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function game(id: string, hs: number | null, as: number | null, startMs: number): GameRow {
  return {
    sport: "nfl",
    gameId: id,
    season: 2021,
    week: 14,
    startTime: iso(startMs),
    homeTeam: "GB",
    awayTeam: "CHI",
    homeScore: hs,
    awayScore: as,
    closing: { spreadHome: -3, total: 44, moneylineHomeDecimal: 1.8, moneylineAwayDecimal: 2.1 },
  };
}

/** A forecast issued `hoursBefore` kickoff. */
function forecast(startMs: number, hoursBefore: number, wx: Partial<GameWeatherForecast> = {}): GameWeatherForecast {
  return {
    forecastIssuedAt: iso(startMs - hoursBefore * HOUR),
    isDome: false,
    windMph: 18,
    precipProbPct: 40,
    tempF: 25,
    ...wx,
  };
}

describe("buildWeatherFeatureRows — leak-free weather features", () => {
  it("emits all five weather features for a valid outdoor game, with no lookahead", () => {
    const g = game("g1", 27, 20, T0);
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildWeatherFeatureRows(
      [g],
      new Map([["g1", forecast(T0, 24)]]), // issued 24h pre-kickoff
      store,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.features.size).toBe(WEATHER_FEATURE_KEYS.length);
    expect(rows[0]!.y).toBe(1); // home won
    expect(skipped.leakyForecast).toBe(0);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("DROPS a forecast issued after the decision cutoff (lookahead guard)", () => {
    const g = game("g1", 27, 20, T0);
    const store = new AsOfFeatureStore();
    // Decision cutoff is T0 - 1h; a forecast issued 30 min pre-kickoff is too late.
    const { rows, skipped } = buildWeatherFeatureRows(
      [g],
      new Map([["g1", forecast(T0, 0.5)]]),
      store,
    );
    expect(rows).toHaveLength(0);
    expect(skipped.leakyForecast).toBe(1);
    // Nothing leaked into the store either.
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("neutralizes a dome game (is_dome=1, suppression=0)", () => {
    const g = game("dome1", 31, 17, T0);
    const store = new AsOfFeatureStore();
    const { rows } = buildWeatherFeatureRows(
      [g],
      new Map([["dome1", forecast(T0, 24, { isDome: true, windMph: null, precipProbPct: null, tempF: null })]]),
      store,
    );
    expect(rows).toHaveLength(1);
    const f = rows[0]!.features;
    expect(f.get("wx:is_dome")).toBe(1);
    expect(f.get("wx:total_suppression")).toBe(0);
    expect(f.get("wx:wind_mph")).toBe(0);
  });

  it("skips an outdoor game with incomplete weather (no fabricated neutral)", () => {
    const g = game("g1", 27, 20, T0);
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildWeatherFeatureRows(
      [g],
      new Map([["g1", forecast(T0, 24, { windMph: null })]]),
      store,
    );
    expect(rows).toHaveLength(0);
    expect(skipped.noWeather).toBe(1);
  });

  it("skips games with no weather entry, no odds, no scores, or a tie", () => {
    const store = new AsOfFeatureStore();
    const noWx = game("nw", 27, 20, T0);
    const noScore = game("ns", null, null, T0 + 100 * HOUR);
    const tie = game("ti", 20, 20, T0 + 200 * HOUR);
    const { rows, skipped } = buildWeatherFeatureRows(
      [noWx, noScore, tie],
      new Map([
        ["ns", forecast(T0 + 100 * HOUR, 24)],
        ["ti", forecast(T0 + 200 * HOUR, 24)],
      ]),
      store,
    );
    expect(rows).toHaveLength(0);
    expect(skipped.noWeather).toBe(1);
    expect(skipped.noScores).toBe(1);
    expect(skipped.tie).toBe(1);
  });
});

describe("totalSuppressionIndex — bounded heuristic prior", () => {
  it("domes are always 0", () => {
    expect(totalSuppressionIndex({ isDome: true, windMph: 40, precipProbPct: 100, tempF: 0 })).toBe(0);
  });
  it("calm, warm, dry ≈ 0; extreme wind/cold/precip ≈ 1; always in [0,1]", () => {
    expect(totalSuppressionIndex({ isDome: false, windMph: 0, precipProbPct: 0, tempF: 72 })).toBe(0);
    const extreme = totalSuppressionIndex({ isDome: false, windMph: 40, precipProbPct: 100, tempF: 0 });
    expect(extreme).toBeGreaterThan(0.9);
    expect(extreme).toBeLessThanOrEqual(1);
    const mid = totalSuppressionIndex({ isDome: false, windMph: 15, precipProbPct: 50, tempF: 35 });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it("wind dominates precip and cold", () => {
    const windy = totalSuppressionIndex({ isDome: false, windMph: 25, precipProbPct: 0, tempF: 60 });
    const wet = totalSuppressionIndex({ isDome: false, windMph: 0, precipProbPct: 100, tempF: 60 });
    expect(windy).toBeGreaterThan(wet);
  });
});
