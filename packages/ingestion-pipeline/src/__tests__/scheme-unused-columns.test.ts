import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import {
  nflNoHuddleRateSignal,
  nflPriorPassRateSignal,
  nflRbBellcowSignal,
  nflShotgunRateSignal,
} from "../scheme-measured-signals.js";
import { NFL_SCHEME_PRIOR } from "../priors/nfl-2025-scheme.js";

describe("unused 2025 scheme columns", () => {
  it("votes shotgun, no-huddle, bellcow, and prior pass rate", async () => {
    const tilt = await applyContinuousSignalTilt(
      0.5,
      [nflPriorPassRateSignal, nflShotgunRateSignal, nflNoHuddleRateSignal, nflRbBellcowSignal],
      {
        sportKey: "americanfootball_nfl",
        homeTeam: "Cleveland Browns",
        awayTeam: "Pittsburgh Steelers",
        commenceTime: new Date("2026-10-02T00:15:00Z"),
        env: {},
        now: () => new Date("2026-10-01T21:30:00Z"),
      } as never,
    );
    const home = NFL_SCHEME_PRIOR.CLE;
    const away = NFL_SCHEME_PRIOR.PIT;
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_prior_pass_rate")).toBeCloseTo(home.passRate - away.passRate, 4);
    expect(byId.get("nfl_shotgun_rate")).toBeCloseTo(home.shotgun - away.shotgun, 4);
    expect(byId.get("nfl_no_huddle_rate")).toBeCloseTo(home.noHuddle - away.noHuddle, 4);
    expect(byId.get("nfl_rb_bellcow")).toBeCloseTo(home.rbBellcow - away.rbBellcow, 4);
    expect(tilt.votes).toHaveLength(4);
  });
});
