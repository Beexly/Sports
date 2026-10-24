import { describe, expect, it } from "vitest";
import { gaussianNeighborWeights, perplexity } from "./neighbor-conditional.js";

describe("neighbor conditional", () => {
  it("puts more weight on the nearer neighbor", () => {
    const weights = gaussianNeighborWeights([0.5, 2], 1);
    expect(weights[0]).toBeGreaterThan(weights[1]);
    expect(weights[0] + weights[1]).toBeCloseTo(1);
    expect(perplexity([0.5, 0.5])).toBeCloseTo(2);
    expect(gaussianNeighborWeights([0, 1], 1)).toEqual([0, 1]);
  });
});
