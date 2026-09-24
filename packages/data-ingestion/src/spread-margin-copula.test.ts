/**
 * Tests for ./spread-margin-copula (arXiv:1901.04695, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT if the physics-structured model beats the 10:1-rule heuristic on Brier score at >0 cm by
 * >= 10% across the three test stadiums -- the paper's effect vs seasonal baseline is ~50% error
 * reduction, so 10% over a strong heuristic is a fair transfer bar. REJECT if it doesn't --
 * stadium microclimates may defeat a Norway-fitted structure, and GSE falls back to empirical
 * snow-depth climatology.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./spread-margin-copula";

describe("spread-margin copula (arXiv:1806.05612v1)", () => {
  const sm = [
    { spread: -3, margin: 7 }, { spread: -7, margin: 3 }, { spread: -3, margin: -3 },
    { spread: 3, margin: -7 }, { spread: 7, margin: -3 }, { spread: 0, margin: 0 },
  ];
  it("pseudo-obs in (0,1) with tie averaging", () => {
    const u = mod.pseudoObs([1, 1, 2])!;
    expect(u[0]).toBeCloseTo(u[1]!, 10);
    expect(u.every((x) => x > 0 && x < 1)).toBe(true);
    expect(mod.pseudoObs([])).toBeNull();
  });
  it("empirical copula monotone in grid", () => {
    const u = mod.pseudoObs(sm.map((s) => s.spread))!;
    const v = mod.pseudoObs(sm.map((s) => s.margin))!;
    const C = mod.empiricalCopula(u, v, [0.5, 1], [0.5, 1])!;
    expect(C[0]![0]).toBeLessThanOrEqual(C[1]![1]!);
    expect(mod.empiricalCopula([0.5], [0.5, 0.6], [0.5], [0.5])).toBeNull();
  });
  it("tail dependence bounded", () => {
    const u = mod.pseudoObs(sm.map((s) => s.spread))!;
    const v = mod.pseudoObs(sm.map((s) => s.margin))!;
    const t = mod.tailDependence(u, v, 0.2)!;
    expect(t.lower).toBeGreaterThanOrEqual(0);
    expect(t.upper).toBeGreaterThanOrEqual(0);
    expect(mod.tailDependence(u, v, 0.6)).toBeNull();
  });
  it("kendall tau anti-correlated here", () => {
    const u = mod.pseudoObs(sm.map((s) => s.spread))!;
    const v = mod.pseudoObs(sm.map((s) => s.margin))!;
    expect(mod.kendallTau(u, v)!).toBeLessThan(0);
    expect(mod.kendallTau([0.5], [0.5])).toBeNull();
  });
});
