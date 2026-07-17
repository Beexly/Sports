/**
 * W-WEATHER-REC — the vendored as-of loader + the adapter seam into the
 * edge-lab feature builder. Ports the packet's core test intents (indoor
 * short-circuit, live vs backtest source selection, injected-fetch URLs,
 * candidate signals as hypotheses) and proves the ONE-canonical-path claim
 * end to end: loader → adapter → buildWeatherFeatureRows → EvalRows with the
 * as-of store's audit clean.
 */
import { describe, expect, it, vi } from "vitest";
import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import { buildWeatherFeatureRows } from "../features/nfl-weather.js";
import { toGameWeatherForecast } from "../features/weather-edge-adapter.js";
import {
  buildForecastUrl,
  buildHistoricalForecastUrl,
  getAsOfGameWeather,
  type OpenMeteoResponse,
  type StadiumSite,
} from "../loaders/weather-edge.js";

const LAMBEAU: StadiumSite = { name: "Lambeau Field", latitude: 44.5013, longitude: -88.0622, isIndoor: false };
const DOME: StadiumSite = { name: "Ford Field", latitude: 42.34, longitude: -83.0456, isIndoor: true };

const KICKOFF = "2026-12-13T18:00:00.000Z";
const AS_OF = "2026-12-13T16:00:00.000Z"; // frozen 2h pre-kickoff

function hourly(): OpenMeteoResponse {
  return {
    hourly: {
      time: ["2026-12-13T17:00", "2026-12-13T18:00", "2026-12-13T19:00"],
      "temperature_2m": [20, 22, 21],
      "wind_speed_10m": [15, 18, 16],
      "wind_gusts_10m": [25, 30, 26],
      "wind_direction_10m": [270, 280, 275],
      "precipitation": [0, 0.1, 0],
      "precipitation_probability": [10, 40, 20],
    },
  } as unknown as OpenMeteoResponse;
}

describe("vendored loader (packet parity)", () => {
  it("indoor sites short-circuit to a neutral, available result with ZERO fetches", async () => {
    const fetchJson = vi.fn();
    const w = await getAsOfGameWeather(
      { site: DOME, kickoffUtc: KICKOFF, asOfUtc: AS_OF },
      { fetchJson },
    );
    expect(fetchJson).not.toHaveBeenCalled();
    expect(w.available).toBe(true);
    expect(w.indoor).toBe(true);
    expect(w.candidateSignals.passingSuppressionIndex).toBe(0);
  });

  it("a future kickoff uses the live forecast API at the kickoff hour", async () => {
    const urls: string[] = [];
    const w = await getAsOfGameWeather(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF },
      {
        fetchJson: async (url: string) => {
          urls.push(url);
          return hourly();
        },
        now: () => new Date(AS_OF), // "now" is freeze time — kickoff is future
      },
    );
    expect(urls[0]).toBe(buildForecastUrl(LAMBEAU));
    expect(urls[0]).toContain("api.open-meteo.com");
    expect(w.available).toBe(true);
    expect(w.windMph).toBe(18); // the 18:00 kickoff-hour bucket
    expect(w.forecastValidHourUtc).toBe("2026-12-13T18:00");
    expect(w.provenance.leadTimeHours).toBe(2);
  });

  it("a past kickoff uses the historical-forecast archive (never observed weather)", async () => {
    const urls: string[] = [];
    await getAsOfGameWeather(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF },
      {
        fetchJson: async (url: string) => {
          urls.push(url);
          return hourly();
        },
        now: () => new Date("2027-01-01T00:00:00.000Z"), // long after the game
      },
    );
    expect(urls[0]).toBe(buildHistoricalForecastUrl(LAMBEAU, new Date(KICKOFF)));
    expect(urls[0]).toContain("historical-forecast-api");
    expect(urls[0]).not.toContain("era5");
  });

  it("a fetch failure degrades to an honest available:false — never fabricated neutral", async () => {
    const w = await getAsOfGameWeather(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF },
      { fetchJson: async () => Promise.reject(new Error("down")), now: () => new Date(AS_OF) },
    );
    expect(w.available).toBe(false);
    expect(w.windMph).toBeNull();
  });
});

describe("the adapter seam + end-to-end canonical path", () => {
  const game: GameRow = {
    sport: "nfl",
    gameId: "gb-det",
    season: 2026,
    week: 15,
    startTime: KICKOFF,
    homeTeam: "GB",
    awayTeam: "DET",
    homeScore: 27,
    awayScore: 20,
    closing: { spreadHome: -3, total: 44, moneylineHomeDecimal: 1.8, moneylineAwayDecimal: 2.1 },
  };

  it("loader → adapter → feature builder yields leak-clean EvalRows", async () => {
    const w = await getAsOfGameWeather(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF },
      { fetchJson: async () => hourly(), now: () => new Date(AS_OF) },
    );
    const forecast = toGameWeatherForecast(w);
    expect(forecast).not.toBeNull();
    expect(forecast!.forecastIssuedAt).toBe(AS_OF); // honest latest bound
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildWeatherFeatureRows(
      [game],
      new Map([["gb-det", forecast!]]),
      store,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.features.get("wx:wind_mph")).toBe(18);
    expect(skipped.leakyForecast).toBe(0);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("available:false maps to null → the feature layer records an honest skip", () => {
    expect(
      toGameWeatherForecast({
        available: false,
      } as never),
    ).toBeNull();
  });

  it("an asOf AFTER the decision cutoff is dropped as leaky by the feature gate", async () => {
    const lateAsOf = "2026-12-13T17:30:00.000Z"; // inside the 1h decision lead
    const w = await getAsOfGameWeather(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: lateAsOf },
      { fetchJson: async () => hourly(), now: () => new Date(lateAsOf) },
    );
    const forecast = toGameWeatherForecast(w)!;
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildWeatherFeatureRows([game], new Map([["gb-det", forecast]]), store);
    expect(rows).toHaveLength(0);
    expect(skipped.leakyForecast).toBe(1); // the gate held against a mis-timed loader call
  });
});
