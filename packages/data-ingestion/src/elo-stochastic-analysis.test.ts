/**
 * Tests for ./elo-stochastic-analysis (arXiv:2212.12015v2, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT the scheduled K iff it beats fixed-K on pooled 2015-2025 log-loss by >=0.001 AND wins the
 * first-6-weeks split (early-season adaptivity is the mechanism; a win only late-season is
 * suspect); ADAPT (scheduler for weeks 1-6, fixed K after) if it wins early-season only; REJECT if
 * no improvement — the NFL's non-round-robin schedule may break the R assumption beyond what the
 * trace approximation tolerates.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./elo-stochastic-analysis";

describe("Elo stochastic analysis (arXiv:2212.12015v2)", () => {
  it("stationary variance grows with K", () => {
    expect(mod.stationaryVariance(32, 32)!).toBeGreaterThan(mod.stationaryVariance(8, 32)!);
    expect(mod.stationaryVariance(0, 32)).toBeNull();
  });
  it("convergence games shrink with K", () => {
    expect(mod.convergenceGames(32, 32)!).toBeLessThan(mod.convergenceGames(8, 32)!);
    expect(mod.convergenceGames(8, 1)).toBeNull();
  });
  it("optimal K", () => {
    const k = mod.optimalK(32, 100)!;
    expect(k).toBeGreaterThan(0);
    expect(mod.optimalK(32, 0)).toBeNull();
  });
  it("round-robin simulation converges near truth", () => {
    const truth = [100, 50, 0, -50, -100, 80, 20, -20];
    const r = mod.simulateRoundRobin(8, truth, 16, 40, 7)!;
    expect(r).toHaveLength(8);
    const order = [...r].sort((a, b) => b - a);
    expect(r.indexOf(order[0]!)).toBe(truth.indexOf(Math.max(...truth)));
    expect(mod.simulateRoundRobin(8, [1], 16, 10)).toBeNull();
  });
});
