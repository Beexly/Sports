import { describe, expect, it } from "vitest";
import { edgeSignificance, type SettledPick } from "../edge-significance.js";

// Deterministic RNG so the Monte-Carlo test is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("edgeSignificance", () => {
  it("flags a genuinely skilled record as significant", () => {
    const picks: SettledPick[] = Array.from({ length: 40 }, () => ({ won: true, nullProb: 0.3 }));
    const res = edgeSignificance(picks, { trials: 500, random: mulberry32(1) });
    expect(res.observedWins).toBe(40);
    expect(res.expectedWins).toBeCloseTo(12, 1);
    expect(res.significant).toBe(true);
    expect(res.winRatePValue).toBeLessThan(0.05);
  });

  it("does NOT flag a chance-level record", () => {
    // 20 wins / 20 losses against a 50% null — exactly the no-edge expectation.
    const picks: SettledPick[] = Array.from({ length: 40 }, (_, i) => ({ won: i % 2 === 0, nullProb: 0.5 }));
    const res = edgeSignificance(picks, { trials: 500, random: mulberry32(7) });
    expect(res.observedWins).toBe(20);
    expect(res.significant).toBe(false);
    expect(res.winRatePValue).toBeGreaterThan(0.1);
  });

  it("returns not-significant for an empty record", () => {
    const res = edgeSignificance([], { trials: 100, random: mulberry32(1) });
    expect(res.significant).toBe(false);
    expect(res.picks).toBe(0);
  });
});
