import { describe, it, expect } from "vitest";
import {
  predictionInterval,
  intervalOverlap,
  flagTies,
  sosDial,
  rankRanges,
  flagNonRobust,
} from "./1403-7642-college-ranking-sensitivity.js";

describe("flagTies", () => {
  it("flags heavily-overlapping pairs and not separated pairs", () => {
    const ratings = [
      { team: "Alabama", eblup: 2.0, se: 0.3 },
      { team: "Georgia", eblup: 2.05, se: 0.3 },
      { team: "Vanderbilt", eblup: -1.5, se: 0.3 },
    ];
    expect(intervalOverlap(ratings[0]!, ratings[1]!)).toBeGreaterThan(0.5);
    const ties = flagTies(ratings);
    expect(ties).toContainEqual(["Alabama", "Georgia"]);
    expect(ties.some(([a, b]) => a === "Vanderbilt" || b === "Vanderbilt")).toBe(false);
  });
});

describe("sosDial", () => {
  it("interpolates between win-loss and SOS", () => {
    expect(sosDial(0.8, 0.2, 0)).toBeCloseTo(0.8, 10);
    expect(sosDial(0.8, 0.2, 1e9)).toBeCloseTo(0.2, 6);
    expect(sosDial(0.8, 0.2, 1)).toBeCloseTo(0.5, 10);
  });
});

describe("rankRanges / flagNonRobust", () => {
  const teams = ["Alabama", "Georgia", "OklahomaSt", "LSU"];
  // 3 defensible specifications; OklahomaSt swings wildly across them
  const specs = [
    [1, 2, 3, 4],
    [2, 1, 4, 3],
    [1, 3, 8, 2],
  ];
  it("computes per-team rank ranges", () => {
    const rr = rankRanges(teams, specs);
    expect(rr.find((r) => r.team === "Alabama")).toMatchObject({ lo: 1, hi: 2 });
    expect(rr.find((r) => r.team === "OklahomaSt")).toMatchObject({ lo: 3, hi: 8 });
  });
  it("flags the non-robust top-10 team", () => {
    expect(flagNonRobust(teams, specs)).toEqual(["OklahomaSt"]);
  });
  it("flags nothing when all specs agree", () => {
    const stable = [
      [1, 2, 3, 4],
      [1, 2, 3, 4],
    ];
    expect(flagNonRobust(teams, stable)).toEqual([]);
  });
});

describe("predictionInterval", () => {
  it("is symmetric around the EBLUP with 1.96*se half-width", () => {
    const [lo, hi] = predictionInterval({ team: "X", eblup: 1.0, se: 0.5 });
    expect(lo).toBeCloseTo(0.02, 10);
    expect(hi).toBeCloseTo(1.98, 10);
  });
});
