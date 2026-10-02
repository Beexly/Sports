/**
 * Measured scheme columns, kickoff window, timezone travel, and forecast text.
 * Each vote uses a number we already have. None invents a missing column.
 */
import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";
import { classifyNflBroadcast } from "../nfl-broadcast.js";
import { classifyPrecip } from "../fetch-venue-weather.js";
import { tzOffsetHours } from "../nfl-team-timezone.js";

const NFL = { sportKey: "americanfootball_nfl", now: () => new Date("2026-10-01T12:00:00Z") };

async function vote(id: string, extra: Record<string, unknown>) {
  const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, {
    ...NFL,
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Seattle Seahawks",
    commenceTime: new Date("2026-10-01T23:15:00Z"),
    env: {},
    ...extra,
  } as never);
  return tilt.votes.find((v) => v.signalId === id);
}

describe("measured scheme columns vote", () => {
  it("red-zone pass rate, funnel, pace, defense rank, and prior EPA each move a number", async () => {
    const ids = [
      "nfl_redzone_pass_tendency",
      "nfl_wr_target_funnel",
      "nfl_pace_plays_per_game",
      "nfl_pass_defense_prior",
      "nfl_prior_offense_epa",
    ];
    for (const id of ids) {
      const found = await vote(id, {});
      expect(found, id).toBeTruthy();
      expect(found!.rawValue).not.toBe(0);
    }
  });
});

describe("primetime uses the kickoff clock and the measured funnel", () => {
  it("classifies a Thursday night and abstains on a Sunday noon window", () => {
    expect(classifyNflBroadcast(new Date("2026-10-01T23:20:00Z"))).toBe("TNF_PRIMETIME");
    expect(classifyNflBroadcast(new Date("2026-10-04T17:00:00Z"))).toBe("REGIONAL_SUNDAY_EARLY");
  });

  it("a Thursday night votes the funnel gap, a Sunday early window does not", async () => {
    const night = await vote("nfl_primetime_target_concentration", {
      commenceTime: new Date("2026-10-01T23:20:00Z"),
    });
    expect(night).toBeTruthy();
    expect(night!.rawValue).not.toBe(0);
    const early = await vote("nfl_primetime_target_concentration", {
      commenceTime: new Date("2026-10-04T17:00:00Z"),
    });
    expect(early).toBeUndefined();
  });
});

describe("circadian uses team timezones and rest already on the row", () => {
  it("October New York is four hours behind UTC, not five", () => {
    expect(tzOffsetHours("America/New_York", new Date("2026-10-01T17:00:00Z"))).toBe(-4);
  });

  it("a west visitor at a 1pm eastern kickoff on short rest moves home up", async () => {
    const found = await vote("nfl_circadian_travel_fatigue", {
      homeTeam: "Buffalo Bills",
      awayTeam: "Seattle Seahawks",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: { HOME_REST_DAYS: "7", AWAY_REST_DAYS: "4" },
    });
    expect(found, "circadian must vote").toBeTruthy();
    expect(found!.rawValue).toBeGreaterThan(0);
  });
});

describe("forecast text classifies precipitation without inventing heavy rain", () => {
  it("snow, light rain, and a dry forecast are distinct, and a blank forecast is absent", () => {
    expect(classifyPrecip("Chance Snow Showers")).toBe("SNOW");
    expect(classifyPrecip("Slight Chance Rain Showers")).toBe("LIGHT_RAIN");
    expect(classifyPrecip("Sunny")).toBe("NONE");
    expect(classifyPrecip("")).toBeNull();
  });

  it("a freezing outdoor reading hurts the more pass-heavy side", async () => {
    const found = await vote("nfl_temperature_precipitation_decay", {
      env: { TEMP_F: "18", PRECIP_TYPE: "SNOW", IS_DOME: "0" },
    });
    expect(found).toBeTruthy();
    expect(found!.rawValue).not.toBe(0);
  });
});
