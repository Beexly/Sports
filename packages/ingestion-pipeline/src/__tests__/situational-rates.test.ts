import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SITUATIONAL_SIGNALS } from "../nfl-situational-rates.js";
import { NFL_2026_W4_SITUATIONAL } from "../priors/nfl-2026-w4-situational.js";

describe("2026 situational rates", () => {
  it("votes the rates that differ, and drops a shared zero fumble rate", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, SITUATIONAL_SIGNALS, {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2026_W4_SITUATIONAL.CLE;
    const away = NFL_2026_W4_SITUATIONAL.PIT;
    expect(home).toBeDefined();
    expect(away).toBeDefined();
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_third_down_rate")).toBeCloseTo(home!.thirdDownRate - away!.thirdDownRate, 4);
    expect(byId.get("nfl_explosive_rate")).toBeCloseTo(home!.explosiveRate - away!.explosiveRate, 4);
    expect(byId.get("nfl_int_rate")).toBeCloseTo((away!.intRate - home!.intRate) * 100, 4);
    expect(byId.get("nfl_def_int_rate")).toBeCloseTo((home!.defIntRate - away!.defIntRate) * 100, 4);
    expect(byId.get("nfl_rz_td_rate")).toBeCloseTo(home!.rzTdRate - away!.rzTdRate, 4);
    expect(byId.has("nfl_fumble_lost_rate")).toBe(false);
  });
});
