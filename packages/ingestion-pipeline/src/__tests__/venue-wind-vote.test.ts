/**
 * Wind is a measured venue reading, not a guessed miles-per-hour. The vote
 * hurts the more pass-heavy side. A team with no outdoor coordinate abstains.
 */
import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { fetchOutdoorVenueWeather } from "../fetch-venue-weather.js";
import { nflLinearWindPassSignal } from "../signal-registry-extensions.js";
import { NFL_SCHEME_PRIOR } from "../priors/nfl-2025-scheme.js";

const NOW = () => new Date("2026-10-01T12:00:00Z");

describe("venue wind votes against the pass-heavier side", () => {
  it("a heavy wind at Arrowhead hurts the pass-heavier club", async () => {
    const home = NFL_SCHEME_PRIOR.KC;
    const away = NFL_SCHEME_PRIOR.BAL;
    expect(home).toBeTruthy();
    expect(away).toBeTruthy();
    const raw = await nflLinearWindPassSignal.evaluate!({
      sportKey: "americanfootball_nfl",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Baltimore Ravens",
      env: { WIND_MPH: "20", IS_DOME: "0", WEATHER_STADIUM: "Arrowhead Stadium" },
      now: NOW,
    } as never);
    expect(raw).toBeTruthy();
    if (!raw || !("value" in raw)) throw new Error("expected a continuous value");
    expect(raw.value).not.toBe(0);
    // 20 mph is above the 7.5 calm threshold, so the yards tilt is negative.
    // The sign of the vote follows who passes more.
    const passGap = home!.passRate - away!.passRate;
    if (passGap > 0) expect(raw.value).toBeLessThan(0);
    if (passGap < 0) expect(raw.value).toBeGreaterThan(0);

    const tilt = await applyContinuousSignalTilt(0.5, [nflLinearWindPassSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "KC",
      awayTeam: "BAL",
      env: { WIND_MPH: "20", IS_DOME: "0" },
      now: NOW,
    } as never);
    expect(tilt.applied).toBe(true);
    expect(tilt.adjustedHomeP).not.toBe(0.5);
  });

  it("calm wind does not vote", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflLinearWindPassSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "KC",
      awayTeam: "BAL",
      env: { WIND_MPH: "3", IS_DOME: "0" },
      now: NOW,
    } as never);
    expect(tilt.votes).toHaveLength(0);
    expect(tilt.adjustedHomeP).toBe(0.5);
  });

  it("a club with no outdoor coordinate abstains, and a stubbed NWS reading is not invented", async () => {
    const missing = await fetchOutdoorVenueWeather("Los Angeles Rams", async () => {
      throw new Error("must not be called");
    });
    expect(missing).toBeNull();

    const fetcher = async (url: string) => {
      if (url.includes("/points/")) {
        return new Response(JSON.stringify({
          properties: { forecastHourly: "https://api.weather.gov/gridpoints/EAX/32,48/forecast/hourly" },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        properties: {
          periods: [{ temperature: 62, windSpeed: "18 mph", startTime: "2026-10-01T18:00:00Z" }],
        },
      }), { status: 200 });
    };
    const reading = await fetchOutdoorVenueWeather("Kansas City Chiefs", fetcher);
    expect(reading?.stadium).toBe("Arrowhead Stadium");
    expect(reading?.windMph).toBe(18);
    expect(reading?.tempF).toBe(62);
  });

  it("a kickoff hour is the reading, not the current hour", async () => {
    const fetcher = async (url: string) => {
      if (url.includes("/points/")) {
        return new Response(JSON.stringify({
          properties: { forecastHourly: "https://api.weather.gov/gridpoints/CLE/83,65/forecast/hourly" },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        properties: {
          periods: [
            {
              startTime: "2026-10-01T16:00:00-04:00",
              endTime: "2026-10-01T17:00:00-04:00",
              temperature: 82,
              windSpeed: "12 mph",
              shortForecast: "Partly Sunny",
            },
            {
              startTime: "2026-10-01T20:00:00-04:00",
              endTime: "2026-10-01T21:00:00-04:00",
              temperature: 78,
              windSpeed: "10 mph",
              shortForecast: "Cloudy",
            },
          ],
        },
      }), { status: 200 });
    };
    const kickoff = new Date("2026-10-02T00:15:00Z");
    const reading = await fetchOutdoorVenueWeather("Cleveland Browns", fetcher, 4000, kickoff);
    expect(reading?.windMph).toBe(10);
    expect(reading?.tempF).toBe(78);
    expect(reading?.precipType).toBe("NONE");
    expect(reading?.observedFor).toBe("2026-10-01T20:00:00-04:00");
    const missed = await fetchOutdoorVenueWeather(
      "Cleveland Browns",
      fetcher,
      4000,
      new Date("2026-10-03T00:15:00Z"),
    );
    expect(missed).toBeNull();
  });
});
