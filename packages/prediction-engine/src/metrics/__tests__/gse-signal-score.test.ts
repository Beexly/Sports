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

  it("applies the role-volatility x prop-exposure penalty only when both are present", () => {
    const baseline = strongSignal({ playerPropExposure: 0, roleVolatility: 0 });
    const roleVolatilityOnly = strongSignal({ playerPropExposure: 0, roleVolatility: 70 });
    const bothHigh = strongSignal({ playerPropExposure: 70, roleVolatility: 70 });

    // The term is -0.35 * roleVolatility * playerPropExposure, so role volatility
    // is inert without prop exposure and only bites when both are elevated.
    expect(roleVolatilityOnly.score).toBe(baseline.score);
    expect(bothHigh.score).toBeLessThan(baseline.score);
  });

  it("maps score to each interior grade band and vetoes on a low score without no-bet pressure", () => {
    // Flat signal: all positive inputs equal `value`, every pressure zeroed, so the
    // grade is driven purely by the resulting score (noBetPressure stays 0 < 85).
    function flatSignal(value: number) {
      return strongSignal({
        calibrationDebt: 0,
        calibrationIntegrityGrade: value,
        driftPressure: 0,
        edgeQualityScore: value,
        marketGravityIndex: value,
        noBetPressure: 0,
        playableWindowScore: value,
        playerPropExposure: 0,
        portfolioFitScore: value,
        proprietaryPlayerSignal: value,
        roleVolatility: 0,
        signalIntegrityIndex: value,
        staleLineRiskScore: 0,
      });
    }

    const vetoed = flatSignal(0);
    expect(vetoed.score).toBeLessThanOrEqual(24);
    expect(vetoed.grade).toBe("HARD_PASS");

    expect(flatSignal(10).grade).toBe("PASS");
    expect(flatSignal(28).grade).toBe("WATCH");
    expect(flatSignal(40).grade).toBe("LEAN");
    expect(flatSignal(50).grade).toBe("SPEAK");
    expect(strongSignal().grade).toBe("STRONG");
  });
});
