import { describe, expect, it } from "vitest";
import { recommendOffense, type DefensiveLook } from "./offensive-coordinator.js";

const look: DefensiveLook = {
  personnelGrouping: "11", coverage: "zone", blitzRate: 0.55, boxCountVsRun: 7, baseEpaPerPlay: 0.02,
};

describe("offensive coordinator", () => {
  it("raises a blitz-exploiting screen above the base rate", () => {
    const result = recommendOffense({
      down: 3, distance: 7, fieldPosition: 50, defensiveLook: look,
      candidates: [
        { formation: "shotgun", playType: "pass", historicalEpaPerPlay: 0.05, sampleSize: 80, exploits: [] },
        { formation: "shotgun", playType: "screen", historicalEpaPerPlay: 0.05, sampleSize: 80, exploits: [" blitz rate"] },
        { formation: "under-center", playType: "run", historicalEpaPerPlay: 0.05, sampleSize: 80, exploits: [] },
      ],
    });
    expect(result?.[0]?.playType).toBe("screen");
    expect(result?.[0]?.expectedEPA).toBeGreaterThan(look.baseEpaPerPlay);
  });

  it("returns null with empty defensive data or candidates", () => {
    expect(recommendOffense({ down: 1, distance: 10, fieldPosition: 50, defensiveLook: null, candidates: [] })).toBeNull();
    expect(recommendOffense({ down: 1, distance: 10, fieldPosition: 50, defensiveLook: look, candidates: [] })).toBeNull();
  });
});
