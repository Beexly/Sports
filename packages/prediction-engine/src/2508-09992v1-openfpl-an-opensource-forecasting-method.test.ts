/**
 * Vitest suite for arXiv:2508.09992v1 (OpenFPL: An Open-Source Forecasting Method Rivaling State-of-the-Art Fantasy Premier League Services).
 * Gate: ADAPT if Test 1 passes (beats baselines overall and on ceiling games); REJECT if it can't beat GSE's existing projections on 2024 holdout or the ceiling-weighting trick doesn't transfer.
 */
import { describe, it, expect } from "vitest";
import { horizonEnsemble, entropyBinWeights, teamSplitFolds } from "./2508-09992v1-openfpl-an-opensource-forecasting-method";

describe("2508-09992v1 OpenFPL projection recipe", () => {
  it("averages horizon windows", () => {
    expect(horizonEnsemble([[10, 20], [14, 16], [12, 18]])).toEqual([12, 18]);
    expect(() => horizonEnsemble([])).toThrow();
  });
  it("upweights high-entropy (high-ceiling) outcomes", () => {
    const w = entropyBinWeights(
      [[0.9, 0.05, 0.05], [0.34, 0.33, 0.33]],
      2,
    );
    expect(w[1]).toBeGreaterThan(w[0] ?? 0);
    expect(w[0]).toBeGreaterThanOrEqual(1);
    expect(() => entropyBinWeights([[0.5]], -1)).toThrow();
  });
  it("splits by team, not by game", () => {
    const folds = teamSplitFolds(["A", "B", "A", "C", "B"], 2);
    expect(folds.get("A")).toBe(folds.get("A"));
    expect(new Set(folds.values()).size).toBe(2);
    expect(() => teamSplitFolds(["A"], 1)).toThrow();
  });
});
