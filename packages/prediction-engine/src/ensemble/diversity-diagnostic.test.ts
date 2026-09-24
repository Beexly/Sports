/**
 * Prediction-diversity diagnostic identity — tests (arXiv 2001.10039).
 *
 * ACCEPTANCE GATE: the identity gamma = epsilon - delta verifies exactly;
 * a redundant pool (near-identical members) is flagged while a diverse pool
 * is not.
 */
import { describe, expect, it } from "vitest";
import {
  aggregateDiversity,
  diversityDecomposition,
  isRedundant,
  mostCorrelatedPair,
} from "./diversity-diagnostic";

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

describe("diversityDecomposition", () => {
  it("satisfies gamma = epsilon - delta exactly on random data", () => {
    const rand = mulberry32(51);
    for (let t = 0; t < 50; t++) {
      const m = 2 + Math.floor(rand() * 6);
      const members = Array.from({ length: m }, () => rand());
      const y = rand() < 0.5 ? 0 : 1;
      const d = diversityDecomposition(members, y);
      expect(d.gamma).toBeCloseTo(d.epsilon - d.delta, 12);
      expect(d.ratio).toBeCloseTo(d.delta / d.epsilon, 12);
    }
  });

  it("a perfectly correlated pool has ratio ~ 0 and is flagged redundant", () => {
    const members = [0.62, 0.62, 0.62, 0.62];
    const d = diversityDecomposition(members, 1);
    expect(d.delta).toBeCloseTo(0, 12);
    expect(d.ratio).toBeCloseTo(0, 12);
    expect(isRedundant(d.ratio)).toBe(true);
  });

  it("a diverse pool is not flagged redundant", () => {
    const d = diversityDecomposition([0.1, 0.4, 0.6, 0.9], 1);
    expect(isRedundant(d.ratio)).toBe(false);
  });

  it("throws on empty members and invalid ratio", () => {
    expect(() => diversityDecomposition([], 1)).toThrow();
    expect(() => isRedundant(NaN)).toThrow();
  });
});

describe("aggregateDiversity", () => {
  it("averages components and preserves the identity", () => {
    const rand = mulberry32(53);
    const matrix: number[][] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 100; i++) {
      matrix.push([rand(), rand(), rand()]);
      outcomes.push(rand() < 0.5 ? 0 : 1);
    }
    const agg = aggregateDiversity(matrix, outcomes);
    expect(agg.gamma).toBeCloseTo(agg.epsilon - agg.delta, 10);
    expect(() => aggregateDiversity(matrix, [0])).toThrow();
    expect(() => aggregateDiversity([], [])).toThrow();
  });
});

describe("mostCorrelatedPair", () => {
  it("identifies the near-duplicate model pair", () => {
    const rand = mulberry32(55);
    const base = Array.from({ length: 60 }, () => rand());
    const series = [
      base,
      base.map((v) => v + (rand() - 0.5) * 1e-6), // near-duplicate of member 0
      Array.from({ length: 60 }, () => rand()),
    ];
    const best = mostCorrelatedPair(series);
    expect([best.i, best.j].sort()).toEqual([0, 1]);
    expect(best.corr).toBeGreaterThan(0.999);
  });

  it("throws with fewer than 2 members", () => {
    expect(() => mostCorrelatedPair([[0.1, 0.2]])).toThrow();
  });
});
