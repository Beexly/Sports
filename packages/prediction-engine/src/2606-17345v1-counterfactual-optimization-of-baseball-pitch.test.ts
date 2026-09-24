/**
 * Vitest suite for arXiv:2606.17345v1 (Counterfactual Optimization of Baseball Pitch Sequences and Estimation of Its Impact on Season-Level Statistics).
 * Gate: ADAPT the framework if, on the nflverse 4th-down test: (a) the per-coach optimal-vs-actual output gap correlates with season EPA/drive at |r| ≥ 0.5 on the held-out 2025 window, and (b) the estimated Δwin upper bound is stable across two adjacent held-out windows (2024, 2025).
 */
import { describe, it, expect } from "vitest";
import { drPseudoOutcome, drCate } from "./2606-17345v1-counterfactual-optimization-of-baseball-pitch";

describe("2606-17345v1 DR-Learner heterogeneous effects", () => {
  it("pseudo-outcome is doubly robust at the truth", () => {
    // At true nuisances the pseudo-outcome averages to the CATE.
    const phi = drPseudoOutcome(1, 1, 0.7, 0.4, 0.5);
    expect(phi).toBeCloseTo(0.3 + (1 - 0.7) / 0.5, 10);
  });
  it("recovers a heterogeneous effect in the modifier", () => {
    const Y: number[] = [];
    const D: (0 | 1)[] = [];
    const X: number[][] = [];
    const Z: number[][] = [];
    for (let i = 0; i < 160; i++) {
      const x = (i % 16) / 16;
      const z = (i % 8) / 8; // modifier: travel distance bucket
      const d: 0 | 1 = i % 2 === 0 ? 1 : 0;
      const tau = 0.05 + 0.1 * z;
      X.push([1, x]);
      Z.push([z]);
      D.push(d);
      Y.push(0.5 + tau * d + 0.2 * x + ((i * 31) % 9 - 4) * 0.002);
    }
    const beta = drCate(Y, D, X, Z, 4);
    expect(beta[0]).toBeCloseTo(0.05, 1); // intercept ~ mean effect at z=0
    expect(beta[1]).toBeGreaterThan(0.02); // positive heterogeneity slope
    expect(() => drCate([], [], [], [], 2)).toThrow();
  });
});
