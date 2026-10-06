/**
 * Vitest suite for arXiv:2503.16470 (Ornstein–Uhlenbeck Process for Horse Race Betting: A Micro–Macro Analysis of Herding and Informed Bettors).
 * Gate: Adapt the O–U efficiency-clock into GSE's market-timing lane if: (i) the NFL r_inf(n) fit achieves R² ≥ 0.5 with positive Δr on 2023–2025 data; and (ii) a favorite/underdog split shows statistically different r_inf trajectories (Wald test p < 0.05).
 */
import { describe, it, expect } from "vitest";
import { fitOuClock, staleLineWindows } from "./2503-16470-ornsteinuhlenbeck-process-for-horse-race";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2503-16470 O-U efficiency clock", () => {
  it("recovers positive mean reversion on an OU path", () => {
    const rng = lcg(91);
    const path = [0];
    for (let i = 0; i < 500; i++) {
      const x = path[path.length - 1] ?? 0;
      path.push(x + 0.2 * (0 - x) + 0.5 * (rng() * 2 - 1));
    }
    const fit = fitOuClock(path);
    expect(fit.rInf).toBeGreaterThan(0.05);
    expect(fit.rInf).toBeLessThan(0.6);
    expect(fit.rSquared).toBeGreaterThan(0);
    expect(() => fitOuClock([1, 1])).toThrow();
  });
  it("flags stale-line windows on lagged jumps", () => {
    const line = [0, 0, 0, 3, 3, 3, 0, 0];
    expect(staleLineWindows(line, 3, 2)).toEqual([3, 4, 5, 6, 7]);
    expect(staleLineWindows(line, 3, 10)).toEqual([]);
    expect(() => staleLineWindows(line, 0, 1)).toThrow();
  });
});
