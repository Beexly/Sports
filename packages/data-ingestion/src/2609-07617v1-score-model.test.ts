/**
 * Tests for ./2609-07617v1-score-model (arXiv:2609.07617v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: Adopt the hybrid if the Trace-port beats the best single baseline (nflfastR wp) by >=0.01 log loss at >=2 of 3 progress checkpoints on the 2024-2025 test window AND is at least as well calibrated (ECE within 0.005); reject otherwise (fall back to the structural WP + temperature scaling, per the existing calibration stack).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2609-07617v1-score-model";

describe("2609-07617v1 Forecasting the Winner of a Live", () => {
  it("poisson pmf matches e^-1 at k=0, lambda=1", () => {
    expect(mod.poissonPmf(0, 1)).toBeCloseTo(0.3679, 3);
    expect(mod.poissonPmf(2, 2)).toBeCloseTo(0.2707, 3);
    expect(mod.poissonPmf(-1, 1)).toBeNull();
  });
  it("normal cdf is 0.5 at zero and monotone", () => {
    expect(mod.normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(mod.normalCdf(1.96)).toBeCloseTo(0.975, 2);
    expect(mod.normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });
  it("spread converts to win prob with favorite > 0.5", () => {
    expect(mod.spreadToWinProb(0)).toBeCloseTo(0.5, 4);
    expect(mod.spreadToWinProb(-7)).toBeGreaterThan(0.5);
    expect(mod.spreadToWinProb(7)).toBeLessThan(0.5);
    expect(mod.spreadToWinProb(0, -1)).toBeNull();
  });
  it("total over-probability rises with the projection", () => {
    const lo = mod.totalToOverProb(45, 40)!;
    const hi = mod.totalToOverProb(45, 50)!;
    expect(hi).toBeGreaterThan(lo);
    expect(mod.totalToOverProb(45, 45)).toBeCloseTo(0.5, 6);
  });
  it("dixon-coles tau adjusts only low scorelines", () => {
    expect(mod.dixonColesAdjustment(0, 0, -0.1)).toBeCloseTo(1.1, 10);
    expect(mod.dixonColesAdjustment(1, 1, -0.1)).toBeCloseTo(1.1, 10);
    expect(mod.dixonColesAdjustment(2, 1, -0.1)).toBe(1);
  });
});
