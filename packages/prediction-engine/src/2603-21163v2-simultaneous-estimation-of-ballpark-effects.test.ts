/**
 * Vitest suite for arXiv:2603.21163v2 (Simultaneous Estimation of Ballpark Effects and Team Defense Using Total Bases Residuals).
 * Gate: ADAPT if simultaneous venue/personnel decomposition with honest uncertainty intervals and an external home-away validity check demonstrates first-class methodology GSE can reuse for stadium effects.
 */
import { describe, it, expect } from "vitest";
import { fitStadiumFactor, invertDiag } from "./2603-21163v2-simultaneous-estimation-of-ballpark-effects";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2603-21163v2 stadium factor joint estimation", () => {
  it("recovers venue effects sum-to-zero with honest SEs", () => {
    const rng = lcg(41);
    const obs = [];
    const trueVenue = [2.0, -1.0, -1.0];
    for (let i = 0; i < 300; i++) {
      const venue = Math.floor(rng() * 3);
      const unit = Math.floor(rng() * 4);
      obs.push({
        residual: (trueVenue[venue] ?? 0) + (rng() - 0.5) * 2,
        venue, unit, weight: 1,
      });
    }
    const { venueEffects, se } = fitStadiumFactor(obs, 3, 4);
    expect(venueEffects[0]).toBeGreaterThan(1);
    expect(venueEffects.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8);
    expect(se.length).toBe(2 + 4);
    expect(se.every((s) => s >= 0)).toBe(true);
    expect(() => fitStadiumFactor([], 3, 4)).toThrow();
  });
});
