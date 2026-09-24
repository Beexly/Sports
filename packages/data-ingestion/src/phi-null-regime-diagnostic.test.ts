/**
 * Tests for ./phi-null-regime-diagnostic (arXiv:1706.02447v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADAPT the phi null as a GSE regime diagnostic if: (a) the nflverse pipeline reproduces the
 * paper's qualitative behavior -- median NFL phi in (0.3, 0.95) with < 10% of seasons falling
 * outside (-0.5, 1.0) -- and (b) season-ahead engine log-loss correlates positively with (1 - phi)
 * across 2010-2025 seasons (Spearman rho > 0.3, p < 0.10).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./phi-null-regime-diagnostic";

describe("phi null regime diagnostic (arXiv:1706.02447v1)", () => {
  it("phi in (0,1) for a realistic season", () => {
    const wins = [12, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const nv = mod.nullWinVariance(17, 0.57, 0.43)!;
    const pv = mod.perfectWinVariance(17)!;
    const phi = mod.seasonPhi(wins, nv, pv)!;
    expect(phi).toBeGreaterThan(0);
    expect(phi).toBeLessThan(1);
  });
  it("null variance formula", () => {
    expect(mod.nullWinVariance(17, 0.5, 0.5)).toBeCloseTo(17 * 0.25, 10);
    expect(mod.nullWinVariance(0, 0.5, 0.5)).toBeNull();
  });
  it("null interval brackets 0", () => {
    const [lo, hi] = mod.nullPhiInterval(32, 17, 0.57, 0.43, 300, 7)!;
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(0);
  });
  it("stake multiplier clamps", () => {
    expect(mod.kellyStakeMultiplier(0.8)).toBeCloseTo(0.8, 10);
    expect(mod.kellyStakeMultiplier(-0.5)).toBe(0);
    expect(mod.kellyStakeMultiplier(2)).toBe(1);
    expect(mod.kellyStakeMultiplier(NaN)).toBeNull();
  });
  it("null on degenerate", () => {
    expect(mod.seasonPhi([5], 1, 2)).toBeNull();
    expect(mod.seasonPhi([5, 6], 2, 2)).toBeNull();
  });
});
