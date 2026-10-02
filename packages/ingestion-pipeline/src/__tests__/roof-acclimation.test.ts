import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

describe("roof acclimation", () => {
  it("votes a dome mismatch when surfaces match, and abstains when roofs match", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_roof_acclimation");
    expect(signal).toBeTruthy();
    const tilt = await applyContinuousSignalTilt(0.5, [signal!], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Minnesota Vikings",
      awayTeam: "Buffalo Bills",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: {},
    } as never);
    const found = tilt.votes.find((v) => v.signalId === "nfl_roof_acclimation");
    expect(found).toBeTruthy();
    expect(found!.rawValue).toBe(1);
    expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);

    const same = await applyContinuousSignalTilt(0.5, [signal!], {
      sportKey: "americanfootball_nfl",
      homeTeam: "Green Bay Packers",
      awayTeam: "Chicago Bears",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: {},
    } as never);
    expect(same.votes.find((v) => v.signalId === "nfl_roof_acclimation")).toBeUndefined();
  });
});
