/**
 * Vitest suite for arXiv:2511.17535v1 (A Genetic Algorithm for Optimizing Fantasy Football Trades with Playoff Biasing).
 * Gate: ADOPT as a GSE season-long product feature only if: (a) backtested recommended-trade projected gains correlate with realized gains at r>=0.5, (b) interactive runtime <10s per league, and (c) the Monte Carlo upgrade shows >=70% of recommended trades keep g_a>0.
 */
import { describe, it, expect } from "vitest";
import { tradeFitness, gaGeneration, mcPositivity } from "./2511-17535v1-a-genetic-algorithm-for-optimizing";

describe("2511-17535v1 genetic-algorithm trade analyzer", () => {
  const proj = new Map([
    ["a", [10, 12, 8, 20]],
    ["b", [8, 8, 8, 8]],
    ["c", [15, 15, 15, 15]],
  ]);
  const po = new Set([3]);
  it("fitness favors playoff-week production with the boost", () => {
    const f = tradeFitness({ out: ["b"], in: ["a"] }, proj, po, 2);
    // a: 10+12+8+40=70 vs b: 8+8+8+16=40
    expect(f).toBeCloseTo(30, 8);
    expect(tradeFitness({ out: ["a"], in: ["b"] }, proj, po, 2)).toBeCloseTo(-30, 8);
  });
  it("GA generation preserves population size with elitism", () => {
    const rng = (() => { let s = 7; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
    const pop = [
      { out: ["b"], in: ["a"] },
      { out: ["a"], in: ["b"] },
      { out: ["b"], in: ["c"] },
      { out: ["c"], in: ["a"] },
    ];
    const next = gaGeneration(pop, (t) => tradeFitness(t, proj, po, 2), rng, 0.1, ["a", "b", "c"]);
    expect(next).toHaveLength(4);
    expect(next[0]).toEqual({ out: ["b"], in: ["c"] }); // elite kept
    expect(() => gaGeneration([pop[0]!], (t) => 1, rng, 0, [])).toThrow();
  });
  it("MC positivity is 1 for a dominant trade, 0 for a dominated one", () => {
    const rng = (() => { let s = 9; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
    const sd = new Map([["a", [1, 1, 1, 1]], ["b", [1, 1, 1, 1]], ["c", [1, 1, 1, 1]]]);
    expect(mcPositivity({ out: ["b"], in: ["c"] }, proj, sd, 50, rng, po, 2)).toBe(1);
    expect(mcPositivity({ out: ["c"], in: ["b"] }, proj, sd, 50, rng, po, 2)).toBe(0);
    expect(() => mcPositivity({ out: ["b"], in: ["c"] }, proj, sd, 0, rng, po, 2)).toThrow();
  });
});
