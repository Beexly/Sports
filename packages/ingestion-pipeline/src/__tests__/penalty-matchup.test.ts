import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { nflPenaltyDifferentialSignal } from "../signal-registry-extensions.js";

const KICKOFF = new Date("2026-10-02T00:15:00Z");

describe("penalty differential", () => {
  it("votes Cleveland's last five games against Pittsburgh", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflPenaltyDifferentialSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    expect(tilt.votes).toHaveLength(1);
    expect(tilt.votes[0]?.rawValue).toBe(-2.2);
  });

  it("abstains before week 4", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [nflPenaltyDifferentialSignal], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-09-20T17:00:00Z"),
      env: {},
      now: () => new Date("2026-09-20T12:00:00Z"),
    } as never);
    expect(tilt.votes).toHaveLength(0);
  });
});
