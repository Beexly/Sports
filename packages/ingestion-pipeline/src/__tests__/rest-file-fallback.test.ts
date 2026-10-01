import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

describe("rest days from the games file", () => {
  it("votes a Thursday road team when env rest was never passed", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_short_week_road_deficit");
    expect(signal).toBeTruthy();
    const tilt = await applyContinuousSignalTilt(0.5, [signal!], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-01T23:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T12:00:00Z"),
    } as never);
    const found = tilt.votes.find((v) => v.signalId === "nfl_short_week_road_deficit");
    expect(found, "Thursday rest must reach the tilt").toBeTruthy();
    expect(found!.rawValue).toBeGreaterThan(0);
    expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);

    const missing = await applyContinuousSignalTilt(0.5, [signal!], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Chicago Bears",
      commenceTime: new Date("2026-10-01T23:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T12:00:00Z"),
    } as never);
    expect(missing.votes.find((v) => v.signalId === "nfl_short_week_road_deficit")).toBeUndefined();
  });
});
