/**
 * Vitest suite for arXiv:2609.08060v1 (Pre-game paired-comparison modeling of professional League of Legends map outcomes).
 * Gate: Accept the port if: the combined stable+dynamic model beats both boundaries on walk-forward Brier with paired p<0.05 AND calibration slope in [0.9,1.1]; if the EWMA form term adds nothing over the static ridge block, reject the form term and keep only the static block - the paper's own lesson is that parsimony wins ties.
 */
import { describe, it, expect } from "vitest";
import { ewmaForm, fitStableDynamic, SdGame } from "./2609-08060v1-pregame-pairedcomparison-modeling-of-professional";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2609-08060v1 stable+dynamic paired comparison", () => {
  it("EWMA weights recent same-venue results more", () => {
    const obs = [
      { signedMargin: 10, venue: "home" as const },
      { signedMargin: -10, venue: "home" as const },
    ];
    const e = ewmaForm(obs, "home", 1);
    // alpha = 1-e^-1 ~ 0.632: e = .632*(-10) + .368*(.632*10) < 0 (recent dominates)
    expect(e).toBeLessThan(0);
    expect(ewmaForm([], "home", 2)).toBe(0);
    expect(() => ewmaForm(obs, "home", 0)).toThrow();
  });
  it("fits strengths and a positive form coefficient", () => {
    const rng = lcg(131);
    const games: SdGame[] = [];
    for (let g = 0; g < 400; g++) {
      const home = Math.floor(rng() * 4);
      let away = Math.floor(rng() * 4);
      if (away === home) away = (away + 1) % 4;
      const hf = (rng() - 0.5) * 10;
      const af = (rng() - 0.5) * 10;
      const str = [3, 1, -1, -3];
      const eta = (str[home] ?? 0) - (str[away] ?? 0) + 0.2 * (hf - af) + 0.5;
      games.push({ home, away, y: rng() < 1 / (1 + Math.exp(-eta)) ? 1 : 0, homeForm: hf, awayForm: af, x: [1, 0, 0] });
    }
    const { strengths, formCoef } = fitStableDynamic(games, 4, 1);
    expect(strengths[0]).toBeGreaterThan(strengths[3] ?? 0);
    expect(formCoef).toBeGreaterThan(0);
    expect(() => fitStableDynamic([], 4, 1)).toThrow();
  });
});
