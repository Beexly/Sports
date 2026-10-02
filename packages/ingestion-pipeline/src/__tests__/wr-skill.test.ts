import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { nflWrDropRateSignal, nflWrYacSignal } from "../nfl-wr-skill.js";

describe("target-leader skill", () => {
  it("votes YAC and drop rate when both leaders have both cells", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflWrYacSignal, nflWrDropRateSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "New England Patriots",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: {},
      now: () => new Date("2026-10-04T12:00:00Z"),
    } as never);
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_wr_yac")).toBeCloseTo(2.3 - 7.0, 4);
    expect(byId.get("nfl_wr_drop_rate")).toBeCloseTo((0.051 - 0) * 100, 4);
  });

  it("abstains for Cleveland because the target leader did not join", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflWrYacSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    expect(tilt.votes).toHaveLength(0);
  });
});
