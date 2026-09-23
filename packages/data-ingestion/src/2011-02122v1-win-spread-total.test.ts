/**
 * Tests for ./2011-02122v1-win-spread-total (arXiv:2011.02122v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT (proceed to productionization) if the all-outputs recurrent model beats the per-quarter
 * logistic baseline by >=0.01 Brier AND >=3pp accuracy at the half-time checkpoint across the
 * 2023-2025 test window; REJECT otherwise.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2011-02122v1-win-spread-total";

describe("spread/total market mapping (arXiv:2011.02122v1)", () => {
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
