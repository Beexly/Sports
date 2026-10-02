import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { nflQbRushRateSignal } from "../nfl-qb-rush.js";

const kickoff = new Date("2026-10-04T17:00:00Z");

describe("QB rush rate", () => {
  it("votes the snap leader's 2025 rush rate when both names are in the file", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflQbRushRateSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Buffalo Bills",
      awayTeam: "New England Patriots",
      commenceTime: kickoff,
      env: {},
      now: () => new Date("2026-10-04T12:00:00Z"),
    } as never);
    expect(tilt.votes[0]?.rawValue).toBeCloseTo(7.0 - 6.1, 4);
    expect(tilt.votes).toHaveLength(1);
  });

  it("abstains when the snap leader is not in the 2025 file", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflQbRushRateSignal], {
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
