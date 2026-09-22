import { describe, expect, it } from "vitest";
import {
  binomialTwoSided,
  logisticFit,
  normalCdf,
  otAnalogGate,
  type OtTeamGame,
} from "./ot-analog-tests-2510.js";

describe("ot analog tests", () => {
  it("binomial flags a real deviation from 50%", () => {
    const sig = binomialTwoSided(65, 100, 0.5);
    expect(sig.pValue).toBeLessThan(0.05);
    expect(sig.significantAt5).toBe(true);
    const null_ = binomialTwoSided(52, 100, 0.5);
    expect(null_.significantAt5).toBe(false);
  });

  it("logistic fit recovers a positive slope with Wald significance", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i++) {
      const x = (i % 40) / 10 - 2;
      const p = 1 / (1 + Math.exp(-2 * x)); // true slope 2
      const u = (i * 0.61803398875) % 1; // deterministic quasi-random draw
      X.push([1, x]);
      y.push(u < p ? 1 : 0);
    }
    const fit = logisticFit(X, y);
    expect(fit.converged).toBe(true);
    expect(fit.coefficients[1] ?? 0).toBeGreaterThan(0);
    expect(fit.pValues[1] ?? 1).toBeLessThan(0.05);
  });

  it("gate adopts when first possession dominates after Elo control", () => {
    const rows: OtTeamGame[] = [];
    for (let i = 0; i < 60; i++) {
      // first-possession team wins 45/60 with varying Elo diff: real effect
      const elo = ((i * 7) % 11) - 5;
      rows.push({ won: i < 45, hadFirstPossession: true, eloDiff: elo });
      rows.push({ won: i >= 45, hadFirstPossession: false, eloDiff: -elo });
    }
    const d = otAnalogGate(rows);
    expect(d.binomial.significantAt5).toBe(true);
    expect(d.firstPossessionPValue).toBeLessThan(0.05);
    expect(d.adoptAdjustment).toBe(true);
  });

  it("gate rejects a null sample", () => {
    const rows: OtTeamGame[] = [];
    for (let i = 0; i < 50; i++) {
      rows.push({ won: i % 2 === 0, hadFirstPossession: true, eloDiff: (i % 5) - 2 });
      rows.push({ won: i % 2 === 1, hadFirstPossession: false, eloDiff: 2 - (i % 5) });
    }
    const d = otAnalogGate(rows);
    expect(d.adoptAdjustment).toBe(false);
  });

  it("normalCdf sanity", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
  });

  it("handles empty and malformed input", () => {
    const d = otAnalogGate([]);
    expect(d.adoptAdjustment).toBe(false);
    expect(Number.isNaN(d.binomial.pValue)).toBe(true);
    expect(binomialTwoSided(-1, 10).pValue).toSatisfy(Number.isNaN);
    const bad = logisticFit([], []);
    expect(bad.converged).toBe(false);
    const mismatch = logisticFit([[1, 2]], [1, 0, 1]);
    expect(mismatch.converged).toBe(false);
  });
});
