import { describe, expect, it } from "vitest";

import {
  FRAGMENTS,
  FRAGMENT_FRAMEWORK_HOSTS,
  fantasypointsDecayToFloor,
  fantasypointsDeterministicInRange,
  fantasypointsFiniteRank,
  fantasypointsNameMatchRank,
  fantasypointsProRateBySeconds,
  fantasypointsRankAssets,
  fantasypointsThresholdSum,
} from "./client-fragments.js";

describe("reproduced client fragments", () => {
  it("decays linearly and clamps at the visible floor", () => {
    expect(fantasypointsDecayToFloor(1, 10)).toBe(1);
    expect(fantasypointsDecayToFloor(6, 10)).toBeCloseTo(0.5, 6);
    expect(fantasypointsDecayToFloor(100, 10)).toBe(0.12);
  });

  it("maps a hash into the range using the visible 10007 divisor", () => {
    expect(fantasypointsDeterministicInRange(0, 10, 20)).toBe(10);
    expect(fantasypointsDeterministicInRange(10007, 10, 20)).toBe(10);
    expect(fantasypointsDeterministicInRange(5003, 10, 20)).toBeCloseTo(15, 1);
  });

  it("pro-rates by seconds against the 3600 cap and clamps", () => {
    expect(fantasypointsProRateBySeconds(0, 3600, 1800)).toBe(1800);
    expect(fantasypointsProRateBySeconds(5, 3600, 0)).toBe(5);
    expect(fantasypointsProRateBySeconds(0, 3600, 99999)).toBe(3600);
  });

  it("ranks name matches 0/1/2 and returns null below two characters", () => {
    expect(fantasypointsNameMatchRank("jos", "Josh Allen")).toBe(0);
    expect(fantasypointsNameMatchRank("allen", "Josh Allen")).toBe(1);
    expect(fantasypointsNameMatchRank("j", "Josh Allen")).toBeNull();
    expect(fantasypointsNameMatchRank("zzz", "Josh Allen")).toBeNull();
  });

  it("ranks assets by match then mvs and skips PICK_ ids", () => {
    const assets = new Map([
      ["PICK_1", { assetId: "PICK_1", name: "Josh Allen", position: "QB", mvs: 9999 }],
      ["a", { assetId: "a", name: "Josh Allen", position: "QB", mvs: 10 }],
      ["b", { assetId: "b", name: "Josh Allen", position: "QB", mvs: 20 }],
    ]);
    const out = fantasypointsRankAssets("josh", assets, 5);
    expect(out.map((o) => o.assetId)).toEqual(["b", "a"]);
  });

  it("returns a finite rank or null", () => {
    expect(fantasypointsFiniteRank({ rank: 3 })).toBe(3);
    expect(fantasypointsFiniteRank({ rank: Infinity })).toBeNull();
    expect(fantasypointsFiniteRank(null)).toBeNull();
  });

  it("sums only cleared thresholds", () => {
    const thresholds = [{ target: 10, points: 1 }, { target: 20, points: 2 }, { target: 30, points: 4 }];
    expect(fantasypointsThresholdSum(thresholds, () => 25)).toBe(3);
  });

  it("marks every incomplete fragment with the unknown helper", () => {
    for (const f of FRAGMENTS) {
      if (f.completeness === "incomplete") expect(f.unknown).not.toBeNull();
      else expect(f.unknown).toBeNull();
    }
    expect(FRAGMENTS).toHaveLength(8);
    expect(FRAGMENT_FRAMEWORK_HOSTS).toContain("thepowerrank.com");
  });
});
