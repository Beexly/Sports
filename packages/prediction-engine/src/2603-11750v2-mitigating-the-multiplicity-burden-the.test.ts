/**
 * Vitest suite for arXiv:2603.11750v2 (Mitigating the Multiplicity Burden: The Role of Calibration in Reducing Predictive Multiplicity of Classifiers).
 * Gate: ADOPT the Rashomon/obscurity layer if on 2024 weeks 9-18 the ensemble card beats the champion-only card by >=1.5% ROI (or >=0.005 Brier improvement) AND contested-pick removal does not reduce total profit; otherwise the champion model stands alone.
 */
import { describe, it, expect } from "vitest";
import { gameAgreement, rashomonCard } from "./2603-11750v2-mitigating-the-multiplicity-burden-the";

describe("2603-11750v2 Rashomon pick card", () => {
  const mk = (gameId: string, picks: ("home" | "away")[], edge: number) => ({
    gameId,
    picks: picks.map((pick, i) => ({ variant: `v${i}`, gameId, pick, edge })),
  });
  it("publishes consensus games, withholds contested ones", () => {
    const games = [
      mk("g1", ["home", "home", "home", "away"], 0.05),
      mk("g2", ["home", "away", "home", "away"], 0.05),
      mk("g3", ["away", "away", "away", "away"], 0.005),
    ];
    const card = rashomonCard(games, 0.75, 0.02);
    expect(card.map((c) => c.gameId)).toEqual(["g1"]);
    expect(card[0]!.pick).toBe("home");
  });
  it("agreement is the majority share", () => {
    expect(gameAgreement(mk("g", ["home", "home", "away"], 0.1).picks).agree).toBeCloseTo(2 / 3, 10);
    expect(() => gameAgreement([])).toThrow();
  });
});
