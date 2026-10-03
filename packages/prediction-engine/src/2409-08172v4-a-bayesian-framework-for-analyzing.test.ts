/**
 * Vitest suite for arXiv:2409.08172v4 (A Bayesian framework for analyzing alleged cheating in sports through hidden codes).
 * Gate: ADOPT the monitor if the LR detector catches at least as many labeled anomalous games as the z-score baseline with no more than 1/2 the false-positive rate on the 2025 weeks 1–3 window; REJECT otherwise.
 */
import { describe, it, expect } from "vitest";
import { lrAnomalyScore, pooledCrewRate, flagAnomalousGames } from "./2409-08172v4-a-bayesian-framework-for-analyzing";

describe("2409-08172v4 LR game-integrity monitor", () => {
  it("scores inflated call counts positively, honest counts negatively", () => {
    expect(lrAnomalyScore(12, 4)).toBeGreaterThan(0);
    expect(lrAnomalyScore(4, 4)).toBeLessThan(0);
    expect(() => lrAnomalyScore(4, 0)).toThrow();
  });
  it("partial pooling shrinks small-sample crews to the global rate", () => {
    const small = pooledCrewRate(1, 1, 0.05);
    const large = pooledCrewRate(60, 60, 0.05);
    expect(small).toBeLessThan(0.5);   // shrunk away from 1.0
    expect(large).toBeGreaterThan(0.9); // data dominates
    expect(pooledCrewRate(0, 0, 0.05)).toBeCloseTo(0.05, 12);
  });
  it("flags only games clearing the threshold", () => {
    const games = [
      { crew: "A", calls: 12, expected: 4 },
      { crew: "B", calls: 4, expected: 4 },
    ];
    expect(flagAnomalousGames(games, 2).map((g) => g.crew)).toEqual(["A"]);
  });
});
