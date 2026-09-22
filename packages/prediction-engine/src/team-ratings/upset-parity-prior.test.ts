
import { describe, expect, it } from "vitest";
import { expectedUpsets, shrinkToParity, upsetParityPrior } from "./upset-parity-prior";

describe("upset-parity-prior", () => {
  it("prior is 0.5 at pick'em and decays", () => {
    expect(upsetParityPrior(0)).toBeCloseTo(0.5, 12);
    expect(upsetParityPrior(200)).toBeLessThan(upsetParityPrior(100));
    expect(upsetParityPrior(-50)).toBeCloseTo(0.5, 12); // underdog's perspective symmetric
  });
  it("shrinkage pulls extreme model probs toward parity", () => {
    const s = shrinkToParity(0.05, 0, 0.5);
    expect(s).toBeCloseTo(0.275, 10);
    expect(shrinkToParity(0.4, 0, 0)).toBeCloseTo(0.4, 12);
  });
  it("expectedUpsets sums the slate", () => {
    expect(expectedUpsets([0, 0])).toBeCloseTo(1, 12);
  });
  it("edge cases throw", () => {
    expect(() => upsetParityPrior(10, 0)).toThrow();
    expect(() => shrinkToParity(0.5, 10, 2)).toThrow();
  });
});
