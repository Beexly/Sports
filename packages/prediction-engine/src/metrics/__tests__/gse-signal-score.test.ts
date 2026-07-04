import { describe, expect, it } from "vitest";
import { gseSignalScore } from "../decision/gse-signal-score.js";

function strongSignal(overrides: Partial<Parameters<typeof gseSignalScore>[0]> = {}) {
  return gseSignalScore({
    calibrationDebt: 8,
    calibrationIntegrityGrade: 88,
    driftPressure: 10,
    edgeQualityScore: 86,
    marketGravityIndex: 72,
    modelAgreement: 0.86,
    noBetPressure: 12,
    playableWindowScore: 78,
    portfolioFitScore: 76,
    proprietaryPlayerSignal: 70,
    signalIntegrityIndex: 90,
    staleLineRiskScore: 8,
    ...overrides,
  });
}

describe("gseSignalScore", () => {
  it("is decision quality, not win probability", () => {
    const result = strongSignal();

    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("DECISION_QUALITY_NOT_WIN_PROBABILITY");
    expect(result.score).toBeGreaterThan(70);
    expect(Object.prototype.hasOwnProperty.call(result.drivers[0], "weight")).toBe(false);
  });

  it("decreases when no-bet pressure, drift pressure, or calibration debt rises", () => {
    const clean = strongSignal();
    const noBetOnly = strongSignal({ noBetPressure: 88 });
    const driftOnly = strongSignal({ driftPressure: 78 });
    const debtOnly = strongSignal({ calibrationDebt: 80 });
    const pressured = strongSignal({
      calibrationDebt: 80,
      driftPressure: 78,
      noBetPressure: 88,
      roleVolatility: 70,
      staleLineRiskScore: 80,
    });

    expect(noBetOnly.score).toBeLessThan(clean.score);
    expect(driftOnly.score).toBeLessThan(clean.score);
    expect(debtOnly.score).toBeLessThan(clean.score);
    expect(pressured.score).toBeLessThan(clean.score);
    expect(pressured.grade).toBe("HARD_PASS");
    expect(pressured.drivers.some((driver) => driver.name === "no_bet_pressure" && driver.direction === "DOWN")).toBe(true);
  });
});
