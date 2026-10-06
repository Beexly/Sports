import { describe, expect, it } from "vitest";

import {
  dieboldMariano,
  energyScore,
  ensembleSizeAudit,
  meanEnergyScore,
  rankTransformMargin,
} from "@/lib/calibration/1910-07325v1-energy-score-multivariate";

describe("energy score multivariate selection", () => {
  it("is zero for a degenerate perfect ensemble", () => {
    const obs = [3.5, 47.0];
    const ens = [obs, obs, obs];
    expect(energyScore(ens, obs)).toBeCloseTo(0, 10);
  });

  it("prefers the sharper well-centered ensemble", () => {
    const obs = [0, 0];
    const tight = [
      [0.1, -0.1], [-0.1, 0.1], [0.05, 0.05], [-0.05, -0.05],
    ];
    const loose = [
      [3, -3], [-3, 3], [2.5, 2.5], [-2.5, -2.5],
    ];
    expect(energyScore(tight, obs)).toBeLessThan(energyScore(loose, obs));
  });

  it("DM test flags a real difference and clears a null one", () => {
    const a = [1, 1.1, 0.9, 1.05, 0.95, 1.02, 0.98, 1.0, 1.01, 0.99, 1.03, 0.97];
    const b = a.map((x) => x + 0.5);
    const sig = dieboldMariano(a, b);
    expect(Math.abs(sig.tStat)).toBeGreaterThan(1.96);
    expect(sig.meanDiff).toBeLessThan(0);
    const tie = dieboldMariano(a, [...a]);
    expect(tie.tStat).toBe(0);
  });

  it("ensemble-size audit enforces the 1,024 bar", () => {
    expect(ensembleSizeAudit(1024).ok).toBe(true);
    expect(ensembleSizeAudit(512).ok).toBe(false);
    expect(ensembleSizeAudit(2048).minM).toBe(1024);
  });

  it("rankTransformMargin maps to (0,1) uniforms preserving order", () => {
    const r = rankTransformMargin([30, 10, 20]);
    expect(r[1]).toBeLessThan(r[2]);
    expect(r[2]).toBeLessThan(r[0]);
    expect(Math.min(...r)).toBeGreaterThan(0);
    expect(Math.max(...r)).toBeLessThan(1);
  });

  it("meanEnergyScore averages over games", () => {
    const e = [[[0, 0], [0.1, 0.1]], [[1, 1], [1.1, 0.9]]];
    const o = [[0, 0], [1, 1]];
    expect(meanEnergyScore(e, o)).toBeCloseTo(
      (energyScore(e[0], o[0]) + energyScore(e[1], o[1])) / 2,
      10,
    );
  });
});
