import { describe, expect, it } from "vitest";
import {
  stationaryBootstrapIndices,
  bootstrapBrierCi,
  bootstrapMapGrid,
  createSeededRng,
} from "@/lib/calibration/stationary-bootstrap";
import { fitEmpiricalBayesTau, clampTau, TAU_MIN, TAU_MAX } from "@/lib/calibration/hierarchical-eb-tau";
import { residualNonconformity, splitConformalResidualThreshold } from "@/lib/calibration/conformal-calibration";

describe("stationary bootstrap", () => {
  it("returns n indices in range", () => {
    const rand = createSeededRng(1);
    const idx = stationaryBootstrapIndices(50, 14, rand);
    expect(idx).toHaveLength(50);
    expect(idx.every((i) => i >= 0 && i < 50)).toBe(true);
  });

  it("brier CI finite", () => {
    const p = Array.from({ length: 40 }, (_, i) => 0.4 + (i % 10) * 0.02);
    const y = p.map((pi, i) => (i % 3 === 0 ? 1 : 0));
    const ci = bootstrapBrierCi(p, y, { B: 30, seed: 2 });
    expect(ci.point).toBeGreaterThan(0);
    expect(ci.lower).toBeLessThanOrEqual(ci.upper);
  });

  it("map grid band", () => {
    const scores = Array.from({ length: 40 }, (_, i) => 0.2 + i * 0.015);
    const outcomes = scores.map((s, i) => (i > 20 ? 1 : 0));
    const band = bootstrapMapGrid(
      scores,
      outcomes,
      (s, y) => {
        const rate = y.reduce((a, b) => a + b, 0) / Math.max(1, y.length);
        return () => rate;
      },
      [0.3, 0.5, 0.7],
      { B: 15, seed: 3 },
    );
    expect(band.median).toHaveLength(3);
    expect(band.note).toMatch(/Stationary/);
  });
});

describe("EB tau", () => {
  it("clamps and moment matches", () => {
    expect(clampTau(0.01)).toBe(TAU_MIN);
    expect(clampTau(5)).toBe(TAU_MAX);
    const fit = fitEmpiricalBayesTau([
      { groupKey: "a", residualMean: 0.15, n: 30 },
      { groupKey: "b", residualMean: -0.12, n: 30 },
    ]);
    expect(fit.tau).toBeGreaterThanOrEqual(TAU_MIN);
    expect(fit.tau).toBeLessThanOrEqual(TAU_MAX);
  });
});

describe("conformal residual explore", () => {
  it("threshold from residuals", () => {
    const r = [0.1, 0.2, 0.05, 0.4, 0.15];
    expect(splitConformalResidualThreshold(r, 0.1)).toBeGreaterThan(0);
    expect(residualNonconformity(0.7, 1)).toBeCloseTo(0.3);
  });
});
