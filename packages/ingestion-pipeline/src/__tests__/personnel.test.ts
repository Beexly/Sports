import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { PERSONNEL_SIGNALS } from "../nfl-personnel.js";
import { NFL_2025_PERSONNEL } from "../priors/nfl-2025-personnel.js";

describe("2025 personnel", () => {
  it("votes 11 and 12 personnel for Pittsburgh at Cleveland", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [...PERSONNEL_SIGNALS], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2025_PERSONNEL.CLE;
    const away = NFL_2025_PERSONNEL.PIT;
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_personnel_11")).toBeCloseTo(home.personnel11 - away.personnel11, 4);
    expect(byId.get("nfl_personnel_12")).toBeCloseTo(home.personnel12 - away.personnel12, 4);
  });
});
