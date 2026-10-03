/**
 * Tests for ./2304-09918v2-win-spread-total (arXiv:2304.09918v2, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT per-predictor windows if, pre-registered: the swept window improves pooled held-out log-loss
 * by >= 0.003 over the fixed window on 2019-2024, with gains in >= 4 of 6 seasons. ADOPT incentive
 * modifiers if they improve log-loss on the 'locked/eliminated' week 16-18 subset by >= 0.01 without
 * degrading the 'meaningful' subset. REJECT either workstream if its gate fails.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2304-09918v2-win-spread-total";

describe("spread/total market mapping (arXiv:2304.09918v2)", () => {
  it("maps spreads to win probabilities", () => {
    expect(mod.spreadToWinProb(0)).toBeCloseTo(0.5, 10);
    expect(mod.spreadToWinProb(-3)).toBeCloseTo(0.6985, 4);
    expect(mod.spreadToWinProb(3)).toBeCloseTo(1 - 0.6985, 4);
    const fav = mod.spreadToWinProb(-7)!;
    const dog = mod.spreadToWinProb(7)!;
    expect(fav).toBeGreaterThan(0.5);
    expect(dog).toBeLessThan(0.5);
    expect(mod.spreadToWinProb(NaN)).toBeNull();
  });

  it("maps totals to over probabilities", () => {
    expect(mod.totalToOverProb(45, 45)).toBeCloseTo(0.5, 6);
    expect(mod.totalToOverProb(45, 50)).toBeGreaterThan(0.5);
    expect(mod.totalToOverProb(45, 40)).toBeLessThan(0.5);
    expect(mod.totalToOverProb(45, 45, 0)).toBeNull();
  });

  it("looks up push probability by key number", () => {
    expect(mod.pushProbability(3)).toBeCloseTo(0.09, 10);
    expect(mod.pushProbability(-3)).toBeCloseTo(0.09, 10);
    expect(mod.pushProbability(7)).toBeCloseTo(0.06, 10);
    expect(mod.pushProbability(14)).toBeCloseTo(0.015, 10);
    expect(mod.pushProbability(NaN)).toBeNull();
  });
});
