import { describe, it, expect } from "vitest";
import {
  fitStrengths,
  solveLinear,
  signedResiduals,
  cpdCdf,
  cpdMoneylineProb,
  cpdSpreadCoverProb,
  expectedMov,
} from "@/lib/calibration/cpd-win-probability";

// ============================================================
// arXiv 2208.08598 — CPD win-probability head. Additive only.
// ============================================================

describe("CPD win probability — 2208.08598", () => {
  const games = [
    { home: "A", away: "B", mov: 7 },
    { home: "B", away: "A", mov: -3 },
    { home: "A", away: "C", mov: 10 },
    { home: "C", away: "B", mov: 1 },
    { home: "B", away: "C", mov: -2 },
    { home: "C", away: "A", mov: -6 },
  ];

  it("solveLinear solves a 2x2 system", () => {
    expect(solveLinear([[2, 0], [0, 3]], [4, 9])).toEqual([2, 3]);
  });

  it("solveLinear returns zeros on singular input", () => {
    expect(solveLinear([[0, 0], [0, 0]], [1, 2])).toEqual([0, 0]);
  });

  it("fitStrengths recovers the team ordering and zero-sum thetas", () => {
    const fit = fitStrengths(games);
    expect(fit.theta["A"]!).toBeGreaterThan(fit.theta["B"]!);
    const sum = Object.values(fit.theta).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0, 8);
  });

  it("fitStrengths handles empty input", () => {
    expect(fitStrengths([])).toEqual({ mu: 0, theta: {} });
  });

  it("signedResiduals are near zero on a perfectly consistent league", () => {
    const g = [
      { home: "A", away: "B", mov: 4 },
      { home: "B", away: "A", mov: -4 },
    ];
    const fit = fitStrengths(g);
    const r = signedResiduals(g, fit);
    expect(Math.max(...r.map(Math.abs))).toBeLessThan(1e-6);
  });

  it("cpdMoneylineProb is 0.5 for a pick'em with symmetric residuals", () => {
    const resid = [-3, -1, 1, 3].sort((a, b) => a - b);
    expect(cpdMoneylineProb(resid, 0)).toBeCloseTo(0.5, 10);
  });

  it("cpdMoneylineProb favors the stronger home team", () => {
    const resid = [-3, -1, 1, 3].sort((a, b) => a - b);
    expect(cpdMoneylineProb(resid, 7)).toBeGreaterThan(0.5);
    expect(cpdMoneylineProb(resid, -7)).toBeLessThan(0.5);
  });

  it("cpdSpreadCoverProb is monotone decreasing in the line", () => {
    const resid = [-7, -3, -1, 1, 3, 7].sort((a, b) => a - b);
    const p1 = cpdSpreadCoverProb(resid, 3, 0);
    const p2 = cpdSpreadCoverProb(resid, 3, 7);
    expect(p2).toBeLessThan(p1);
  });

  it("cpdCdf interpolates between grid points", () => {
    const resid = [0, 10].sort((a, b) => a - b);
    expect(cpdCdf(resid, 0, 5)).toBeCloseTo(0.5, 10); // Hazen mid-rank
    expect(cpdCdf(resid, 0, -1)).toBe(0);
    expect(cpdCdf(resid, 0, 10)).toBe(1);
  });

  it("returns NaN on empty residual grids", () => {
    expect(cpdCdf([], 0, 0)).toBeNaN();
    expect(cpdMoneylineProb([], 0)).toBeNaN();
    expect(cpdSpreadCoverProb([], 0, 3)).toBeNaN();
  });

  it("expectedMov reads the fit", () => {
    const fit = fitStrengths(games);
    expect(expectedMov(fit, "A", "B")).toBeGreaterThan(0);
  });
});
