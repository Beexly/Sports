/**
 * Thin-regime retrieval — tests (arXiv 2307.02752v2).
 *
 * ACCEPTANCE GATE: regime histogramming bins states; the power-law
 * fit recovers a planted exponent; thin regimes are those under the
 * sample threshold; perturbation creates noisy copies; retrieval
 * returns the nearest neighbors; the RB-CQL batch upweights retrieved
 * tuples; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  buildRbCqlBatch,
  fitPowerLaw,
  perturbTransitions,
  regimeHistogram,
  regimeKey,
  retrieveNeighbors,
  thinRegimes,
  type SlateState,
  type Transition,
} from "./thin-regime-retrieval";

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

describe("regimeHistogram + thinRegimes", () => {
  it("bins states and flags thin regimes", () => {
    const states: SlateState[] = [];
    for (let i = 0; i < 100; i++) {
      states.push({ features: [10 + (i % 3), 45, i % 2, 0] });
    }
    const hist = regimeHistogram(states, [5, 10, 1, 1]);
    expect(hist.size).toBeGreaterThan(0);
    const total = [...hist.values()].reduce((s, x) => s + x, 0);
    expect(total).toBe(100);
    // Everything is thin under a high threshold, nothing under 1.
    expect(thinRegimes(hist, 200).size).toBe(hist.size);
    expect(thinRegimes(hist, 1).size).toBe(0);
    expect(() => regimeKey([1, 2], [1])).toThrow();
  });
});

describe("fitPowerLaw", () => {
  it("recovers a planted exponent", () => {
    const rand = mulberry32(381);
    // Planted: count(rank) ~= 1000 * rank^-1.5 with noise.
    const counts = Array.from({ length: 40 }, (_, i) => {
      const c = 1000 * (i + 1) ** -1.5;
      return Math.max(1, Math.round(c * (0.8 + rand() * 0.4)));
    });
    const { alpha, rSquared } = fitPowerLaw(counts);
    expect(alpha).toBeGreaterThan(1.2);
    expect(alpha).toBeLessThan(1.8);
    expect(rSquared).toBeGreaterThan(0.9);
    expect(() => fitPowerLaw([1, 2])).toThrow();
  });
});

describe("perturbTransitions + retrieveNeighbors", () => {
  const t = (x: number): Transition => ({ s: [x, 0], a: 1, r: x, s2: [x + 1, 0] });

  it("creates noisy copies and retrieves nearest neighbors", () => {
    const rand = mulberry32(383);
    const copies = perturbTransitions([t(5)], 0.1, 4, rand);
    expect(copies).toHaveLength(4);
    // Perturbed copies stay near the original.
    for (const c of copies) {
      expect(Math.abs((c.s[0] as number) - 5)).toBeLessThan(0.2);
      expect(c.a).toBe(1);
    }
    const pool = [t(0), t(1), t(2), t(10), t(11)];
    const nn = retrieveNeighbors([1.1, 0], pool, 2);
    expect(nn).toHaveLength(2);
    expect(nn.map((x) => x.s[0])).toEqual([1, 2]);
    expect(retrieveNeighbors([0, 0], [], 8)).toEqual([]);
    expect(() => perturbTransitions([t(0)], -1, 1, rand)).toThrow();
  });
});

describe("buildRbCqlBatch", () => {
  it("upweights retrieved thin-regime tuples", () => {
    const t = (x: number): Transition => ({ s: [x], a: 0, r: x, s2: [x] });
    const batch = buildRbCqlBatch([t(1), t(2)], [t(3)], 3);
    expect(batch.transitions).toHaveLength(3);
    expect(batch.weights).toEqual([1, 1, 3]);
    expect(() => buildRbCqlBatch([t(1)], [t(2)], 0.5)).toThrow();
  });
});
