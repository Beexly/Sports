import { describe, expect, it } from "vitest";
import {
  fitPlattIrls,
  fitPlattMap,
  fitPlattMapFull,
  plattPredictiveMean,
  applyPlatt,
  fitPlattMapHierarchical,
} from "@/lib/calibration/platt-map";

function synth(n: number): { p: number; y: 0 | 1 }[] {
  const out: { p: number; y: 0 | 1 }[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.2 + (i / n) * 0.6;
    // slightly overconfident labels
    const y = (Math.sin(i * 1.7) * 0.5 + 0.5 < p ? 1 : 0) as 0 | 1;
    out.push({ p, y });
  }
  return out;
}

describe("fitPlattIrls MAP", () => {
  it("returns finite MAP with Laplace vars", () => {
    const samples = synth(120);
    const fit = fitPlattMapFull(samples);
    expect(fit.method).toBe("irls-map");
    expect(Number.isFinite(fit.params.A)).toBe(true);
    expect(Number.isFinite(fit.params.B)).toBe(true);
    expect(fit.laplace).not.toBeNull();
    expect(fit.laplace!.varA).toBeGreaterThan(0);
    const q = applyPlatt(0.55, fit.params);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
    const pred = plattPredictiveMean(0.55, fit);
    expect(pred).toBeGreaterThan(0);
    expect(pred).toBeLessThan(1);
  });

  it("fitPlattMap matches IRLS params", () => {
    const samples = synth(80);
    const a = fitPlattMap(samples);
    const b = fitPlattIrls(samples, { map: true }).params;
    expect(Math.abs(a.A - b.A)).toBeLessThan(1e-6);
  });

  it("hierarchical ridge returns intercepts without throwing", () => {
    const samples = synth(100).map((s, i) => ({
      ...s,
      groupKey: i % 2 === 0 ? "nfl|spread" : "nba|total",
    }));
    const h = fitPlattMapHierarchical(samples);
    expect(h.global.A).toBeDefined();
    expect(Object.keys(h.groupIntercept).length).toBeGreaterThan(0);
    expect(h.tau).toBeGreaterThan(0);
    expect(h.note).toMatch(/offline|R&D|Dirichlet/i);
  });
});
