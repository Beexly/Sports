/**
 * Tests for the weather evidence loader.
 *
 * All network access is injected via a fake fetch — no real calls. The fake
 * pins the real api.weather.gov endpoints so a proxy substitution would fail
 * the assertions. The client's module-level caches are cleared before every
 * test. The neutral fallback is treated as MISSING: it is an invented input,
 * not a measurement.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import { clearWeatherCacheForTests } from "@sports/data-ingestion/src/nws-weather-client.js";
import { loadWeather } from "./weather.js";

const FIXED_NOW = new Date("2026-11-12T15:00:00.000Z");
const NWS_POINTS_PREFIX = "https://api.weather.gov/points/";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Two-step NWS fake: points metadata, then the hourly forecast. */
function nwsFetch(reading: {
  temperature: number;
  windSpeed: string;
  shortForecast: string;
}): typeof fetch {
  return async (input) => {
    const url = requestUrl(input);
    if (url.startsWith(NWS_POINTS_PREFIX)) {
      return jsonResponse({
        properties: {
          forecastHourly:
            "https://api.weather.gov/gridpoints/GB/82,64/forecast/hourly",
        },
      });
    }
    return jsonResponse({
      properties: {
        periods: [
          {
            temperature: reading.temperature,
            windSpeed: reading.windSpeed,
            shortForecast: reading.shortForecast,
            probabilityOfPrecipitation: { value: 40 },
          },
        ],
      },
    });
  };
}

beforeEach(() => {
  clearWeatherCacheForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadWeather", () => {
  it("resolves a known venue and returns REAL with the NWS temperature", async () => {
    const spy = vi.fn(
      nwsFetch({ temperature: 28, windSpeed: "15 mph", shortForecast: "Snow" }),
    );
    const result = await loadWeather("Lambeau Field", {
      fetchImpl: spy,
      now: FIXED_NOW,
    });

    expect(result.status).toBe("REAL");
    if (!isPresent(result)) throw new Error("expected REAL evidence");
    expect(result.value.temperatureF).toBe(28);
    expect(result.value.windMph).toBe(15);
    // NWS hourly reading carries no direction or probability — honest nulls.
    expect(result.value.windDirectionDeg).toBeNull();
    expect(result.value.precipitationChance).toBeNull();
    expect(result.value.condition).toContain("Snow");
    expect(result.value.isDome).toBe(false);
    expect(result.asOf).toBe(FIXED_NOW.toISOString());
    // Real NWS endpoints were used — no proxy substitution.
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[0]?.[0])).toBe(
      "https://api.weather.gov/points/44.5013,-88.0622",
    );
    expect(String(spy.mock.calls[1]?.[0])).toBe(
      "https://api.weather.gov/gridpoints/GB/82,64/forecast/hourly",
    );
  });

  it("returns MISSING for an unknown venue and never falls back to Denver", async () => {
    const spy = vi.fn(
      nwsFetch({ temperature: 28, windSpeed: "15 mph", shortForecast: "Snow" }),
    );
    const result = await loadWeather("The Thunderdome", {
      fetchImpl: spy,
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("no coordinates for venue The Thunderdome");
    expect(result.reason).not.toContain("Denver");
    // No coordinates means no fetch at all — nothing was invented.
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns MISSING when the venue is null and no city/state is supplied", async () => {
    const spy = vi.fn(
      nwsFetch({ temperature: 28, windSpeed: "15 mph", shortForecast: "Snow" }),
    );
    const result = await loadWeather(null, { fetchImpl: spy, now: FIXED_NOW });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("no coordinates");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns MISSING when the fetch throws — the neutral fallback is not evidence", async () => {
    const throwingFetch: typeof fetch = async () => {
      throw new Error("network down");
    };
    const result = await loadWeather("Lambeau Field", {
      fetchImpl: throwingFetch,
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("Lambeau Field");
    expect(result.reason.toLowerCase()).toContain("fallback");
  });

  it("returns MISSING when NWS answers 500 — no neutral temperature is surfaced", async () => {
    const result = await loadWeather("Lambeau Field", {
      fetchImpl: async () => jsonResponse({}, 500),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason.toLowerCase()).toContain("fallback");
  });

  it("returns REAL with isDome true for an indoor venue, without any fetch", async () => {
    const spy = vi.fn(
      nwsFetch({ temperature: 28, windSpeed: "15 mph", shortForecast: "Snow" }),
    );
    const result = await loadWeather("Caesars Superdome", {
      fetchImpl: spy,
      now: FIXED_NOW,
    });

    expect(result.status).toBe("REAL");
    if (!isPresent(result)) throw new Error("expected REAL evidence");
    expect(result.value.isDome).toBe(true);
    expect(result.value.temperatureF).toBe(72);
    expect(result.value.windMph).toBe(0);
    expect(result.value.condition).toBe("Indoors (dome)");
    // A dome genuinely has no weather — the client short-circuits, no network.
    expect(spy).not.toHaveBeenCalled();
  });

  it("resolves via city/state when the venue string is null", async () => {
    const result = await loadWeather(null, {
      city: "Green Bay",
      state: "WI",
      fetchImpl: nwsFetch({
        temperature: 31,
        windSpeed: "8 mph",
        shortForecast: "Cloudy",
      }),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("REAL");
    if (!isPresent(result)) throw new Error("expected REAL evidence");
    expect(result.value.temperatureF).toBe(31);
    expect(result.value.isDome).toBe(false);
  });
});
