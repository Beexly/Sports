/**
 * Vitest suite for arXiv:2602.23233v1 (The Counterfactual Combine: A Causal Framework for Player Evaluation).
 * Gate: ADOPT if the TMLE standardized kicker rate predicts held-out next-season FG% with RMSE >=10% lower than the raw empirical rate on the 2020-2024 -> 2025 window, AND >=80% of kickers' 95% CIs are well-behaved.
 */
import { describe, it, expect } from "vitest";
import { identifyStrategy, adjustmentEstimand, frontdoorEstimand, requireIdentified } from "./2602-23233v1-the-counterfactual-combine-a-causal";

describe("2602-23233v1 do-calculus engine", () => {
  it("picks the first applicable strategy", () => {
    expect(identifyStrategy(true, true, true)).toBe("adjustment");
    expect(identifyStrategy(false, true, true)).toBe("frontdoor");
    expect(identifyStrategy(false, false, true)).toBe("backdoor");
    expect(identifyStrategy(false, false, false)).toBe("unidentified");
  });
  it("adjustment estimand marginalizes over Z", () => {
    // E[Y|T=1] = 0.7*0.5 + 0.3*0.5 = 0.5
    expect(adjustmentEstimand([[0.6, 0.7], [0.4, 0.3]], [0.5, 0.5], 1)).toBeCloseTo(0.5, 10);
    expect(() => adjustmentEstimand([[0.5]], [0.5, 0.5], 0)).toThrow();
  });
  it("front-door composes mediator and treatment distributions", () => {
    const v = frontdoorEstimand([[0.8, 0.2], [0.2, 0.8]], [[0.5, 0.6], [0.4, 0.9]], [0.5, 0.5], 1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
    expect(() => frontdoorEstimand([], [[1]], [1], 0)).toThrow();
  });
  it("refuses unidentified queries", () => {
    expect(() => requireIdentified("unidentified")).toThrow();
    expect(() => requireIdentified("backdoor")).not.toThrow();
  });
});
