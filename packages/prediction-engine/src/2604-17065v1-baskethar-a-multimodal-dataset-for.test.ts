/**
 * Vitest suite for arXiv:2604.17065v1 (BasketHAR: A Multimodal Dataset for Human Activity Recognition and Sport Analysis in Basketball Training Scenarios).
 * Gate: ADAPT the alignment method if a reimplementation on the public BasketHAR data reaches macro F1 ≥ 0.65 within a clean leave-one-chunk-out protocol; reject the method if macro F1 falls below 0.55 once window leakage is removed.
 */
import { describe, it, expect } from "vitest";
import { cosSim, infoNCELoss, leaveOneChunkOut, macroF1, ENABLED } from "./2604-17065v1-baskethar-a-multimodal-dataset-for";

describe("2604-17065v1 LoRA-ImageBind alignment recipe (disabled)", () => {
  it("cosine similarity and InfoNCE", () => {
    expect(cosSim([1, 0], [1, 0])).toBeCloseTo(1, 10);
    expect(cosSim([1, 0], [0, 1])).toBeCloseTo(0, 10);
    const loss = infoNCELoss([0.9, 0.1, 0.0], 0, 0.1);
    expect(loss).toBeLessThan(infoNCELoss([0.1, 0.9, 0.0], 0, 0.1));
    expect(() => infoNCELoss([0.5], 3, 0.1)).toThrow();
    expect(() => cosSim([1], [1, 2])).toThrow();
  });
  it("chunk folds and macro F1", () => {
    expect(leaveOneChunkOut(10, 5)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(macroF1(["a", "b", "a"], ["a", "b", "a"])).toBe(1);
    expect(macroF1(["a", "a"], ["a", "b"])).toBeLessThan(1);
    expect(() => leaveOneChunkOut(0, 5)).toThrow();
    expect(() => macroF1([], [])).toThrow();
  });
  it("is disabled pending pretrained encoders and a training run", () => {
    expect(ENABLED).toBe(false);
  });
});
