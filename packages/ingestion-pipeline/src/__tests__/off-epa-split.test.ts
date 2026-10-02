import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { OFF_EPA_SPLIT_SIGNALS } from "../nfl-off-epa-split.js";

describe("offensive EPA split", () => {
  it("votes pass EPA and abstains on rush when Pittsburgh is under 60 rushes", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, OFF_EPA_SPLIT_SIGNALS, {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_off_pass_epa")).toBeCloseTo(0.1063 - -0.1768, 4);
    expect(byId.has("nfl_off_rush_epa")).toBe(false);
  });
});
