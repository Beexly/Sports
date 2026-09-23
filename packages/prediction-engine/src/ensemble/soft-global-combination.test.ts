/**
 * CV-tuned soft-global combination — tests (arXiv 2207.07318).
 *
 * ACCEPTANCE GATE: weights sum to 1; the tuned lambda stays in [0, 1];
 * on a stable season the soft-global scheme is competitive with the
 * best baseline; on a disruption season global pooling degrades vs
 * local (the negative control); degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  combine,
  compareSchemes,
  globalWeights,
  inverseMseWeights,
  localWeights,
  softGlobalWeights,
  tuneLambda,
  type CombinationWeek,
} from "./soft-global-combination";

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

/** 3 models: sharp, mediocre, noise. Stable = same skill every week. */
function stableWeeks(nWeeks: number, seed: number): CombinationWeek[] {
  const rand = mulberry32(seed);
  const weeks: CombinationWeek[] = [];
  for (let w = 0; w < nWeeks; w++) {
    const forecasts: number[][] = [];
    const outcomes: number[] = [];
    for (let g = 0; g < 16; g++) {
      const y = rand() < 0.5 ? 1 : 0;
      outcomes.push(y);
      const base = y === 1 ? 0.7 : 0.3;
      forecasts.push([
        Math.min(0.99, Math.max(0.01, base + (rand() - 0.5) * 0.1)), // sharp
        Math.min(0.99, Math.max(0.01, base + (rand() - 0.5) * 0.3)), // mediocre
        rand(), // noise
      ]);
    }
    weeks.push({ forecasts, outcomes });
  }
  return weeks;
}

/** Disruption: model skills reshuffle each week (global pooling degrades). */
function disruptionWeeks(nWeeks: number, seed: number): CombinationWeek[] {
  const rand = mulberry32(seed);
  const weeks: CombinationWeek[] = [];
  for (let w = 0; w < nWeeks; w++) {
    const order = [0, 1, 2].sort(() => rand() - 0.5);
    const forecasts: number[][] = [];
    const outcomes: number[] = [];
    for (let g = 0; g < 16; g++) {
      const y = rand() < 0.5 ? 1 : 0;
      outcomes.push(y);
      const base = y === 1 ? 0.7 : 0.3;
      const sigmas = [0.1, 0.3, 1.0];
      const row = [0, 1, 2].map((m) => {
        const s = sigmas[order[m] as number] as number;
        return s >= 1 ? rand() : Math.min(0.99, Math.max(0.01, base + (rand() - 0.5) * s * 3));
      });
      forecasts.push(row);
    }
    weeks.push({ forecasts, outcomes });
  }
  return weeks;
}

describe("weights", () => {
  it("sums to 1 and favors low-MSE models", () => {
    const w = inverseMseWeights([0.05, 0.2, 0.5]);
    expect(w.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 12);
    expect((w[0] as number) > (w[1] as number) && (w[1] as number) > (w[2] as number)).toBe(true);
    expect(() => inverseMseWeights([])).toThrow();
  });

  it("soft-global interpolates between global and local", () => {
    const g = [0.5, 0.3, 0.2];
    const l = [0.2, 0.3, 0.5];
    expect(softGlobalWeights(g, l, 1)).toEqual(g);
    expect(softGlobalWeights(g, l, 0)).toEqual(l);
    const mid = softGlobalWeights(g, l, 0.5);
    expect(mid).toEqual([0.35, 0.3, 0.35]);
    expect(() => softGlobalWeights(g, l, 2)).toThrow();
    expect(() => softGlobalWeights([0.5], l, 0)).toThrow();
  });

  it("combine is a weighted average", () => {
    expect(combine([0.8, 0.4], [0.75, 0.25])).toBeCloseTo(0.7, 12);
    expect(() => combine([0.5], [0.5, 0.5])).toThrow();
  });
});

describe("tuneLambda + compareSchemes", () => {
  it("tunes lambda in [0,1] and compares all four schemes", () => {
    const weeks = stableWeeks(8, 181);
    const train = weeks.slice(0, 6);
    const test = weeks.slice(6);
    const gw = globalWeights(train);
    expect(gw[0]).toBeGreaterThan(gw[2] as number); // sharp > noise
    const { lambda } = tuneLambda(train);
    expect(lambda).toBeGreaterThanOrEqual(0);
    expect(lambda).toBeLessThanOrEqual(1);
    const cmp = compareSchemes(train, test);
    for (const k of ["equal", "local", "global", "softGlobal"] as const) {
      expect(cmp[k]).toBeGreaterThan(0);
    }
    // Stable season: global pooling helps; soft-global is competitive.
    expect(cmp.global).toBeLessThanOrEqual(cmp.equal + 1e-9);
    expect(cmp.softGlobal).toBeLessThanOrEqual(Math.min(cmp.local, cmp.global) + 0.01);
    expect(() => tuneLambda([train[0] as CombinationWeek])).toThrow();
    expect(() => compareSchemes([], test)).toThrow();
  });

  it("disruption season: global pooling degrades vs local (negative control)", () => {
    const weeks = disruptionWeeks(8, 183);
    const cmp = compareSchemes(weeks.slice(0, 6), weeks.slice(6));
    // With reshuffled skills, pooled global weights mislead.
    expect(cmp.global).toBeGreaterThanOrEqual(cmp.local - 0.005);
  });

  it("localWeights throws with no models", () => {
    expect(() => localWeights({ forecasts: [[]], outcomes: [1] })).toThrow();
  });
});
