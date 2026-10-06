/**
 * Vitest suite for arXiv:2604.27865v1 (KellyBench: A Benchmark for Long-Horizon Sequential Decision Making).
 * Gate: Adopt the GSEBench harness + staking contract if, across the 2022–2024 walk-forward sims: (a) fractional-Kelly staking beats flat staking on final log-wealth in ≥ 2 of 3 seasons with no ruin in any season; (b) the walk-forward-retrained engine beats the static engine on R in ≥ 2 of 3 seasons; (c) the integration test proves the invoked sizing function equals the specified Kelly function on 100% of placed bets.
 */
import { describe, it, expect } from "vitest";
import { kellyStake, flatStake, simulateLogWealth, stakingContractHolds, SettledBet } from "./2604-27865v1-kellybench-a-benchmark-for-longhorizon";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2604-27865v1 GSEBench walk-forward simulator", () => {
  it("Kelly stake matches the closed form", () => {
    expect(kellyStake(0.6, 2.0, 0.5)).toBeCloseTo(0.5 * 0.2, 10);
    expect(kellyStake(0.4, 2.0, 1)).toBe(0); // no edge
    expect(() => kellyStake(0.6, 1.0, 0.5)).toThrow();
  });
  it("fractional Kelly beats flat on an edge-rich season without ruin", () => {
    const rng = lcg(101);
    const bets: SettledBet[] = Array.from({ length: 200 }, () => {
      const p = 0.55;
      const won = rng() < p;
      return { p, odds: 2.0, won };
    });
    const kelly = simulateLogWealth(bets, (p, o) => kellyStake(p, o, 0.25));
    const flat = simulateLogWealth(bets, () => flatStake(0.02));
    expect(kelly.ruined).toBe(false);
    expect(kelly.logWealth).toBeGreaterThan(flat.logWealth);
  });
  it("staking contract requires exact equality", () => {
    const bets = [{ p: 0.6, odds: 2.0, won: true }];
    const k = (p: number, o: number) => kellyStake(p, o, 0.5);
    expect(stakingContractHolds(bets, k, k)).toBe(true);
    expect(stakingContractHolds(bets, (p, o) => k(p, o) + 1e-9, k)).toBe(false);
  });
});
