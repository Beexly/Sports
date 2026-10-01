import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";
import { nflAgeConditionedRestSignal, nflLinearWindPassSignal } from "../signal-registry-extensions.js";

const KICKOFF = new Date("2026-10-02T00:15:00Z");
const NOW = () => new Date("2026-10-01T21:16:00Z");

describe("Cleveland vs Pittsburgh uses the kickoff reading and the rest file", () => {
  it("10 mph at kickoff is a smaller penalty than the current hour", async () => {
    const ctx = {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      now: NOW,
    };
    const atKickoff = await nflLinearWindPassSignal.evaluate!({
      ...ctx,
      env: {
        WIND_MPH: "10",
        IS_DOME: "0",
        WEATHER_STADIUM: "Huntington Bank Field",
        WEATHER_PERIOD_START: "2026-10-01T20:00:00-04:00",
      },
    } as never);
    const currentHour = await nflLinearWindPassSignal.evaluate!({
      ...ctx,
      env: { WIND_MPH: "12", IS_DOME: "0" },
    } as never);
    if (!atKickoff || !("value" in atKickoff) || !currentHour || !("value" in currentHour)) {
      throw new Error("wind abstained");
    }
    expect(atKickoff.value).toBe(-0.105);
    expect(currentHour.value).toBeLessThan(atKickoff.value);
    expect(atKickoff.metadata).toMatchObject({
      windMph: 10,
      periodStart: "2026-10-01T20:00:00-04:00",
      stadium: "Huntington Bank Field",
    });
  });

  it("age-conditioned rest reads the games file when the slate left rest blank", async () => {
    const raw = await nflAgeConditionedRestSignal.evaluate!({
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      env: {},
      now: NOW,
    } as never);
    expect(raw).toBeTruthy();
    if (!raw || !("value" in raw)) throw new Error("expected a continuous value");
    expect(raw.metadata).toMatchObject({ restSource: "nfl-2026-rest" });
    expect(raw.value).not.toBe(0);
  });

  it("the Thursday slate records wind and the rest-file age vote", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      env: {
        WIND_MPH: "10",
        TEMP_F: "78",
        PRECIP_TYPE: "NONE",
        IS_DOME: "0",
        WEATHER_STADIUM: "Huntington Bank Field",
        WEATHER_PERIOD_START: "2026-10-01T20:00:00-04:00",
      },
      now: NOW,
    } as never);
    const ids = tilt.votes.map((v) => v.signalId);
    expect(ids).toContain("nfl_linear_wind_pass_impact");
    expect(ids).toContain("nfl_age_conditioned_rest");
    expect(ids).not.toContain("nfl_official_out_skill");
    expect(ids).not.toContain("nfl_practice_dnp_skill");
    expect(tilt.votes.find((v) => v.signalId === "nfl_linear_wind_pass_impact")?.rawValue).toBe(-0.105);
  });
});
