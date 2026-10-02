import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { ENTERING_RATE_SIGNALS } from "../nfl-entering-rates.js";
import { NFL_2026_W4_ENTERING } from "../priors/nfl-2026-w4-entering.js";

const KICKOFF = new Date("2026-10-02T00:15:00Z");

describe("2026 entering rates", () => {
  it("votes the weeks 1-3 gap, not the 2025 prior", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [...ENTERING_RATE_SIGNALS], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: KICKOFF,
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2026_W4_ENTERING.CLE;
    const away = NFL_2026_W4_ENTERING.PIT;
    expect(home).toBeDefined();
    expect(away).toBeDefined();
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_entering_pass_rate")).toBeCloseTo(home!.passRate - away!.passRate, 4);
    expect(byId.get("nfl_entering_early_down_pass_rate")).toBeCloseTo(home!.earlyDownPassRate - away!.earlyDownPassRate, 4);
    expect(byId.get("nfl_entering_offense_epa")).toBeCloseTo(home!.offEpa - away!.offEpa, 4);
    expect(byId.get("nfl_entering_pace")).toBeCloseTo((home!.playsPerGame - away!.playsPerGame) / 10, 4);
    expect(tilt.votes).toHaveLength(4);
  });

  it("abstains before week 4", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [...ENTERING_RATE_SIGNALS], {
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
