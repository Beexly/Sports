/**
 * Margin multipliers — tests (arXiv 2212.08116v1).
 *
 * ACCEPTANCE GATE: the empirical model reproduces known key-number
 * mass (3 and 7); cover probability is monotone in the spread and
 * treats pushes as half-wins; recentering shifts the distribution;
 * the normal reference agrees approximately; the reliability slope is
 * near 1 on calibrated inputs; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  coverProbability,
  fitMarginModel,
  normalCoverProbability,
  recenterModel,
  reliabilitySlope,
  spreadEdge,
} from "./margin-multipliers";

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

describe("fitMarginModel + coverProbability", () => {
  it("captures key-number mass and push semantics", () => {
    // Synthetic margins with heavy 3/7 mass (home perspective).
    const margins = [3, 3, 3, 7, 7, -3, 10, -7, 0, 14];
    const model = fitMarginModel(margins);
    const p3 = model.probs[model.margins.indexOf(3)] as number;
    expect(p3).toBeCloseTo(0.3, 12);
    // P(cover -2.5): margins > -2.5 get full credit; margin -3 misses.
    const c = coverProbability(model, -2.5);
    expect(c).toBeCloseTo(0.8, 12);
    // Push at exactly 3 counts half.
    const cPush = coverProbability(model, 3);
    // margins > 3: 7,7,10,14 = 0.4; margin == 3: 0.3 * 0.5 = 0.15.
    expect(cPush).toBeCloseTo(0.55, 12);
    // Monotone in the spread.
    expect(coverProbability(model, -7)).toBeGreaterThan(coverProbability(model, 7));
    expect(() => fitMarginModel([])).toThrow();
  });
});

describe("normalCoverProbability", () => {
  it("matches the empirical model approximately", () => {
    expect(normalCoverProbability(0)).toBeCloseTo(0.5, 8);
    expect(normalCoverProbability(-7)).toBeGreaterThan(0.5);
    // Key numbers: P(cover -3) under N(0, 13.5^2).
    const p = normalCoverProbability(-3);
    expect(p).toBeGreaterThan(0.55);
    expect(p).toBeLessThan(0.65);
    expect(() => normalCoverProbability(0, 0)).toThrow();
  });
});

describe("recenterModel + spreadEdge", () => {
  it("shifts the distribution and prices the edge", () => {
    const rand = mulberry32(291);
    const margins: number[] = [];
    for (let i = 0; i < 2000; i++) {
      margins.push(Math.round((rand() + rand() + rand() - 1.5) * 14));
    }
    const model = fitMarginModel(margins);
    // Model projects home -7 (spread) = +7 home margin; book deals -3.
    const { coverProb, edge } = spreadEdge(model, 7, -3);
    expect(coverProb).toBeGreaterThan(0.6);
    expect(edge).toBeGreaterThan(0.1);
    // Symmetry: model and book agree -> no edge.
    const flat = spreadEdge(model, 0, 0);
    expect(flat.edge).toBeCloseTo(0, 1);
    // Recentering actually shifts the distribution.
    const recentered = recenterModel(model, 7);
    expect(recentered.margins[0]).not.toBe(model.margins[0]);
  });
});

describe("reliabilitySlope", () => {
  it("is near 1 on calibrated inputs", () => {
    const rand = mulberry32(293);
    const probs: number[] = [];
    const covered: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const p = 0.3 + rand() * 0.4;
      probs.push(p);
      covered.push(rand() < p ? 1 : 0);
    }
    const slope = reliabilitySlope(probs, covered);
    expect(slope).toBeGreaterThan(0.75);
    expect(slope).toBeLessThan(1.25);
    expect(() => reliabilitySlope([0.5], [1])).toThrow();
  });
});
