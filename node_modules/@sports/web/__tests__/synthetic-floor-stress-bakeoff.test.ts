import { describe, expect, it } from "vitest";
import {
  runSyntheticFloorStressBakeoff,
  methodWouldPassFloors,
  ELIGIBILITY_FLOORS,
} from "@/lib/calibration/synthetic-overconfident-bakeoff";
import { fitPlattIrls, fitPlattMapHierarchical } from "@/lib/calibration/platt-map";
import { clampTau, TAU_MIN, TAU_MAX } from "@/lib/calibration/hierarchical-eb-tau";

describe("synthetic floor stress bake-off", () => {
  it("runs methods and records floor pass/fail", () => {
    const r = runSyntheticFloorStressBakeoff(400);
    expect(r.methods.length).toBeGreaterThanOrEqual(4);
    expect(typeof r.anyMethodPassesFloors).toBe("boolean");
    expect(r.conclusion.length).toBeGreaterThan(20);
    // document floors unchanged
    expect(ELIGIBILITY_FLOORS.brier).toBe(0.22);
    expect(ELIGIBILITY_FLOORS.ece).toBe(0.05);
  });
});

describe("IRLS edge cases", () => {
  it("empty sample returns prior-ish params", () => {
    const f = fitPlattIrls([]);
    expect(f.params.A).toBe(1);
    expect(f.params.B).toBe(0);
  });

  it("unknown group uses u=0", () => {
    const samples = Array.from({ length: 40 }, (_, i) => ({
      p: 0.4 + (i % 5) * 0.05,
      y: (i % 2) as 0 | 1,
      groupKey: "nfl|spread",
    }));
    const h = fitPlattMapHierarchical(samples);
    expect(h.groupIntercept["nba|total"] ?? 0).toBe(0);
    expect(clampTau(0)).toBe(TAU_MIN);
    expect(clampTau(9)).toBe(TAU_MAX);
  });
});

describe("methodWouldPassFloors", () => {
  it("rejects live-like RED metrics", () => {
    expect(
      methodWouldPassFloors({
        brier: 0.2749,
        ece: 0.1119,
        murphyReliability: 0.0262,
        nTest: 760,
      }),
    ).toBe(false);
  });
});
