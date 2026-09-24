
import { describe, expect, it } from "vitest";
import { decisionWeightedPinballLoss, decisionWeightsFromEdge, pinballLoss } from "./decision-weighted-pinball";

describe("decision-weighted-pinball", () => {
  it("pinball at the median is half the absolute error", () => {
    expect(pinballLoss(3, 1, 0.5)).toBeCloseTo(1, 10);
    expect(pinballLoss(1, 3, 0.5)).toBeCloseTo(1, 10);
  });
  it("weights the loss toward high-edge quantiles", () => {
    const base = { y: 10, quantiles: [9, 12], alphas: [0.5, 0.5] };
    const tailHeavy = decisionWeightedPinballLoss({ ...base, weights: [0.9, 0.1] });
    const uniform = decisionWeightedPinballLoss({ ...base, weights: [0.5, 0.5] });
    // q=9 errs by 1, q=12 errs by 2 -> tail-heavy on the good quantile lowers loss
    expect(tailHeavy).toBeLessThan(uniform);
  });
  it("reduces to plain mean pinball under uniform weights", () => {
    const loss = decisionWeightedPinballLoss({ y: 5, quantiles: [4, 6], alphas: [0.5, 0.5], weights: [1, 1] });
    expect(loss).toBeCloseTo((pinballLoss(5, 4, 0.5) + pinballLoss(5, 6, 0.5)) / 2, 10);
  });
  it("decisionWeightsFromEdge normalizes positive edges, uniform on empty", () => {
    expect(decisionWeightsFromEdge([2, 1, -5])).toEqual([2 / 3, 1 / 3, 0]);
    expect(decisionWeightsFromEdge([-1, -2])).toEqual([0.5, 0.5]);
    expect(decisionWeightsFromEdge([])).toEqual([]);
  });
  it("edge cases: empty quantiles -> 0; misaligned inputs throw", () => {
    expect(decisionWeightedPinballLoss({ y: 1, quantiles: [], alphas: [], weights: [] })).toBe(0);
    expect(() => decisionWeightedPinballLoss({ y: 1, quantiles: [1], alphas: [0.5], weights: [] })).toThrow();
    expect(() => pinballLoss(1, 2, 1.5)).toThrow();
  });
});
