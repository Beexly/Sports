/**
 * Tests for ./2607-11432v1-calibration (arXiv:2607.11432v1, lane=calibration).
 *
 * ACCEPTANCE GATE: ADOPT the multi-objective selection layer if on 2025 H1 the MOBT model achieves >=0.05 nats/comparison better test log-likelihood than the scalar BT baseline AND the Pareto-frontier filter on 2025 H2 yields posted-pick CLV >= the scalar-ranking baseline's CLV with no worse cover rate. REJECT if the incomparability labels are uninformative (MOBT ~= BT log-likelihood) or the comparison dataset has <500 usable pairs.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2607-11432v1-calibration";

describe("2607-11432v1 Generalizing Preference-based Reinforcement Learning: a Rationality", () => {
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
