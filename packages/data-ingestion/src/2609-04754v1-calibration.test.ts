/**
 * Tests for ./2609-04754v1-calibration (arXiv:2609.04754v1, lane=calibration).
 *
 * ACCEPTANCE GATE: ADOPT the calibration-layer approach if, on the 2024-2025 test window: (a) the layer reduces mean |bias| per state-bucket by >=15% on totals without increasing overall RMSE vs the uncorrected engine, and (b) WFR_5 improves by >=2 percentage points; REJECT if RMSE increases on the test window or the bucketed bias reduction is <10%.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2609-04754v1-calibration";

describe("2609-04754v1 A Fairness Audit of the Duckworth-Lewis-Stern", () => {
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
