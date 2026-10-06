import { describe, expect, it } from "vitest";
import {
  OFFLINE_CEPT_BMA_FIXTURE,
  proposeCeptBmaWeights,
} from "./offline-cept-bma-weights";

describe("proposeCeptBmaWeights", () => {
  it("proposes weights that sum to ~1", () => {
    const r = proposeCeptBmaWeights(OFFLINE_CEPT_BMA_FIXTURE);
    expect(r.weights.length).toBe(4);
    expect(r.weightSum).toBeCloseTo(1, 5);
  });

  it("favors lower-loss experts", () => {
    const r = proposeCeptBmaWeights(OFFLINE_CEPT_BMA_FIXTURE, 0.05);
    expect(r.weights[0]!.expertId).toBe("market");
  });

  it("handles empty", () => {
    const r = proposeCeptBmaWeights([]);
    expect(r.weights).toEqual([]);
    expect(r.weightSum).toBe(0);
  });
});
