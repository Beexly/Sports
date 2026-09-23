/**
 * Tests for ./2410-05431v2-mixed (arXiv:2410.05431v2, lane=mixed).
 *
 * ACCEPTANCE GATE: ADOPT the continuous-trajectory forecaster if, on 2024, its CRPS at 30- and 60-minute leads beats
 * the per-horizon baselines by ≥5% AND sampled trajectories are monotone-coherent (no lead-time
 * crossing artifacts in ≥95% of sampled members).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2410-05431v2-mixed";

describe("ensemble combination (arXiv:2410.05431v2)", () => {
  it("blends ensembles with normalized weights", () => {
    expect(mod.blendEnsemble([[1, 2], [3, 4]], [1, 1])).toEqual([2, 3]);
    expect(mod.blendEnsemble([[1, 2], [3, 4]], [3, 1])).toEqual([1.5, 2.5]);
    expect(mod.blendEnsemble([[1]], [0])).toBeNull();
    expect(mod.blendEnsemble([[1], [1, 2]], [1, 1])).toBeNull();
  });

  it("derives inverse-variance weights", () => {
    const w = mod.inverseVarianceWeights([1, 4])!;
    expect(w[0]).toBeCloseTo(0.8, 10);
    expect(w[1]).toBeCloseTo(0.2, 10);
    expect(w[0]! + w[1]!).toBeCloseTo(1, 10);
    expect(mod.inverseVarianceWeights([1, 0])).toBeNull();
  });

  it("blends ranks", () => {
    expect(mod.rankBlend([[1, 2], [2, 1]])).toEqual([1.5, 1.5]);
    expect(mod.rankBlend([])).toBeNull();
  });
});
