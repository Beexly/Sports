/**
 * Vitest suite for arXiv:2508.00200v1 (Predicting Formula 1 Race Outcomes: Decomposing the Roles of Drivers and Constructors through Linear Modeling).
 * Gate: Adopt if the ridge+LOESS pilot beats the team-average carry-forward baseline by >=5% MAE on 2024 holdout weeks AND the variance-share decomposition is stable across two seasons (constructor-analogue share within +-10pp).
 */
import { describe, it, expect } from "vitest";
import { decomposeEpaVariance } from "./2508-00200v1-predicting-formula-1-race-outcomes";

describe("2508-00200v1 EPA scheme-vs-personnel decomposition", () => {
  it("attributes variance to the informative group", () => {
    const obs = Array.from({ length: 40 }, (_, i) => ({
      epa: i % 2 === 0 ? 0.5 : -0.5,
      groups: [i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0 : 1],
      ageWeeks: 0,
    }));
    const { coefs, shares } = decomposeEpaVariance(obs, 0.1, 8);
    expect(coefs[0]).toBeGreaterThan(0);
    expect(coefs[1]).toBeLessThan(0);
    const s0 = shares[0] ?? 0;
    expect(s0).toBeGreaterThan(0.3);
    expect(() => decomposeEpaVariance([], 0.1, 8)).toThrow();
  });
  it("time decay downweights old observations", () => {
    const obs = [
      { epa: 10, groups: [1], ageWeeks: 0 },
      { epa: -10, groups: [1], ageWeeks: 100 },
    ];
    const { coefs } = decomposeEpaVariance(obs, 0.01, 8);
    expect(coefs[0]).toBeGreaterThan(0); // old -10 decayed away
  });
});
