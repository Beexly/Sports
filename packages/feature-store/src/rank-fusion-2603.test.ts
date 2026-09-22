import { describe, expect, it } from "vitest";
import {
  rankSpaceFusion,
  rscWeights,
  scoreAverage,
  toRanks,
} from "./rank-fusion-2603.js";

describe("rank fusion", () => {
  it("toRanks ranks highest probability first with tie averaging", () => {
    expect(toRanks([0.2, 0.9, 0.5])).toEqual([3, 1, 2]);
    expect(toRanks([0.5, 0.5, 0.1])).toEqual([1.5, 1.5, 3]);
  });

  it("rsc weights upweight the contrarian model", () => {
    const r1 = [1, 2, 3, 4, 5];
    const r2 = [1, 2, 3, 4, 5];
    const r3 = [5, 4, 3, 2, 1]; // contrarian
    const w = rscWeights([r1, r2, r3]);
    expect(w[2] ?? 0).toBeGreaterThan(w[0] ?? 0);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 9);
  });

  it("fusion produces fused ranks and monotone probability map", () => {
    const models = [
      { model: "a", probs: [0.7, 0.3, 0.6, 0.4] },
      { model: "b", probs: [0.6, 0.4, 0.55, 0.45] },
    ];
    const train = [1, 0, 1, 0];
    const f = rankSpaceFusion(models, train);
    expect(f.fusedRanks.length).toBe(4);
    expect(Object.keys(f.weights)).toEqual(["a", "b"]);
    // game 0 has the best fused rank -> highest fused prob
    const best = f.fusedRanks.indexOf(Math.min(...f.fusedRanks));
    expect(f.fusedProbs[best]).toBeGreaterThanOrEqual(Math.max(...f.fusedProbs) - 1e-9);
  });

  it("scoreAverage matches plain averaging", () => {
    const avg = scoreAverage([
      { model: "a", probs: [0.8, 0.2] },
      { model: "b", probs: [0.6, 0.4] },
    ]);
    expect(avg[0]).toBeCloseTo(0.7, 9);
    expect(avg[1]).toBeCloseTo(0.3, 9);
  });

  it("handles empty input", () => {
    const f = rankSpaceFusion([]);
    expect(f.fusedRanks).toEqual([]);
    expect(scoreAverage([])).toEqual([]);
    expect(rscWeights([])).toEqual([]);
    expect(toRanks([])).toEqual([]);
  });

  it("handles single model and constant rankings", () => {
    const w = rscWeights([[1, 1, 1]]);
    expect(w).toEqual([1]);
    const f = rankSpaceFusion([{ model: "solo", probs: [0.5, 0.5] }]);
    expect(f.fusedProbs).toEqual([0.5, 0.5]);
  });
});
