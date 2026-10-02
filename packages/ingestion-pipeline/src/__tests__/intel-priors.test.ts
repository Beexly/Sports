import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { INTEL_PRIOR_SIGNALS } from "../nfl-intel-priors.js";
import { NFL_2025_INTEL } from "../priors/nfl-2025-intel.js";

describe("2025 intel priors", () => {
  it("votes trench, coverage, and form for Pittsburgh at Cleveland", async () => {
    const tilt = await applyContinuousSignalTilt(0.5, [...INTEL_PRIOR_SIGNALS], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      commenceTime: new Date("2026-10-02T00:15:00Z"),
      env: {},
      now: () => new Date("2026-10-01T21:30:00Z"),
    } as never);
    const home = NFL_2025_INTEL.CLE;
    const away = NFL_2025_INTEL.PIT;
    expect(home).toBeDefined();
    expect(away).toBeDefined();
    const byId = new Map(tilt.votes.map((vote) => [vote.signalId, vote.rawValue]));
    expect(byId.get("nfl_ol_vs_dl")).toBeCloseTo((home!.olIdx - away!.dlIdx) / 10, 4);
    expect(byId.get("nfl_dl_vs_ol")).toBeCloseTo((home!.dlIdx - away!.olIdx) / 10, 4);
    expect(byId.get("nfl_coverage_rating_allowed")).toBeCloseTo((away!.covRatAllowed - home!.covRatAllowed) / 10, 4);
    expect(byId.get("nfl_proe_form_delta")).toBeCloseTo((home!.proeDeltaPp - away!.proeDeltaPp) / 100, 4);
    expect(tilt.votes).toHaveLength(4);
  });
});
