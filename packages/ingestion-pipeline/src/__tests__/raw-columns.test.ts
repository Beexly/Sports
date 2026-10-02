import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { RAW_COLUMN_SIGNALS } from "../nfl-raw-columns.js";
import { NFL_2025_RAW } from "../priors/nfl-2025-raw.js";

describe("raw 2025 columns", () => {
  it("votes the buried trench and coverage columns for Pittsburgh at Cleveland", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [...RAW_COLUMN_SIGNALS], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2025_RAW.CLE;
    const away = NFL_2025_RAW.PIT;
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_pressure_pct")).toBeCloseTo((away.pressurePct - home.pressurePct) / 10, 4);
    expect(byId.get("nfl_sack_rate_allowed")).toBeCloseTo((away.sackRate - home.sackRate) * 100, 4);
    expect(byId.get("nfl_pocket_time")).toBeCloseTo(home.pocketTime - away.pocketTime, 4);
    expect(byId.get("nfl_yards_before_contact")).toBeCloseTo(home.yardsBeforeContact - away.yardsBeforeContact, 4);
    expect(byId.get("nfl_pace_form_delta")).toBeCloseTo((home.paceDelta - away.paceDelta) / 10, 4);
    expect(byId.get("nfl_yds_per_target_allowed")).toBeCloseTo(away.ydsPerTargetAllowed - home.ydsPerTargetAllowed, 4);
    expect(tilt.votes).toHaveLength(6);
  });
});
