import { describe, expect, it } from "vitest";
import {
  clampTau,
  fitEmpiricalBayesTau,
  TAU_MAX,
  TAU_MIN,
} from "@/lib/calibration/hierarchical-eb-tau";
import { fitPlattMapHierarchical } from "@/lib/calibration/platt-map";

describe("EB tau clamp", () => {
  it("clamps to [0.05, 2.0]", () => {
    expect(clampTau(0.001)).toBe(TAU_MIN);
    expect(clampTau(99)).toBe(TAU_MAX);
    expect(clampTau(0.3)).toBe(0.3);
  });

  it("moment EB returns clamped tau", () => {
    const fit = fitEmpiricalBayesTau([
      { groupKey: "a", residualMean: 0.2, n: 40 },
      { groupKey: "b", residualMean: -0.15, n: 40 },
      { groupKey: "c", residualMean: 0.05, n: 30 },
    ]);
    expect(fit.tau).toBeGreaterThanOrEqual(TAU_MIN);
    expect(fit.tau).toBeLessThanOrEqual(TAU_MAX);
    expect(fit.nGroups).toBe(3);
  });
});

describe("fitPlattMapHierarchical EB", () => {
  it("estimates tau and returns intercepts", () => {
    const samples = Array.from({ length: 120 }, (_, i) => {
      const g = i % 3 === 0 ? "nfl|spread" : i % 3 === 1 ? "nba|total" : "mlb|ml";
      const p = 0.35 + (i % 10) * 0.03;
      const y = (i % 4 === 0 ? 1 : 0) as 0 | 1;
      return { p, y, groupKey: g };
    });
    const h = fitPlattMapHierarchical(samples);
    expect(h.tau).toBeGreaterThanOrEqual(TAU_MIN);
    expect(h.tau).toBeLessThanOrEqual(TAU_MAX);
    expect(h.tauClamp).toEqual({ min: TAU_MIN, max: TAU_MAX });
    expect(h.note).toMatch(/No Dirichlet process/);
    expect(Object.keys(h.groupIntercept).length).toBe(3);
  });
});
