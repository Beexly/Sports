/**
 * Fidelity baseline — tests (arXiv 2307.15422v2).
 *
 * ACCEPTANCE GATE: a well-behaved proxy passes the gate (top-3
 * contains the best config, budget <= 10%, rho >= 0.5); a noisy
 * proxy fails on rank correlation; the budget arithmetic, rank
 * correlation extremes, top-k selection, and loss extrapolation all
 * behave; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  budgetFraction,
  extrapolateLoss,
  fidelityGate,
  rankCorrelation,
  topKByProxy,
  type ConfigScore,
} from "./fidelity-baseline";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("budgetFraction", () => {
  it("accounts the fit budget", () => {
    // 100 configs, screen cost 1, full cost 100, top-3 refined:
    // (100 + 300) / 10000 = 4%.
    expect(budgetFraction(100, 1, 100, 3)).toBeCloseTo(0.04, 10);
    expect(() => budgetFraction(0, 1, 100, 3)).toThrow();
  });
});

describe("rankCorrelation", () => {
  it("measures proxy fidelity", () => {
    const perfect: ConfigScore[] = [1, 2, 3, 4].map((i) => ({
      config: `c${i}`,
      proxy: i,
      full: i,
    }));
    expect(rankCorrelation(perfect)).toBeCloseTo(1, 10);
    const inverted = perfect.map((s) => ({ ...s, full: 5 - s.full }));
    expect(rankCorrelation(inverted)).toBeCloseTo(-1, 10);
    expect(() => rankCorrelation(perfect.slice(0, 2))).toThrow();
  });
});

describe("topKByProxy + extrapolateLoss", () => {
  it("selects and extrapolates", () => {
    const scores: ConfigScore[] = [
      { config: "a", proxy: 0.3, full: 0.31 },
      { config: "b", proxy: 0.1, full: 0.12 },
      { config: "c", proxy: 0.2, full: 0.21 },
    ];
    expect(topKByProxy(scores, 2).map((s) => s.config)).toEqual(["b", "c"]);
    const { slope, extrapolated } = extrapolateLoss([1, 2, 4], [0.5, 0.4, 0.35]);
    expect(slope).toBeGreaterThan(0); // loss falls as fidelity rises
    expect(extrapolated).toBeLessThan(0.35);
    expect(() => topKByProxy(scores, 0)).toThrow();
    expect(() => extrapolateLoss([1], [0.5])).toThrow();
  });
});

describe("fidelityGate", () => {
  it("passes a well-behaved proxy", () => {
    const rand = mulberry32(411);
    // 60 configs: one clear winner, proxy = full + small noise that
    // cannot bridge the winner's gap.
    const scores: ConfigScore[] = Array.from({ length: 60 }, (_, i) => {
      const full = i === 0 ? 0.4 : 0.41 + (i / 60) * 0.2;
      return {
        config: `c${i}`,
        full,
        proxy: full + (rand() - 0.5) * 0.008,
      };
    });
    const gate = fidelityGate(scores, 3, 1, 100);
    expect(gate.rho).toBeGreaterThan(0.5);
    expect(gate.budget).toBeLessThanOrEqual(0.1);
    expect(gate.miss).toBe(0);
    expect(gate.pass).toBe(true);
  });

  it("fails a noisy proxy", () => {
    const rand = mulberry32(413);
    const scores: ConfigScore[] = Array.from({ length: 60 }, (_, i) => ({
      config: `c${i}`,
      full: 0.4 + (i / 60) * 0.2,
      proxy: rand(), // pure noise
    }));
    const gate = fidelityGate(scores, 3, 1, 100);
    expect(Math.abs(gate.rho)).toBeLessThan(0.5);
    expect(gate.pass).toBe(false);
  });
});
