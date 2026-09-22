import { describe, expect, it } from "vitest";
import {
  findMisspecifiedRegions,
  nadarayaWatson,
  situationalHfa,
  wilsonInterval,
} from "./hfa-diagnostic";
import type { GameOutcome } from "./hfa-diagnostic";

// Synthetic: true P(home win) = logistic(0.4 * x); parametric claims logistic(0.2 * x) — misspecified slope.
const rng = (() => {
  let s = 9;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
})();
const games: GameOutcome[] = Array.from({ length: 2000 }, () => {
  const x = (rng() - 0.5) * 20;
  const p = 1 / (1 + Math.exp(-0.4 * x));
  return { x, homeWin: rng() < p ? 1 : 0 };
});
const badParam = (x: number): number => 1 / (1 + Math.exp(-0.2 * x));
const goodParam = (x: number): number => 1 / (1 + Math.exp(-0.4 * x));

describe("hfa-diagnostic", () => {
  it("NW recovers the true curve near the data center", () => {
    const { p, nEff } = nadarayaWatson(games, 0, 2);
    expect(nEff).toBeGreaterThan(100);
    expect(p).toBeCloseTo(0.5, 1);
    const { p: p5 } = nadarayaWatson(games, 5, 2);
    expect(p5).toBeGreaterThan(0.8); // true logistic(0.4*5) ≈ 0.88
  });

  it("wilsonInterval brackets the estimate and widens with less data", () => {
    const wide = wilsonInterval(0.6, 10);
    const narrow = wilsonInterval(0.6, 1000);
    expect(wide.hi - wide.lo).toBeGreaterThan(narrow.hi - narrow.lo);
    expect(wilsonInterval(0.5, 0)).toEqual({ lo: 0, hi: 1 });
  });

  it("flags the misspecified parametric mapping, clears the good one", () => {
    const grid = [-8, -4, 4, 8];
    const bad = findMisspecifiedRegions(games, badParam, grid, 2);
    const good = findMisspecifiedRegions(games, goodParam, grid, 2);
    expect(bad.length).toBeGreaterThanOrEqual(1);
    // finite-sample noise can nick the true curve; it must flag far fewer
    expect(good.length).toBeLessThan(bad.length);
  });

  it("situationalHfa measures extra HFA beyond the mapping", () => {
    const flags = {
      bigFav: (g: GameOutcome) => g.x > 5,
      bigDog: (g: GameOutcome) => g.x < -5,
    };
    const out = situationalHfa(games, goodParam, flags);
    expect(out.bigFav!.games).toBeGreaterThan(50);
    expect(Math.abs(out.bigFav!.extraHfa)).toBeLessThan(0.05); // good param -> ~0 residual
    expect(out.bigDog!.extraHfa).toBeLessThan(0.05);
  });

  it("rejects non-positive bandwidth", () => {
    expect(() => nadarayaWatson(games, 0, 0)).toThrow();
  });
});
