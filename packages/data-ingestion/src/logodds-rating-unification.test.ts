/**
 * Tests for ./logodds-rating-unification (arXiv:1701.08055v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT the unified log-odds refactor + two-stage training if, on the 2017-2025 NFL test window:
 * (a) two-stage beats online Elo on mean log-likelihood with paired p < 0.01 (replicating H1); (b)
 * the refactored implementation reproduces the legacy Elo ratings to within 1e-6 on the training
 * block; (c) no adopted model variant underperforms vanilla Elo by more than 0.002 nats.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./logodds-rating-unification";

describe("log-odds rating unification (arXiv:1701.08055v1)", () => {
  it("log-odds matrix structure", () => {
    const L = mod.logOddsMatrix([1, -1], 0.2)!;
    expect(L[0]![1]).toBeCloseTo(2.2, 10);
    expect(L[1]![0]).toBeCloseTo(-1.8, 10);
    expect(mod.baseAntisymmetryError(L, 0.2)).toBeCloseTo(0, 10);
  });
  it("gradient step moves winner up, loser down", () => {
    const next = mod.gradientStepTheta([0, 0], 0, 1, 1, 0.5, 0.1)!;
    expect(next[0]).toBeCloseTo(0.05, 10);
    expect(next[1]).toBeCloseTo(-0.05, 10);
    expect(mod.gradientStepTheta([0, 0], 0, 5, 1, 0.5, 0.1)).toBeNull();
  });
  it("refactor reproduction gate", () => {
    expect(mod.refactorReproError([1, 2], [1, 2])).toBe(0);
    expect(mod.refactorReproError([1], [1, 2])).toBeNull();
  });
  it("skellam head", () => {
    expect(mod.skellamWinProb(0, 10)).toBeCloseTo(0.5, 6);
    expect(mod.skellamWinProb(7, 10)!).toBeGreaterThan(0.5);
    expect(mod.skellamWinProb(0, 0)).toBeNull();
  });
});
