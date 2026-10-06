import { describe, it, expect } from "vitest";
import {
  klDivergence,
  tiltWeights,
  weightedCvar,
  robustCvarKl,
  nominalCvar,
} from "@/lib/calibration/distribution-shift-cvar";

// ============================================================
// arXiv 2509.08744 — distributionally robust CVaR. Additive.
// ============================================================

describe("distribution-shift CVaR — 2509.08744", () => {
  it("klDivergence is 0 for identical distributions", () => {
    expect(klDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 10);
    expect(klDivergence([1, 0], [0.5, 0.5])).toBeCloseTo(Math.log(2), 10);
    expect(klDivergence([1, 0], [0, 1])).toBe(Number.POSITIVE_INFINITY);
  });

  it("tiltWeights sum to 1 and favor large losses", () => {
    const w = tiltWeights([0, 10], 1);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[1]!).toBeGreaterThan(w[0]!);
  });

  it("weightedCvar with uniform weights matches nominal CVaR", () => {
    const losses = [5, 1, 4, 2];
    const u = [0.25, 0.25, 0.25, 0.25];
    expect(weightedCvar(losses, u, 0.5)).toBeCloseTo(
      nominalCvar(losses, 0.5),
      10,
    );
  });

  it("robustCvarKl >= nominal CVaR by construction", () => {
    const losses = [1, 5, 2, 6, 3, 4];
    const robust = robustCvarKl(losses, 0.25, 0.1);
    expect(robust).toBeGreaterThanOrEqual(nominalCvar(losses, 0.25) - 1e-9);
  });

  it("robustCvarKl grows with rho", () => {
    const losses = [1, 5, 2, 6, 3, 4];
    expect(robustCvarKl(losses, 0.25, 1)).toBeGreaterThanOrEqual(
      robustCvarKl(losses, 0.25, 0.001),
    );
  });

  it("robustCvarKl is 0 on empty input", () => {
    expect(robustCvarKl([], 0.25, 0.1)).toBe(0);
  });

  it("nominalCvar takes the worst tau-fraction", () => {
    expect(nominalCvar([1, 5, 2, 4], 0.25)).toBeCloseTo(5, 10);
    expect(nominalCvar([], 0.25)).toBe(0);
  });
});
