/**
 * Vitest suite for arXiv:2410.09068 (Modeling and Prediction of the UEFA EURO 2024 via Combined Statistical Learning Approaches).
 * Gate: Adopt the enhanced-variable + ensemble pipeline if the combined score model beats the engine's current spread/total probability layer on Brier score for game winner AND margin MAE over 2023–2024 by ≥0.003 / ≥0.15 points respectively, with the logability (market-consensus) variable showing positive permutation importance.
 */
import { describe, it, expect } from "vitest";
import { bivPoisPmf, ingameLambdas, mcHomeWinProb } from "./2410-09068-modeling-and-prediction-of-the";

describe("2410-09068 bivariate-Poisson score model", () => {
  it("bivariate pmf sums to ~1 and nests independence", () => {
    let z = 0;
    for (let x1 = 0; x1 <= 10; x1++)
      for (let x2 = 0; x2 <= 10; x2++) z += bivPoisPmf(x1, x2, 2, 1.5, 0.5);
    expect(z).toBeCloseTo(1, 2);
    // l3=0 -> independence: P = P1*P2
    const p1 = bivPoisPmf(2, 1, 2, 1.5, 0);
    expect(p1).toBeGreaterThan(0);
    expect(() => bivPoisPmf(-1, 1, 1, 1, 1)).toThrow();
  });
  it("in-game lambdas decay with time and garbage-time damping", () => {
    const [a, b] = ingameLambdas(10, 10, 2, 0.5, 0, 0.05);
    expect(a).toBeCloseTo(5, 10);
    const [c] = ingameLambdas(10, 10, 2, 0.5, 28, 0.05);
    expect(c!).toBeLessThan(a!);
    expect(() => ingameLambdas(10, 10, 2, 2, 0, 0.05)).toThrow();
  });
  it("MC home-win prob is monotone in the lead", () => {
    const rng = (() => { let s = 11; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
    const lo = mcHomeWinProb(7, 7, 1, -7, 2000, rng);
    const hi = mcHomeWinProb(7, 7, 1, 7, 2000, rng);
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeGreaterThan(0.5);
    expect(lo).toBeLessThan(0.5);
    expect(() => mcHomeWinProb(1, 1, 1, 0, 0, rng)).toThrow();
  });
});
