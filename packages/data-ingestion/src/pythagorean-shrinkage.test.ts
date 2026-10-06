/**
 * Tests for ./pythagorean-shrinkage (arXiv:1205.4750v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADAPT-accept if gamma_hat_NFL estimated from the Taylor inversion on 2015-2019 falls within
 * [2.0, 2.8] (football-plausible range) AND forward MAE on 2020-2024 is within 0.01 wins-
 * equivalent of the nonlinear fit.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./pythagorean-shrinkage";

describe("pythagorean shrinkage (arXiv:1205.4750v1)", () => {
  it("equal points -> 0.5", () => {
    expect(mod.pythagWinPct(400, 400)).toBeCloseTo(0.5, 10);
  });
  it("dominant team -> near 1, bounded in (0,1)", () => {
    const p = mod.pythagWinPct(500, 300)!;
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(1);
  });
  it("linearized gamma recovery", () => {
    expect(mod.linearizedGamma(0.03, 22)).toBeCloseTo(2.64, 10);
    expect(mod.linearizedGamma(0.03, 0)).toBeNull();
  });
  it("luck metric sign", () => {
    expect(mod.luckWins(12, 0.6, 17)).toBeCloseTo(1.8, 10);
    expect(mod.luckWins(5, 0.6, 17)).toBeLessThan(0);
  });
  it("shrinkage interpolates", () => {
    expect(mod.shrinkTowardPythag(0.8, 0.6, 0.5)).toBeCloseTo(0.7, 10);
    expect(mod.shrinkTowardPythag(0.8, 0.6, 0)).toBeCloseTo(0.8, 10);
    expect(mod.shrinkTowardPythag(0.8, 0.6, 1)).toBeCloseTo(0.6, 10);
  });
  it("null on malformed", () => {
    expect(mod.pythagWinPct(-1, 400)).toBeNull();
    expect(mod.pythagWinPct(400, 400, 0)).toBeNull();
    expect(mod.pythagWinPct(NaN, 400)).toBeNull();
    expect(mod.luckWins(10, 1.5, 17)).toBeNull();
  });
});
