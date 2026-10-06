/**
 * Vitest suite for arXiv:physics/0607064 (A Bayesian Mean-Value Approach with a Self-Consistently Determined Prior Distribution for the Ranking of College Football Teams (physics/0607064)).
 * Gate: Gate (ADAPT->keep): |Delta-rho| <= 0.01 in >=80% of NFL seasons 2000-2024 AND the self-consistent prior beats the fixed-variance prior by >= 0.005 log-loss on weeks 1-4 (2015-2024).
 */
import { describe, it, expect } from "vitest";
import { selfConsistentPrior, newtonRankings, rankingLogLoss } from "./physics-0607064-a-bayesian-meanvalue-approach-with";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("physics-0607064 Bayesian ranking with self-consistent prior", () => {
  it("fits ordered ratings and positive HFA", () => {
    const rng = lcg(81);
    const games = [];
    for (let g = 0; g < 500; g++) {
      const home = Math.floor(rng() * 4);
      let away = Math.floor(rng() * 4);
      if (away === home) away = (away + 1) % 4;
      const eta = [1.5, 0.5, -0.5, -1.5][home]! - [1.5, 0.5, -0.5, -1.5][away]! + 0.3;
      games.push({ home, away, homeWin: rng() < 1 / (1 + Math.exp(-eta)) });
    }
    const { ratings, hfa, priorVar } = newtonRankings(games, 4, 1.0);
    expect(ratings[0]).toBeGreaterThan(ratings[3] ?? 0);
    expect(hfa).toBeGreaterThan(0);
    expect(priorVar).toBeGreaterThan(0);
    expect(ratings.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8);
    expect(() => newtonRankings([], 4, 1)).toThrow();
  });
  it("self-consistent prior converges to mean-square + MSV", () => {
    expect(selfConsistentPrior([1, -1, 0.5, -0.5], 0.1)).toBeCloseTo(0.625 + 0.1, 6);
  });
  it("log-loss is finite and sane", () => {
    const games = [{ home: 0, away: 1, homeWin: true }];
    const ll = rankingLogLoss(games, [1, -1], 0);
    expect(ll).toBeLessThan(0.5);
    expect(ll).toBeGreaterThan(0);
  });
});
