import { describe, it, expect } from "vitest";
import { computeCushionSeparationMatchup } from "../expected-cushion-separation.js";
import type { CovariateRow } from "../../edge-lab/covariate-bus.js";

function row(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0000001",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 3.0,
    avgCushion: 6.0,
    targets: 10,
    airYardsShare: 0.1,
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    avgAirYardsToSticks: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    avgYac: null,
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    intRate: null,
    fumbleRate: null,
    missedTackleRate: null,
    airYardsPerAttempt: null,
    passerRatingAllowed: null,
    passerRating: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

describe("Cushion Separation Matchup", () => {
  it("scores high for Shakir cell vs league mean", () => {
    const rows = [
      row({ gsisId: "player1", week: 1, targets: 50, avgCushion: 6.0, avgSeparation: 3.0 }),
      row({ gsisId: "player2", week: 1, targets: 50, avgCushion: 6.0, avgSeparation: 3.0 }),
      row({ gsisId: "player3", week: 2, targets: 50, avgCushion: 6.5, avgSeparation: 3.5 }),
      row({ gsisId: "player4", week: 2, targets: 50, avgCushion: 5.5, avgSeparation: 2.5 }),
      row({ gsisId: "shakir", week: 3, targets: 10, avgCushion: 9.5, avgSeparation: 4.4 }),
      row({ gsisId: "shakir", week: 4, targets: 15, avgCushion: 9.5, avgSeparation: 4.4 }),
    ];

    const result = computeCushionSeparationMatchup(rows, "shakir", 2024, 5, 4);
    expect(result).not.toBeNull();
    expect(result!.cushionZ).toBeGreaterThan(0);
    expect(result!.separationZ).toBeGreaterThan(0);
    expect(result!.matchupScore).toBeGreaterThan(2);
  });

  it("returns null if target floor (<20) is not met", () => {
    const rows = [
      row({ gsisId: "player1", week: 1, targets: 50, avgCushion: 6.0, avgSeparation: 3.0 }),
      row({ gsisId: "player2", week: 2, targets: 50, avgCushion: 5.5, avgSeparation: 2.5 }),
      row({ gsisId: "target", week: 4, targets: 19, avgCushion: 8.0, avgSeparation: 4.0 }),
    ];

    const result = computeCushionSeparationMatchup(rows, "target", 2024, 5, 4);
    expect(result).toBeNull();
  });

  it("enforces point-in-time discipline", () => {
    const rows = [
      row({ gsisId: "player1", week: 1, targets: 50, avgCushion: 6.0, avgSeparation: 3.0 }),
      row({ gsisId: "player2", week: 2, targets: 50, avgCushion: 5.5, avgSeparation: 2.5 }),
      row({ gsisId: "target", week: 3, targets: 25, avgCushion: 8.0, avgSeparation: 4.0 }),
      row({ gsisId: "target", week: 5, targets: 30, avgCushion: 2.0, avgSeparation: 1.0 }),
    ];

    const result = computeCushionSeparationMatchup(rows, "target", 2024, 5, 4);
    expect(result).not.toBeNull();
    expect(result!.cushionZ).toBeGreaterThan(0);
  });
});
