/**
 * Vitest suite for arXiv:2604.01318v1 (ViTs for Action Classification in Videos: An Approach to Risky Tackle Detection in American Football Practice Videos).
 * Gate: ADAPT the training recipe (not the dataset) if, on an NFL penalty-event pilot (≥300 labeled clips, ≥30% positive class), the ViViT + focal-loss + Taguchi-augmentation protocol achieves event recall ≥ 0.65 with untouched validation folds.
 */
import { describe, it, expect } from "vitest";
import { focalLossB, taguchiConfig, eventRecall, bestTaguchiRun, TAGUCHI_L4 } from "./2604-01318v1-vits-for-action-classification-in";

describe("2604-01318v1 ViViT penalty-event training recipe", () => {
  it("focal loss downweights easy examples", () => {
    expect(focalLossB(0.9, 1, 2, 0.5)).toBeLessThan(focalLossB(0.6, 1, 2, 0.5));
    expect(() => focalLossB(0.5, 1, -1, 0.5)).toThrow();
  });
  it("Taguchi L4 covers the orthogonal runs", () => {
    expect(TAGUCHI_L4).toHaveLength(4);
    expect(taguchiConfig(0, [0.1, 0.5])).toEqual({ crop: 0.1, flip: 0.1, jitter: 0.1 });
    expect(taguchiConfig(3, [0.1, 0.5])).toEqual({ crop: 0.5, flip: 0.5, jitter: 0.1 });
    expect(() => taguchiConfig(4 as 0, [0.1, 0.5])).toThrow();
  });
  it("event recall and best-run selection", () => {
    const scores = [0.9, 0.3, 0.8, 0.2];
    const labels: (0 | 1)[] = [1, 0, 1, 0];
    expect(eventRecall(scores, labels, 0.5)).toBe(1);
    expect(eventRecall(scores, labels, 0.95)).toBe(0);
    expect(bestTaguchiRun([0.6, 0.7, 0.65, 0.8])).toBe(3);
    expect(() => eventRecall([0.5], [1, 0], 0.5)).toThrow();
  });
});
