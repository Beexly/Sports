import { describe, expect, it } from "vitest";
import { attentionWeights } from "./scaled-dot-product.js";

describe("scaled dot-product attention", () => {
  it("splits weight evenly across identical keys", () => {
    const weights = attentionWeights([1, 0], [[1, 0], [1, 0]]);
    expect(weights[0]).toBeCloseTo(0.5);
    expect(weights[1]).toBeCloseTo(0.5);
  });
});
