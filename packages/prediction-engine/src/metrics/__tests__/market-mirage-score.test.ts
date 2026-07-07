import { describe, expect, it } from "vitest";

import { marketMirageScore, type MarketMirageScoreInput } from "../market/market-mirage-score.js";

const cleanPolicy: MarketMirageScoreInput["sourcePolicy"] = [
  {
    allowedForModeling: true,
    attributionRequired: "synthetic-local-fixture",
    sourceId: "synthetic-local-fixture",
    status: "approved",
  },
];

const blockedPolicy: MarketMirageScoreInput["sourcePolicy"] = [
  {
    allowedForModeling: false,
    sourceId: "restricted-fixture-source",
    status: "blocked",
  },
];

const cleanInput: MarketMirageScoreInput = {
  bookDispersionIndex: 8,
  calibrationDebt: 8,
  driftPressure: 8,
  explainabilityScore: 88,
  marketGravityIndex: 82,
  marketSignalAllowed: true,
  noBetPressure: 10,
  publicNarrativeHeat: 10,
  sourceContradictionPressure: 4,
  sourcePolicy: cleanPolicy,
  staleLineRiskScore: 6,
};

describe("marketMirageScore", () => {
  it("keeps explainable, fresh, corroborated market movement low risk", () => {
    const result = marketMirageScore(cleanInput);

    expect(result.metricId).toBe("market-mirage-score");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_EDGE_PROBABILITY_OR_PICK");
    expect(result.band).toBe("LOW");
    expect(result.marketInterpretationAllowed).toBe(true);
    expect(result.drivers.every((driver) => !driver.name.includes("weight"))).toBe(true);
  });

  it("hard-blocks stale or blocked market signals even when market gravity is high", () => {
    const result = marketMirageScore({
      ...cleanInput,
      explainabilityScore: 95,
      marketGravityIndex: 96,
      marketSignalAllowed: false,
      staleLineRiskScore: 92,
    });

    expect(result.band).toBe("BLOCK");
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.marketInterpretationAllowed).toBe(false);
    expect(result.blockReasons).toContain("Market signal is stale or blocked.");
  });

  it("raises mirage risk when narrative heat, contradiction, and dispersion rise", () => {
    const clean = marketMirageScore(cleanInput);
    const noisy = marketMirageScore({
      ...cleanInput,
      bookDispersionIndex: 82,
      explainabilityScore: 25,
      publicNarrativeHeat: 86,
      sourceContradictionPressure: 78,
    });

    expect(noisy.score).toBeGreaterThan(clean.score);
    expect(noisy.band).not.toBe("LOW");
    expect(noisy.drivers.some((driver) => driver.name === "public_narrative_heat")).toBe(true);
    expect(noisy.drivers.some((driver) => driver.name === "source_contradiction_pressure")).toBe(true);
  });

  it("blocks when source posture is blocked", () => {
    const result = marketMirageScore({ ...cleanInput, sourcePolicy: blockedPolicy });

    expect(result.band).toBe("BLOCK");
    expect(result.sourcePosture).toBe("BLOCKED");
    expect(result.marketInterpretationAllowed).toBe(false);
    expect(result.blockReasons).toContain("Source policy blocks modeling.");
  });

  it("blocks when no-bet, drift, or calibration debt crosses hard gates", () => {
    const noBet = marketMirageScore({ ...cleanInput, noBetPressure: 90 });
    const drift = marketMirageScore({ ...cleanInput, driftPressure: 86 });
    const debt = marketMirageScore({ ...cleanInput, calibrationDebt: 88 });

    expect(noBet.band).toBe("BLOCK");
    expect(drift.band).toBe("BLOCK");
    expect(debt.band).toBe("BLOCK");
    expect(noBet.blockReasons).toContain("No-bet pressure is too high.");
    expect(drift.blockReasons).toContain("Drift pressure is too high.");
    expect(debt.blockReasons).toContain("Calibration debt is too high.");
  });
});
