import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { nflKalshiHomeMidSignal } from "../signal-registry-extensions.js";

const KICKOFF = new Date("2026-10-02T00:15:00Z");

describe("Kalshi home mid", () => {
  it("votes Cleveland at 0.405 from the orderbook read 14 minutes before kickoff", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflKalshiHomeMidSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      env: {},
      now: () => new Date("2026-10-02T00:05:00Z"),
    } as never);
    expect(tilt.votes).toHaveLength(1);
    expect(tilt.votes[0]?.rawValue).toBeCloseTo(0.405 - 0.5, 6);
  });

  it("abstains once kickoff has passed", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflKalshiHomeMidSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      env: {},
      now: () => new Date("2026-10-02T00:16:00Z"),
    } as never);
    expect(tilt.votes).toHaveLength(0);
  });

  it("abstains when the snapshot is older than the kill line", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflKalshiHomeMidSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T03:00:00Z"),
      env: {},
      now: () => new Date("2026-10-02T02:01:00Z"),
    } as never);
    expect(tilt.votes).toHaveLength(0);
  });
});
