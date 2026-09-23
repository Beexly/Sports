/**
 * Tests for ./2501-08710v2-calibration (arXiv:2501.08710v2, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt the architecture if, on 2024–2025 walk-forward, the disentangled multi-task model beats the non-disentangled shared-encoder baseline by ≥0.003 Brier (win prob) or ≥0.1 points MAE vs. close on spread/total, AND achieves MIG ≥ 2× the baseline's.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2501-08710v2-calibration";

describe("2501-08710v2 Disentangled Interleaving Variational Encoding", () => {
  it("brier score is 0 for perfect forecasts", () => {
    expect(mod.brierScore([1, 0, 1], [1, 0, 1])).toBeCloseTo(0, 10);
    expect(mod.brierScore([0.5, 0.5], [1, 0])).toBeCloseTo(0.25, 10);
    expect(mod.brierScore([0.5], [2])).toBeNull();
  });
  it("log-loss is ~0 for confident correct forecasts", () => {
    expect(mod.logLoss([1], [1])).toBeCloseTo(0, 6);
    expect(mod.logLoss([0.5], [1])).toBeCloseTo(Math.LN2, 10);
  });
  it("ece on a two-point example", () => {
    expect(mod.ece([0.1, 0.9], [0, 1], 2)).toBeCloseTo(0.1, 10);
    expect(mod.ece([0.4, 0.6], [1, 0], 2)).toBeCloseTo(0.6, 10);
  });
  it("PAV returns a non-decreasing fit", () => {
    expect(mod.poolAdjacentViolators([3, 1, 2])).toEqual([2, 2, 2]);
    const fit = mod.poolAdjacentViolators([1, 3, 2, 4])!;
    for (let i = 1; i < fit.length; i++) expect(fit[i]).toBeGreaterThanOrEqual(fit[i - 1]!);
    expect(mod.poolAdjacentViolators([])).toBeNull();
  });
});
