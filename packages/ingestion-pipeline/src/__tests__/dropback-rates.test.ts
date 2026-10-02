import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { DROPBACK_SIGNALS } from "../nfl-dropback-rates.js";
import { NFL_2026_W4_DROPBACK } from "../priors/nfl-2026-w4-dropback.js";

describe("2026 dropback rates", () => {
  it("votes Cleveland against Pittsburgh", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, DROPBACK_SIGNALS, {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2026_W4_DROPBACK.CLE;
    const away = NFL_2026_W4_DROPBACK.PIT;
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_sack_rate_allowed")).toBeCloseTo((away.sackAllowed - home.sackAllowed) * 100, 4);
    expect(byId.get("nfl_sack_rate_forced")).toBeCloseTo((home.sackForced - away.sackForced) * 100, 4);
    expect(byId.get("nfl_cpoe")).toBeCloseTo((home.cpoe - away.cpoe) / 10, 4);
    expect(byId.get("nfl_scramble_rate")).toBeCloseTo((home.scrambleRate - away.scrambleRate) * 100, 4);
    expect(tilt.votes.length).toBeGreaterThanOrEqual(4);
  });
});
