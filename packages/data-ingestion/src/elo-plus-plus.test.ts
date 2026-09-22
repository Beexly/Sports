/**
 * Tests for ./elo-plus-plus (arXiv:1910.06081v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADAPT if, on the 2023-2025 holdout, the canonical Elo's log-loss <= naive Elo's AND the
 * calibration curve shows no bin with |observed - predicted| > 5% at n>=50 games per bin.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./elo-plus-plus";

describe("Elo++ (arXiv:1807.07581v2)", () => {
  it("MOV multiplier grows sub-linearly", () => {
    const m1 = mod.movMultiplier(7, 0)!;
    const m2 = mod.movMultiplier(28, 0)!;
    expect(m2).toBeGreaterThan(m1);
    expect(m2 / m1).toBeLessThan(28 / 7);
    expect(mod.movMultiplier(35, 0)).toBeCloseTo(mod.movMultiplier(28, 0)!, 10);
  });
  it("team HFA shifts expectation", () => {
    expect(mod.expectedScorePlus(1500, 1500, 80)!).toBeGreaterThan(mod.expectedScorePlus(1500, 1500, 40)!);
  });
  it("game update + HFA adapt", () => {
    const s0 = { ratings: {}, homeAdv: {}, gamesPlayed: {} };
    const s1 = mod.applyGamePlus(s0, "DEN", "KC", 30, 10)!;
    expect(s1.ratings["DEN"]!).toBeGreaterThan(1500);
    expect(s1.homeAdv["DEN"]!).toBeGreaterThan(65);
    expect(s1.gamesPlayed["DEN"]).toBe(1);
  });
  it("regress to mean", () => {
    const r = mod.regressToMean({ A: 1600, B: 1400 })!;
    expect(r["A"]).toBeCloseTo(1500 + 100 * (2 / 3), 10);
    expect(r["B"]).toBeCloseTo(1500 - 100 * (2 / 3), 10);
    expect(mod.regressToMean({ A: NaN })).toBeNull();
  });
  it("null on bad teams", () => {
    expect(mod.applyGamePlus({ ratings: {}, homeAdv: {}, gamesPlayed: {} }, "A", "A", 1, 2)).toBeNull();
  });
});
