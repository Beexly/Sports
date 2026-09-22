/**
 * Tests for ./hierarchical-bayesian-bt (arXiv:1712.05879v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt iff on 2015-2025 walk-forward partitions: (a) log loss beats dynamic Elo by >= 0.003
 * averaged over Weeks 2-8 partitions; AND (b) log loss no worse than Elo (within 0.001) at Weeks
 * 13-16; AND (c) posterior-predictive probabilities better calibrated than Elo plug-in. If (a)
 * fails, reject and keep Elo.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./hierarchical-bayesian-bt";

describe("hierarchical Bayesian BT (arXiv:1712.05879v1)", () => {
  it("gamma prior recipe", () => {
    const g = mod.gammaPriorSigma(0.5)!;
    expect(g.shape).toBe(64);
    expect(g.rate).toBeCloseTo(128, 10);
    expect(mod.gammaPriorSigma(0)).toBeNull();
  });
  it("shrinks MLE strengths toward 0", () => {
    const s = mod.shrinkLogStrengths([2, -2], 1)!;
    expect(Math.abs(s[0]!)).toBeLessThan(2);
    expect(s[0]).toBeCloseTo(1, 10);
  });
  it("win matrix with half-win ties", () => {
    const W = mod.winMatrix(
      [
        { home: "A", away: "B", result: "H" },
        { home: "A", away: "B", result: "T" },
      ],
      ["A", "B"],
    )!;
    expect(W[0]![1]).toBe(1.5);
    expect(W[1]![0]).toBe(0.5);
    expect(mod.winMatrix([{ home: "A", away: "Z", result: "H" }], ["A", "B"])).toBeNull();
  });
  it("posterior-predictive is calibrated-ish", () => {
    expect(mod.posteriorPredictiveWinProb(0, 0, 0, 0, 0)).toBeCloseTo(0.5, 6);
    const certain = mod.posteriorPredictiveWinProb(2, -2, 0, 0, 0)!;
    const uncertain = mod.posteriorPredictiveWinProb(2, -2, 2, 2, 0)!;
    expect(uncertain).toBeLessThan(certain);
    expect(mod.posteriorPredictiveWinProb(0, 0, -1, 0, 0)).toBeNull();
  });
});
