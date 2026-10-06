import { describe, it, expect } from "vitest";
import {
  matchAsIfRandom,
  attEstimate,
  randomizationInference,
  icIvIntervals,
  rosenbaumGammaTipping,
  SituGame,
} from "./1705-03918-two-version-causal.js";

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
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Synthetic rest-advantage: +3 ATS residual for treated, two versions. */
function simGames(): SituGame[] {
  const rand = mulberry32(23);
  const games: SituGame[] = [];
  for (let i = 0; i < 160; i++) {
    const treated = i < 80;
    games.push({
      spread: randn(rand) * 6,
      total: 44 + randn(rand) * 4,
      eloDiff: randn(rand) * 150,
      treated,
      version: treated ? (i < 40 ? "rest-3-4d" : "rest-7d-plus") : "none",
      atsResidual: (treated ? 3 : 0) + randn(rand) * 4,
    });
  }
  return games;
}

describe("two-version causal", () => {
  const pairs = matchAsIfRandom(simGames());
  it("matches every treated game 1:1 and recovers the ATT", () => {
    expect(pairs.length).toBe(80);
    expect(attEstimate(pairs)).toBeGreaterThan(1.5);
    expect(attEstimate(pairs)).toBeLessThan(4.5);
  });
  it("randomization inference rejects the null", () => {
    const { pValue } = randomizationInference(pairs, 2000, 7);
    expect(pValue).toBeLessThan(0.05);
  });
  it("Iv covers Ic with bounded width inflation", () => {
    const { ic, iv } = icIvIntervals(pairs);
    expect(iv[0]).toBeLessThanOrEqual(ic[0]);
    expect(iv[1]).toBeGreaterThanOrEqual(ic[1]);
    // I_v is the union of per-version CIs: conservative by construction (each
    // version uses half the pairs, and the envelope spans the version means),
    // so the inflation bound is generous; the gate is that it stays bounded.
    expect(iv[1] - iv[0]).toBeLessThanOrEqual(2.5 * (ic[1] - ic[0]));
  });
  it("Gamma tipping point clears 1.3 for a robust effect", () => {
    expect(rosenbaumGammaTipping(pairs)).toBeGreaterThanOrEqual(1.3);
  });
  it("returns Gamma=1 when there is no effect", () => {
    const rand = mulberry32(99);
    const games: SituGame[] = [];
    for (let i = 0; i < 120; i++) {
      const treated = i < 60;
      games.push({
        spread: randn(rand) * 6,
        total: 44 + randn(rand) * 4,
        eloDiff: randn(rand) * 150,
        treated,
        version: treated ? (i < 30 ? "rest-3-4d" : "rest-7d-plus") : "none",
        atsResidual: randn(rand) * 4,
      });
    }
    const p = matchAsIfRandom(games);
    expect(rosenbaumGammaTipping(p)).toBe(1);
  });
});
