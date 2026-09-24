import { describe, it, expect } from "vitest";
import {
  discriminationIndex,
  stabilityIndex,
  independenceIndices,
  ebShrink,
  reliabilityReport,
} from "./meta-analytics.js";

/** Seeded PRNG (mulberry32) — deterministic Monte Carlo. */
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

// ============================================================
// arXiv 1609.09830v1 — meta-analytics. Additive invention.
// ============================================================

describe("meta-analytics — 1609.09830v1", () => {
  it("discriminationIndex is high for separated teams, low for noise", () => {
    const rand = mulberry32(7);
    // Teams with truly different means -> high D.
    const separated = Array.from({ length: 8 }, (_, t) =>
      Array.from({ length: 16 }, () => t + rand()),
    );
    // All teams identical distribution -> low D.
    const noise = Array.from({ length: 8 }, () =>
      Array.from({ length: 16 }, () => rand()),
    );
    const dHigh = discriminationIndex(separated, 100, mulberry32(7));
    const dLow = discriminationIndex(noise, 100, mulberry32(7));
    expect(dHigh).toBeGreaterThan(0.8);
    expect(dLow).toBeLessThan(0.5);
  });

  it("discriminationIndex is NaN with <2 teams", () => {
    expect(discriminationIndex([[1, 2, 3]])).toBeNaN();
  });

  it("stabilityIndex is 1 for constant series", () => {
    expect(stabilityIndex([5, 5, 5, 5])).toBeCloseTo(1, 10);
    expect(stabilityIndex([5])).toBeNaN();
  });

  it("stabilityIndex falls with volatility", () => {
    const calm = stabilityIndex([10, 10.1, 9.9, 10.05]);
    const wild = stabilityIndex([5, 15, 4, 16]);
    expect(calm).toBeGreaterThan(wild);
  });

  it("independenceIndices flags a near-duplicate metric", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    const b = a.map((x) => x * 2 + 0.01); // near-duplicate
    const c = [8, 1, 6, 3, 7, 2, 5, 4]; // unrelated
    const [ia, ib, ic] = independenceIndices([a, b, c]);
    expect(ib!).toBeLessThan(0.2);
    expect(ic!).toBeGreaterThan(ib!);
    expect(ia!).toBeLessThan(0.5);
  });

  it("independenceIndices handles edge cases", () => {
    expect(independenceIndices([])).toEqual([]);
    expect(independenceIndices([[1, 2, 3]])).toEqual([1]);
  });

  it("ebShrink pulls noisy estimates toward the grand mean", () => {
    const values = [10, 0, 0.1, -0.1, 0.05];
    const vars = [100, 0.01, 0.01, 0.01, 0.01]; // first is very noisy
    const shrunk = ebShrink(values, vars);
    expect(Math.abs(shrunk[0]!)).toBeLessThan(Math.abs(values[0]!));
    // Precise estimates barely move.
    expect(shrunk[1]).toBeCloseTo(0, 1);
  });

  it("reliabilityReport flags D<0.5 and I<0.2", () => {
    const rep = reliabilityReport([
      { name: "good", D: 0.9, S: 0.9, I: 0.8 },
      { name: "noisy", D: 0.3, S: 0.9, I: 0.8 },
      { name: "redundant", D: 0.9, S: 0.9, I: 0.1 },
    ]);
    expect(rep[0]!.flagged).toBe(true); // worst first
    const byName = new Map(rep.map((r) => [r.name, r] as const));
    expect(byName.get("good")!.flagged).toBe(false);
    expect(byName.get("noisy")!.flagReason).toContain("chance-dominated");
    expect(byName.get("redundant")!.flagReason).toContain("redundant");
  });
});
