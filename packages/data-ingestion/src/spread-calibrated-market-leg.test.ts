/**
 * Tests for ./spread-calibrated-market-leg (arXiv:1412.0248v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT the spread-calibrated market leg + tuned ensemble weights if the walk-forward shows the
 * tuned ensemble beats both standalone legs on log-loss in >=6 of 9 held-out seasons with no
 * season worse by >0.01.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./spread-calibrated-market-leg";

describe("spread-calibrated market leg (arXiv:1412.0248v1)", () => {
  it("de-vig splits the overround", () => {
    expect(mod.devigHomeProb(2.0, 2.0)).toBeCloseTo(0.5, 10);
    expect(mod.devigHomeProb(1.5, 3.0)!).toBeGreaterThan(0.5);
    expect(mod.devigHomeProb(1.0, 2.0)).toBeNull();
  });
  it("logit market leg is monotone in spread-implied p", () => {
    const a = mod.logitMarketProb(0.4, 0, 1)!;
    const b = mod.logitMarketProb(0.6, 0, 1)!;
    expect(b).toBeGreaterThan(a);
    expect(mod.logitMarketProb(0.6, 0, 1)).toBeCloseTo(0.6, 10);
    expect(mod.logitMarketProb(0, 0, 1)).toBeNull();
  });
  it("blendLegs interpolates", () => {
    expect(mod.blendLegs(0.7, 0.5, 0.5)).toBeCloseTo(0.6, 10);
    expect(mod.blendLegs(0.7, 0.5, 2)).toBeNull();
  });
  it("grid search picks the better weight", () => {
    const pm = [0.9, 0.9, 0.1, 0.1];
    const pd = [0.5, 0.5, 0.5, 0.5];
    const ys = [1, 1, 0, 0];
    expect(mod.gridSearchMarketWeight(pm, pd, ys)).toBe(1);
  });
  it("perfect picker win rate", () => {
    expect(mod.perfectPickerWinRate([0.9, 0.9, 0.6, 0.6])).toBeCloseTo(0.75, 10);
    expect(mod.perfectPickerWinRate([])).toBeNull();
  });
  it("logLoss sane", () => {
    expect(mod.logLoss([1, 0], [1, 0])).toBeLessThan(0.01);
    expect(mod.logLoss([0.5, 0.5], [1, 0])).toBeCloseTo(Math.log(2), 10);
    expect(mod.logLoss([0.5], [2])).toBeNull();
  });
});
