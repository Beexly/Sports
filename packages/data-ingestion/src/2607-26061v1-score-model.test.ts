/**
 * Tests for ./2607-26061v1-score-model (arXiv:2607.26061v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: Adopt the recipe if the rolling-profile + volatility feature set beats the Elo-only baseline by >=0.015 log loss on mean LO-season-out log loss over 2022-2025 AND shows positive flat-stake ROI on at least 3 of 4 test seasons; reject otherwise.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2607-26061v1-score-model";

describe("2607-26061v1 Sim2Win: A Team-Agnostic, Event-Based Pre-Match Outcome", () => {
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
