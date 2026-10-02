import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { nflWrAdotSignal } from "../nfl-wr-adot.js";

describe("target-leader adot", () => {
  it("votes when both target leaders join the 2025 file", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflWrAdotSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "New England Patriots",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: {},
      now: () => new Date("2026-10-04T12:00:00Z"),
    } as never);
    expect(tilt.votes[0]?.rawValue).toBeCloseTo(13.0 - 10.5, 4);
  });

  it("abstains when the target leader is not in the 2025 file", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflWrAdotSignal], {
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
