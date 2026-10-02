import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { PBP_ENTERING_SIGNALS } from "../nfl-pbp-entering.js";

describe("2026 play-file rates", () => {
  it("votes Cleveland, who the 2025 name-join missed", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, PBP_ENTERING_SIGNALS, {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_pbp_qb_rush_att")).toBeCloseTo(8.0 - 2.33, 4);
    expect(byId.get("nfl_pbp_qb_rush_yards")).toBeCloseTo((35.0 - 4.0) / 10, 4);
    expect(byId.get("nfl_pbp_wr_adot")).toBeCloseTo(5.55 - 14.12, 4);
    expect(byId.get("nfl_pbp_wr_yac")).toBeCloseTo(2.58 - 2.55, 4);
  });
});
