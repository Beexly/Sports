
import { describe, expect, it } from "vitest";
import { isProperTargetDist, marginalizeConditionalFirstDown, marginalizeConditionalTD } from "./conditional-td";

describe("conditional-td", () => {
  it("marginalizes P(TD) over the target distribution", () => {
    expect(marginalizeConditionalTD({ targetProbs: [0.5, 0.3, 0.2], tdGivenTarget: [0.1, 0.2, 0.05] }))
      .toBeCloseTo(0.05 + 0.06 + 0.01, 10);
  });
  it("collapses to the single-target rate when one receiver is certain", () => {
    expect(marginalizeConditionalTD({ targetProbs: [1, 0], tdGivenTarget: [0.3, 0.9] })).toBeCloseTo(0.3, 10);
  });
  it("first-down variant shares the decomposition", () => {
    expect(marginalizeConditionalFirstDown([0.5, 0.5], [0.4, 0.6])).toBeCloseTo(0.5, 10);
  });
  it("validates the target distribution", () => {
    expect(isProperTargetDist([0.5, 0.5])).toBe(true);
    expect(isProperTargetDist([0.5, 0.4])).toBe(false);
  });
  it("edge cases: empty -> 0; misaligned throws", () => {
    expect(marginalizeConditionalTD({ targetProbs: [], tdGivenTarget: [] })).toBe(0);
    expect(() => marginalizeConditionalTD({ targetProbs: [1], tdGivenTarget: [] })).toThrow();
  });
});
