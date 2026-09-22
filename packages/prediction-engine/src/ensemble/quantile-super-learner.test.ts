
import { describe, expect, it } from "vitest";
import { quantileLoss, quantileSuperLearner, qslMeanLoss } from "./quantile-super-learner";

describe("quantile-super-learner", () => {
  it("learns to favor the better candidate", () => {
    // candidate 0 is perfect, candidate 1 is biased
    const y = [1, 2, 3, 4, 5];
    const c0 = y.map((v) => [v]);
    const c1 = y.map((v) => [v + 2]);
    const w = quantileSuperLearner([c0, c1], y, [0.5], { iters: 800, lr: 0.5 });
    expect(w[0] ?? 0).toBeGreaterThan(0.8);
    const sum = w.reduce((s, x) => s + x, 0);
    expect(sum).toBeCloseTo(1, 8);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0);
  });
  it("weights stay on the simplex", () => {
    const y = [0, 1];
    const w = quantileSuperLearner([[[0], [0]], [[1], [1]]], y, [0.5], { iters: 50 });
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 8);
  });
  it("qslMeanLoss is zero for a perfect forecaster", () => {
    const y = [2, 3];
    expect(qslMeanLoss([y.map((v) => [v])], y, [0.5], [1])).toBeCloseTo(0, 10);
    expect(qslMeanLoss([], [], [0.5], [])).toBe(0);
  });
  it("quantileLoss matches the pinball definition", () => {
    expect(quantileLoss(5, 3, 0.9)).toBeCloseTo(1.8, 10);
    expect(quantileLoss(3, 5, 0.9)).toBeCloseTo(0.2, 10);
  });
  it("throws with no candidates", () => {
    expect(() => quantileSuperLearner([], [1], [0.5])).toThrow();
  });
});
