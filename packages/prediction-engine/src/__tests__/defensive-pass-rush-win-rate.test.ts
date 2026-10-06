import { describe, expect, it } from "vitest";
import { evaluateDefensivePassRush } from "../signals/trench/defensive-pass-rush-win-rate.js";

describe("Defensive Pass Rush Evaluation", () => {
  it("identifies an elite rusher with high double team rate and high PRWR", () => {
    const res = evaluateDefensivePassRush({
      player: "Dexter Lawrence",
      team: "NYG",
      passRushSnaps: 30,
      overallPrwrPercent: 18,
      truePassSetPrwrPercent: 23.3, // PRWR threshold met
      doubleTeamRatePercent: 80, // Double team threshold met
    });

    expect(res.isEliteRusher).toBe(true);
    expect(res.isNeutralized).toBe(false);
    expect(res.truePassSetAdvantage).toBeGreaterThan(0);
    expect(res.baselineDisruptionScore).toBeGreaterThan(25);
  });

  it("identifies a neutralized rusher with high double team rate but low PRWR", () => {
    const res = evaluateDefensivePassRush({
      player: "Average DT",
      team: "CAR",
      passRushSnaps: 25,
      overallPrwrPercent: 12,
      truePassSetPrwrPercent: 8,
      doubleTeamRatePercent: 65,
    });

    expect(res.isEliteRusher).toBe(false);
    expect(res.isNeutralized).toBe(true);
    expect(res.truePassSetAdvantage).toBeLessThan(0);
    expect(res.baselineDisruptionScore).toBeLessThan(20);
  });
});
