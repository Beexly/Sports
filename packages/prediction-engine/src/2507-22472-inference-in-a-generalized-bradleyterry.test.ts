/**
 * Vitest suite for arXiv:2507.22472 (Inference in a generalized Bradley-Terry model for paired comparisons with covariates and a growing number of subjects).
 * Gate: On the NFL 2019-2023 walk-forward test, CBTM log-loss must beat plain BT by >=0.01 and must not lose to the current rating model; home-effect coefficient significant (|gamma|/SE>3) in >=4 of 5 seasons.
 */
import { describe, it, expect } from "vitest";
import { fitCovariateBt, covariateBtProb } from "./2507-22472-inference-in-a-generalized-bradleyterry";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2507-22472 generalized Bradley-Terry", () => {
  it("recovers team order and a positive home effect", () => {
    const rng = lcg(31);
    const games = [];
    for (let g = 0; g < 400; g++) {
      const home = Math.floor(rng() * 4);
      let away = Math.floor(rng() * 4);
      if (away === home) away = (away + 1) % 4;
      const trueM = [1.2, 0.4, -0.4, -1.2];
      const eta = (trueM[home] ?? 0) - (trueM[away] ?? 0) + 0.35;
      games.push({ home, away, homeWin: rng() < 1 / (1 + Math.exp(-eta)), x: [1] });
    }
    const { merits, gamma } = fitCovariateBt(games, 4, 300);
    expect(merits[0]).toBeGreaterThan(merits[1] ?? 0);
    expect(merits[1]).toBeGreaterThan(merits[2] ?? 0);
    expect(merits[2]).toBeGreaterThan(merits[3] ?? 0);
    expect(gamma[0] ?? 0).toBeGreaterThan(0.1); // home effect recovered
    const p = covariateBtProb(merits, gamma, 0, 3, [1]);
    expect(p).toBeGreaterThan(0.85);
    expect(() => fitCovariateBt([], 4)).toThrow();
  });
});
