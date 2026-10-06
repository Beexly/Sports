/**
 * Tests for the game-keyed weather capture projection
 * (`apps/web/lib/weather/game-weather-capture.ts`).
 *
 * The contract: outdoor games with live NWS readings become `game_signals`
 * rows carrying the NWS numbers verbatim; everything else — domes, unknown
 * teams, failed fetches, null metrics — is skipped WITH a reason, never
 * defaulted. A null-weather row would read as "measured calm"; no row reads
 * as "unknown", which is the truth.
 */
import { describe, it, expect } from "vitest";
import {
  projectWeatherSignals,
  venueForTeam,
  NWS_TRUST,
  type CapturableGame,
} from "@/lib/weather/game-weather-capture";
import type { NflGameWeather } from "@/lib/weather/game-weather";

function venueReading(overrides: Record<string, unknown> = {}) {
  return {
    team: "GB",
    stadium: "Lambeau Field",
    status: "ok",
    tempF: 34,
    windMph: 18,
    windDirection: "NW",
    precipPct: 20,
    shortForecast: "Cloudy",
    observedFor: "2026-10-01T18:00:00Z",
    error: null,
    ...overrides,
  };
}

function weatherWith(venues: ReturnType<typeof venueReading>[]): NflGameWeather {
  return {
    generatedAt: "2026-10-01T18:00:00Z",
    status: "live",
    venues,
    venuesLive: venues.filter((v) => v.status === "ok").length,
    canPublishPicks: false,
    note: "test",
    sourceUrl: "https://api.weather.gov",
    error: null,
  };
}

const GAME: CapturableGame = {
  gameId: "game-1",
  homeTeamAbbr: "GB",
  commenceTime: "2026-10-04T17:00:00Z",
};

describe("venueForTeam", () => {
  it("resolves a plain abbreviation", () => {
    expect(venueForTeam("GB")?.stadium).toBe("Lambeau Field");
  });

  it("resolves both halves of a shared stadium", () => {
    expect(venueForTeam("NYJ")?.stadium).toBe("MetLife Stadium");
    expect(venueForTeam("NYG")?.stadium).toBe("MetLife Stadium");
  });

  it("returns null for domes and unknown teams — never a default venue", () => {
    // DAL plays at AT&T Stadium (retractable roof) — not in the outdoor list.
    expect(venueForTeam("DAL")).toBeNull();
    expect(venueForTeam("XYZ")).toBeNull();
    expect(venueForTeam("")).toBeNull();
  });
});

describe("projectWeatherSignals", () => {
  it("projects the NWS numbers verbatim with expiry at kickoff", () => {
    const { rows, skipped } = projectWeatherSignals(
      [GAME],
      weatherWith([venueReading()]),
    );

    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(3);
    const byKey = Object.fromEntries(rows.map((r) => [r.signalKey, r]));
    expect(byKey["wind_mph"].signalValue).toBe(18);
    expect(byKey["temp_f"].signalValue).toBe(34);
    expect(byKey["precip_pct"].signalValue).toBe(20);
    for (const r of rows) {
      expect(r.gameId).toBe("game-1");
      expect(r.sourceCategory).toBe("WEATHER");
      expect(r.sourceName).toBe("nws");
      expect(r.expiresAt).toBe("2026-10-04T17:00:00.000Z");
      expect(r.trustLevel).toBe(NWS_TRUST);
    }
  });

  it("emits only the metrics the NWS actually returned", () => {
    const { rows, skipped } = projectWeatherSignals(
      [GAME],
      weatherWith([venueReading({ windMph: null, precipPct: null })]),
    );

    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.signalKey).toBe("temp_f");
  });

  it("skips dome teams with a reason — no null-weather rows", () => {
    const { rows, skipped } = projectWeatherSignals(
      [{ ...GAME, gameId: "game-2", homeTeamAbbr: "DAL" }],
      weatherWith([venueReading()]),
    );

    expect(rows).toEqual([]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.gameId).toBe("game-2");
    expect(skipped[0]!.reason).toMatch(/no outdoor venue/);
  });

  it("skips games whose venue fetch failed, naming the venue", () => {
    const { rows, skipped } = projectWeatherSignals(
      [GAME],
      weatherWith([venueReading({ status: "error", error: "timeout", windMph: null, tempF: null, precipPct: null })]),
    );

    expect(rows).toEqual([]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.reason).toMatch(/Lambeau Field/);
  });

  it("skips a game with an unparsable commenceTime — expiry must be real", () => {
    const { rows, skipped } = projectWeatherSignals(
      [{ ...GAME, commenceTime: "not-a-date" }],
      weatherWith([venueReading()]),
    );

    expect(rows).toEqual([]);
    expect(skipped[0]!.reason).toMatch(/expiresAt/);
  });
});
