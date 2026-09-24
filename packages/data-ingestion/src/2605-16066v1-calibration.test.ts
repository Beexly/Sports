/**
 * Tests for ./2605-16066v1-calibration (arXiv:2605.16066v1, lane=calibration).
 *
 * ACCEPTANCE GATE: Accept into the engine lane if: (1) the kickoff-calibration objective is implemented and its identifiability fix (totals-equivalent market) documented; (2) held-out accuracy/RPS/log-loss reported against market-implied probabilities; (3) any profitability claim passes the goal-window-style timing control.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2605-16066v1-calibration";

describe("2605-16066v1 A Market-Calibrated Accelerated Failure Time Model", () => {
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
