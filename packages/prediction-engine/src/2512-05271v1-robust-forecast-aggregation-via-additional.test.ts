/**
 * Vitest suite for arXiv:2512.05271v1 (Robust Forecast Aggregation via Additional Queries).
 * Gate: ADOPT structured model interrogation if adding difference-query features improves 2025 walk-forward log-loss by >=0.003 over base-forecast aggregation (DM p<0.05) AND the overlap diagnostic's redundancy calls are confirmed by ablation, with a cost veto if inference cost >5x.
 */
import { describe, it, expect } from "vitest";
import { perturbationSensitivity, overlapPrune } from "./2512-05271v1-robust-forecast-aggregation-via-additional";

describe("2512-05271v1 structured model interrogation", () => {
  it("measures perturbation sensitivity", () => {
    expect(perturbationSensitivity({ component: "c", perturbation: "qb-out", pBase: 0.6, pPerturbed: 0.45 })).toBeCloseTo(0.15, 10);
  });
  it("prunes the redundant component, keeping the lower-loss one", () => {
    const errors = [
      [0.1, -0.2, 0.15, -0.1],
      [0.1, -0.2, 0.15, -0.1], // near-duplicate of comp 0
      [0.25, 0.3, -0.25, -0.3], // independent of comp 0
    ];
    const kept = overlapPrune(["a", "b", "c"], errors, [0.2, 0.25, 0.3], 0.9);
    expect(kept).toContain("a");
    expect(kept).not.toContain("b");
    expect(kept).toContain("c");
    expect(() => overlapPrune(["a"], [[1], [2]], [0.1], 0.9)).toThrow();
  });
});
