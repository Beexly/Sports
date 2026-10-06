/**
 * Tests for ./1906-01760v3-win-spread-total (arXiv:1906.01760v3, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT the ball-carrier LSTM into the GSE tracking pipeline if, on a held-out season of tracking
 * data, it beats XGBoost by >=5% relative frame-level RMSE AND shows no systematic temporal bias
 * (|mean error| within +/-2 SE of zero across the sequence profile).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1906-01760v3-win-spread-total";

describe("spread/total market mapping (arXiv:1906.01760v3)", () => {
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
