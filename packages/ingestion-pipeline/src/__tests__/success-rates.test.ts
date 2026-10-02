import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SUCCESS_SIGNALS } from "../nfl-success-rates.js";
import { NFL_2026_W4_SUCCESS } from "../priors/nfl-2026-w4-success.js";

describe("2026 success rates", () => {
  it("votes Cleveland against Pittsburgh", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, SUCCESS_SIGNALS, {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2026_W4_SUCCESS.CLE;
    const away = NFL_2026_W4_SUCCESS.PIT;
    expect(home).toBeDefined();
    expect(away).toBeDefined();
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_off_success_rate")).toBeCloseTo(home!.successRate - away!.successRate, 4);
    expect(byId.get("nfl_series_success_rate")).toBeCloseTo(home!.seriesSuccessRate - away!.seriesSuccessRate, 4);
  });
});
