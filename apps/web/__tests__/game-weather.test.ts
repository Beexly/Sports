import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNflGameWeather, resetGameWeatherCacheForTests, type NflVenue } from "@/lib/weather/game-weather";

const VENUES: NflVenue[] = [
  { team: "KC", stadium: "Arrowhead", lat: 39.05, lon: -94.48 },
  { team: "GB", stadium: "Lambeau", lat: 44.5, lon: -88.06 },
];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/geo+json" } });
}

function hourly(temp: number, wind: string, precip: number) {
  return {
    properties: {
      periods: [
        {
          temperature: temp,
          windSpeed: wind,
          windDirection: "NW",
          probabilityOfPrecipitation: { value: precip },
          shortForecast: "Windy",
          startTime: "2026-01-05T13:00:00-06:00",
        },
      ],
    },
  };
}

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    // Match hourly first — the hourly URL carries the lat in a query param.
    if (url.includes("/forecast/hourly")) {
      const temp = url.includes("39.05") ? 30 : 18;
      const wind = url.includes("39.05") ? "8 mph" : "22 mph";
      return json(hourly(temp, wind, temp < 25 ? 40 : 10));
    }
    if (url.includes("/points/")) {
      // Encode the lat into the gridpoint URL so each venue gets a distinct hourly endpoint.
      return json({ properties: { forecastHourly: `https://api.weather.gov/gridpoints/AAA/1,2/forecast/hourly?lat=${url.split("/points/")[1]}` } });
    }
    return new Response("missing", { status: 404 });
  });
}

describe("nfl game weather (NWS)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetGameWeatherCacheForTests();
  });

  it("pulls current conditions per venue and sorts windiest first", async () => {
    const wx = await loadNflGameWeather({ venues: VENUES, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(wx.status).toBe("live");
    expect(wx.venuesLive).toBe(2);
    expect(wx.canPublishPicks).toBe(false);
    // Lambeau (22 mph) sorts above Arrowhead (8 mph).
    expect(wx.venues[0]?.team).toBe("GB");
    expect(wx.venues[0]?.windMph).toBe(22);
    const kc = wx.venues.find((v) => v.team === "KC");
    expect(kc?.tempF).toBe(30);
    expect(kc?.precipPct).toBe(10);
    // The cold, windy venue carries the higher precip chance.
    expect(wx.venues.find((v) => v.team === "GB")?.precipPct).toBe(40);
  });

  it("degrades per-venue: one venue failing does not sink the board", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/points/") && url.includes("44.5")) return new Response("down", { status: 503 });
      if (url.includes("/points/")) return json({ properties: { forecastHourly: "https://api.weather.gov/x/forecast/hourly" } });
      if (url.includes("/forecast/hourly")) return json(hourly(50, "5 mph", 0));
      return new Response("missing", { status: 404 });
    });
    const wx = await loadNflGameWeather({ venues: VENUES, fetcher, cacheTtlMs: 0 });
    expect(wx.status).toBe("live");
    expect(wx.venuesLive).toBe(1);
    expect(wx.venues.find((v) => v.team === "GB")?.status).toBe("error");
  });

  it("serves the game-weather API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/weather/game/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
