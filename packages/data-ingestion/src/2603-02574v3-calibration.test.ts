/**
 * Tests for ./2603-02574v3-calibration (arXiv:2603.02574v3, lane=calibration).
 *
 * ACCEPTANCE GATE: ADOPT iff on 2023-2024 walk-forward it beats tuned-Elo Brier by >=0.004 absolute with ECE no worse than baseline in every probability bin and bootstrap CV < 2% for all 32 teams.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2603-02574v3-calibration";

describe("2603-02574v3 An Augmented Rating System for Test", () => {
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
