/**
 * Vitest suite for arXiv:2604.13861v2 (Simulation-Based Optimisation of Batting Order and Bowling Plans in T20 Cricket).
 * Gate: ADAPT the framework if the NFL port's James–Stein-shrunk situation profiles beat raw MLE on held-out 2026 drives with ≥5% lower Brier score AND a 200-play audit sample shows ≥80% agreement between the engine's 4th-down recommendations and a published benchmark.
 */
import { describe, it, expect } from "vitest";
import { jamesSteinShrink, brierScore, auditAgreement, decisionEV } from "./2604-13861v2-simulationbased-optimisation-of-batting-order";

describe("2604-13861v2 simulation-optimization decisions", () => {
  it("James-Stein shrinks noisy situations toward the grand mean", () => {
    const means = [0.9, 0.1, 0.5, 0.55, 0.45];
    const shrunk = jamesSteinShrink(means, [0.2, 0.2, 0.2, 0.2, 0.2]);
    expect(shrunk[0]).toBeLessThan(0.9);
    expect(shrunk[1]).toBeGreaterThan(0.1);
    expect(() => jamesSteinShrink([0.5, 0.6], [0.1, 0.1])).toThrow();
  });
  it("Brier score prefers the sharper forecaster", () => {
    const y: (0 | 1)[] = [1, 0, 1, 1, 0];
    expect(brierScore([0.9, 0.1, 0.8, 0.7, 0.2], y)).toBeLessThan(
      brierScore([0.5, 0.5, 0.5, 0.5, 0.5], y),
    );
    expect(() => brierScore([], [])).toThrow();
  });
  it("audit agreement and decision EV", () => {
    expect(auditAgreement(["go", "punt", "go"], ["go", "go", "go"])).toBeCloseTo(2 / 3, 10);
    expect(decisionEV(new Map([["go", 0.5], ["punt", 0.3]]))).toEqual({ action: "go", ev: 0.5 });
    expect(() => auditAgreement(["go"], [])).toThrow();
    expect(() => decisionEV(new Map())).toThrow();
  });
});
