/**
 * Vitest suite for arXiv:2501.00933v1 (Optimizing for Rotisserie Fantasy Basketball).
 * Gate: ADOPT the GPP objective into the weekly DFS pipeline only if, on the 2024 17-week backtest, tournament-objective lineups beat max-expectation lineups by ≥ 5 pp in cash rate AND the top-1% hit rate is not worse.
 */
import { describe, it, expect } from "vitest";
import { phiStd, tournamentObjective, adaptivePayline } from "./2501-00933v1-optimizing-for-rotisserie-fantasy-basketball";

describe("2501-00933v1 adaptive-payline tournament objective", () => {
  it("objective is a probability in [0,1], increasing in mu", () => {
    const lo = tournamentObjective(150, 30, 160, 10);
    const hi = tournamentObjective(180, 30, 160, 10);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(lo).toBeLessThanOrEqual(1);
    expect(hi).toBeGreaterThan(lo);
    expect(() => tournamentObjective(150, 0, 160, 10)).toThrow();
  });
  it("collapses to Phi((mu-payMean)/sigma) when paySd -> 0", () => {
    const q = tournamentObjective(170, 25, 160, 1e-9);
    expect(q).toBeCloseTo(phiStd((170 - 160) / 25), 2);
  });
  it("payline moments respond to slate features", () => {
    const p = adaptivePayline({ total: 48, pace: 1.05, chalk: 0.4 }, [100, 1, 10, 5], [5, 0.1, 1, 0.5]);
    expect(p.payMean).toBeCloseTo(100 + 48 + 10.5 + 2, 8);
    expect(p.paySd).toBeGreaterThan(0);
  });
});
