import { describe, expect, it } from "vitest";

import {
  ENABLED,
  applyPitMap,
  empiricalPitMap,
  forecastAdvantageMeasure,
  kellyBitsPerBet,
  meetsDeployGate,
  pitValues,
} from "@/lib/calibration/1904-02855v1-gp-pit-recalibration";

describe("GP-PIT probabilistic recalibration", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("calibrated forecaster has a near-identity PIT map", () => {
    // PITs ~ Uniform(0,1): the empirical map should hug the identity.
    const pits = Array.from({ length: 2001 }, (_, i) => i / 2000);
    const grid = [0.1, 0.25, 0.5, 0.75, 0.9];
    const map = empiricalPitMap(pits, grid);
    grid.forEach((g, i) => expect(map[i]).toBeCloseTo(g, 1));
  });

  it("applyPitMap corrects a biased forecaster toward uniformity", () => {
    // Forecaster is overconfident: PITs cluster at 0 and 1.
    const calibPits = [
      ...Array.from({ length: 400 }, (_, i) => 0.02 + (i / 400) * 0.06),
      ...Array.from({ length: 400 }, (_, i) => 0.92 + (i / 400) * 0.06),
    ];
    const grid = Array.from({ length: 101 }, (_, i) => i / 100);
    const map = empiricalPitMap(calibPits, grid);
    const raw = [0.05, 0.5, 0.95];
    const recal = applyPitMap(raw, grid, map);
    // PIT 0.05 maps near 0.25 (half the mass sits below ~0.08), 0.95 near 0.75.
    expect(recal[0]).toBeGreaterThan(raw[0]);
    expect(recal[2]).toBeLessThan(raw[2]);
    expect(recal[1]).toBeCloseTo(0.5, 1);
  });

  it("FAM computes the deploy gate", () => {
    const raw = Array.from({ length: 500 }, () => 0);
    const recal = Array.from({ length: 500 }, (_, i) => (i % 2 === 0 ? 0.3 : 0.16));
    const { dSbar, fam } = forecastAdvantageMeasure(recal, raw);
    expect(dSbar).toBeCloseTo(0.23, 10);
    expect(fam).toBeGreaterThan(2.0);
    expect(meetsDeployGate(fam)).toBe(true);
    expect(meetsDeployGate(1.9)).toBe(false);
    expect(kellyBitsPerBet(dSbar)).toBeCloseTo(0.23, 10);
  });

  it("pitValues clips degenerate CDF outputs", () => {
    const pits = pitValues([0, 10], (y) => (y < 5 ? 0 : 1));
    expect(pits[0]).toBeGreaterThan(0);
    expect(pits[1]).toBeLessThan(1);
  });
});
