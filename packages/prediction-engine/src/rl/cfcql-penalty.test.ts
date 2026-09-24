
import { describe, expect, it } from "vitest";
import { cfcqlAgentLoss, counterfactualPenalty, lambdaPerAgent, lowerBoundHolds } from "./cfcql-penalty";

describe("cfcql-penalty", () => {
  it("penalizes only upward deviations from the historical stake value", () => {
    expect(counterfactualPenalty(1.5, 1.0, 2)).toBeCloseTo(1.0, 10);
    expect(counterfactualPenalty(0.5, 1.0, 2)).toBe(0);
    expect(counterfactualPenalty(1.0, 1.0, 2)).toBe(0);
  });
  it("adds the penalty to the squared TD error", () => {
    expect(cfcqlAgentLoss(0.5, 1.5, 1.0, 2)).toBeCloseTo(0.25 + 1.0, 10);
  });
  it("scales lambda as 1/nBets", () => {
    expect(lambdaPerAgent(4, 2)).toBeCloseTo(0.5, 10);
    expect(() => lambdaPerAgent(0, 1)).toThrow();
  });
  it("lower-bound diagnostic", () => {
    expect(lowerBoundHolds(0.8, 1.0)).toBe(true);
    expect(lowerBoundHolds(1.2, 1.0)).toBe(false);
  });
  it("rejects negative lambda", () => {
    expect(() => counterfactualPenalty(2, 1, -1)).toThrow();
  });
});
