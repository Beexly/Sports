/**
 * Tests for ./paired-comparisons-chance (arXiv:2303.14857v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT the beta-capped link if it reduces tail-decile log-loss by >=0.002 vs beta=1 on 2015-2025
 * pooled AND improves overall log-loss (no overall degradation); ADAPT if it wins only in the tail
 * - apply the cap only for |p-0.5|>0.3 (piecewise link); REJECT if beta<1 does not beat beta=1 on
 * NFL data.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./paired-comparisons-chance";

describe("paired comparisons chance (arXiv:2303.14857v1)", () => {
  it("chance floor bounds probabilities", () => {
    expect(mod.chanceWinProb(10, -10, 0.2)!).toBeLessThan(0.9);
    expect(mod.chanceWinProb(0, 0, 0.2)).toBeCloseTo(0.5, 10);
    expect(mod.chanceWinProb(1, 0, 0)).toBeCloseTo(1 / (1 + Math.exp(-1)), 10);
    expect(mod.chanceWinProb(1, 0, 1)).toBeNull();
  });
  it("fit recovers ordering", () => {
    const games = [
      ...Array.from({ length: 20 }, () => ({ a: "A", b: "B", aWin: true })),
      ...Array.from({ length: 5 }, () => ({ a: "A", b: "B", aWin: false })),
    ];
    const fit = mod.fitChanceModel(games, ["A", "B"], [0, 0.1, 0.2])!;
    expect(fit.theta[0]).toBeGreaterThan(fit.theta[1]!);
    expect(fit.chance).toBeGreaterThanOrEqual(0);
    expect(mod.fitChanceModel([], ["A"])).toBeNull();
  });
  it("luck share", () => {
    expect(mod.luckShare(0.2)).toBeCloseTo(0.2, 10);
    expect(mod.luckShare(1)).toBeNull();
  });
});
