/**
 * Tests for ./2406-16171v5-win-spread-total (arXiv:2406.16171v5, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT game-clustered resampling if, pre-registered: at the chosen φ, pooled empirical coverage ≥
 * 0.85 (nominal 90%) with mean width ≤ 1.8× the standard-bootstrap width, on at least 3 of 4 held-out
 * seasons. REJECT φ-tuning (keep simple game-cluster bootstrap, φ = 1) if no φ clears 0.85 coverage or
 * the width penalty exceeds 2×.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2406-16171v5-win-spread-total";

describe("spread/total market mapping (arXiv:2406.16171v5)", () => {
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
