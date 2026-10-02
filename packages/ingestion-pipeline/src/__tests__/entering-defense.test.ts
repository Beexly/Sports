import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { ENTERING_DEFENSE_SIGNALS } from "../nfl-entering-defense.js";
import { NFL_2026_W4_DEFENSE } from "../priors/nfl-2026-w4-defense.js";

describe("2026 defense allowed", () => {
  it("votes visitor-minus-home EPA allowed for Pittsburgh at Cleveland", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [...ENTERING_DEFENSE_SIGNALS], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2026_W4_DEFENSE.CLE;
    const away = NFL_2026_W4_DEFENSE.PIT;
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_entering_pass_epa_allowed")).toBeCloseTo(away.passEpaAllowed - home.passEpaAllowed, 4);
    expect(byId.get("nfl_entering_rush_epa_allowed")).toBeCloseTo(away.rushEpaAllowed - home.rushEpaAllowed, 4);
    expect(tilt.votes).toHaveLength(2);
  });
});
