import { describe, it, expect } from "vitest";
import {
  dixonColesTau,
  dixonColesJointMatrix,
  moneylineProbabilities,
  moneylineProbabilitiesDC,
  overUnderProbabilitiesDC,
  jointScoreMatrix,
  DIXON_COLES_REFERENCE_RHO,
} from "../poisson.js";

// Typical soccer scoring rates.
const LH = 1.6;
const LA = 1.1;

describe("Dixon–Coles low-score correction", () => {
  it("τ is 1 everywhere except the four low-score cells", () => {
    expect(dixonColesTau(2, 3, LH, LA, -0.05)).toBe(1);
    expect(dixonColesTau(0, 2, LH, LA, -0.05)).toBe(1);
    expect(dixonColesTau(3, 0, LH, LA, -0.05)).toBe(1);
    expect(dixonColesTau(2, 2, LH, LA, -0.05)).toBe(1);
  });

  it("τ matches the Dixon–Coles formula on the four corrected cells", () => {
    const rho = -0.05;
    expect(dixonColesTau(0, 0, LH, LA, rho)).toBeCloseTo(1 - LH * LA * rho, 10);
    expect(dixonColesTau(0, 1, LH, LA, rho)).toBeCloseTo(1 + LH * rho, 10);
    expect(dixonColesTau(1, 0, LH, LA, rho)).toBeCloseTo(1 + LA * rho, 10);
    expect(dixonColesTau(1, 1, LH, LA, rho)).toBeCloseTo(1 - rho, 10);
  });

  it("τ is clamped at 0 for an out-of-range ρ (never negative)", () => {
    // A large positive ρ drives the (0,0) term negative before clamping.
    expect(dixonColesTau(0, 0, LH, LA, 5)).toBe(0);
  });

  it("the adjusted grid renormalises to 1 with no negative cells", () => {
    const m = dixonColesJointMatrix(LH, LA, DIXON_COLES_REFERENCE_RHO, 12);
    const sum = m.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
    expect(sum).toBeCloseTo(1, 6);
    for (const row of m) for (const v of row) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("ρ = 0 reproduces independent Poisson (renormalised over the grid)", () => {
    const ind = moneylineProbabilities(LH, LA, 12);
    const dc0 = moneylineProbabilitiesDC(LH, LA, 0, 12);
    expect(dc0.home).toBeCloseTo(ind.home / ind.coverage, 6);
    expect(dc0.draw).toBeCloseTo(ind.draw / ind.coverage, 6);
    expect(dc0.away).toBeCloseTo(ind.away / ind.coverage, 6);
    expect(dc0.coverage).toBeCloseTo(1, 6);
  });

  it("negative ρ lifts the draw probability (the observed low-score bias)", () => {
    const base = moneylineProbabilitiesDC(LH, LA, 0, 12);
    const dc = moneylineProbabilitiesDC(LH, LA, DIXON_COLES_REFERENCE_RHO, 12);
    expect(dc.draw).toBeGreaterThan(base.draw);
  });

  it("negative ρ lifts P(0,0) and P(1,1) and lowers P(0,1)/P(1,0)", () => {
    const raw = jointScoreMatrix(LH, LA, 12);
    const rawSum = raw.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);
    const ind = raw.map((r) => r.map((v) => v / rawSum));
    const dc = dixonColesJointMatrix(LH, LA, DIXON_COLES_REFERENCE_RHO, 12);
    expect(dc[0]![0]!).toBeGreaterThan(ind[0]![0]!);
    expect(dc[1]![1]!).toBeGreaterThan(ind[1]![1]!);
    expect(dc[0]![1]!).toBeLessThan(ind[0]![1]!);
    expect(dc[1]![0]!).toBeLessThan(ind[1]![0]!);
  });

  it("over/under DC probabilities form a normalised distribution", () => {
    const ou = overUnderProbabilitiesDC(LH, LA, DIXON_COLES_REFERENCE_RHO, 2.5, 12);
    expect(ou.over + ou.under + ou.push).toBeCloseTo(1, 6);
    expect(ou.push).toBeCloseTo(0, 6); // 2.5 is a half-line — no push mass
  });
});
