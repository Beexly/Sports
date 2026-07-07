import { describe, expect, it } from "vitest";
import { playableWindowScore, type PlayableWindowScoreInput } from "../decision/playable-window-score.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-market-derived",
  status: "approved",
};

const openInput: PlayableWindowScoreInput = {
  calibrationDebt: 6,
  driftPressure: 8,
  evidenceHealth: 92,
  marketGravityIndex: 76,
  marketSignalAllowed: true,
  modelAgreement: 0.82,
  noBetPressure: 8,
  qbBurdenIndex: 18,
  roleVolatilityIndex: 12,
  signalIntegrityIndex: 86,
  sourcePolicy: [approvedSource],
  staleLineRiskScore: 7,
};

describe("playableWindowScore", () => {
  it("opens only for fresh, source-clean, low-pressure decision windows", () => {
    const result = playableWindowScore(openInput);

    expect(result.metricId).toBe("playable-window-score");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.decisionWindowAllowed).toBe(true);
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.band).toBe("OPEN");
    expect(result.score).toBeGreaterThanOrEqual(72);
    expect(result.blockReasons).toEqual([]);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("cannot treat stale or disallowed market data as an open playable window", () => {
    const clean = playableWindowScore(openInput);
    const stale = playableWindowScore({
      ...openInput,
      marketGravityIndex: 96,
      marketSignalAllowed: false,
      staleLineRiskScore: 92,
    });

    expect(stale.score).toBeLessThan(clean.score);
    expect(stale.decisionWindowAllowed).toBe(false);
    expect(stale.band).toBe("CLOSED");
    expect(stale.score).toBeLessThanOrEqual(24);
    expect(stale.uncertaintyBand).toBe("HIGH");
    expect(stale.blockReasons.join(" ")).toContain("Market signal");
  });

  it("decreases when no-bet pressure, drift pressure, or calibration debt rises", () => {
    const clean = playableWindowScore(openInput);
    const noBet = playableWindowScore({ ...openInput, noBetPressure: 72 });
    const drift = playableWindowScore({ ...openInput, driftPressure: 72 });
    const debt = playableWindowScore({ ...openInput, calibrationDebt: 72 });
    const combined = playableWindowScore({
      ...openInput,
      calibrationDebt: 78,
      driftPressure: 78,
      noBetPressure: 78,
    });

    expect(noBet.score).toBeLessThan(clean.score);
    expect(drift.score).toBeLessThan(clean.score);
    expect(debt.score).toBeLessThan(clean.score);
    expect(combined.score).toBeLessThan(noBet.score);
    expect(combined.drivers.map((driver) => driver.name)).toContain("no_bet_pressure");
  });

  it("fails closed for blocked sources and extreme refusal pressures", () => {
    const blockedSource = playableWindowScore({
      ...openInput,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });
    const noBetBlock = playableWindowScore({ ...openInput, noBetPressure: 90 });
    const driftBlock = playableWindowScore({ ...openInput, driftPressure: 85 });
    const debtBlock = playableWindowScore({ ...openInput, calibrationDebt: 85 });

    expect(blockedSource.sourcePosture).toBe("BLOCKED");
    expect(blockedSource.decisionWindowAllowed).toBe(false);
    expect(blockedSource.band).toBe("CLOSED");
    expect(noBetBlock.decisionWindowAllowed).toBe(false);
    expect(driftBlock.decisionWindowAllowed).toBe(false);
    expect(debtBlock.decisionWindowAllowed).toBe(false);
    expect(noBetBlock.blockReasons.join(" ")).toContain("No-bet pressure");
    expect(driftBlock.blockReasons.join(" ")).toContain("Drift pressure");
    expect(debtBlock.blockReasons.join(" ")).toContain("Calibration debt");
  });

  it("narrows when role volatility or quarterback burden rises", () => {
    const clean = playableWindowScore(openInput);
    const roleVolatile = playableWindowScore({ ...openInput, roleVolatilityIndex: 82 });
    const qbBurdened = playableWindowScore({ ...openInput, qbBurdenIndex: 84 });
    const both = playableWindowScore({ ...openInput, qbBurdenIndex: 84, roleVolatilityIndex: 82 });

    expect(roleVolatile.score).toBeLessThan(clean.score);
    expect(qbBurdened.score).toBeLessThan(clean.score);
    expect(both.score).toBeLessThan(roleVolatile.score);
    expect(both.drivers.map((driver) => driver.name)).toContain("role_volatility");
  });

  it("flags restricted-but-allowed sources as REVIEW without closing the window", () => {
    const result = playableWindowScore({
      ...openInput,
      sourcePolicy: [{ ...approvedSource, status: "restricted" }],
    });

    expect(result.sourcePosture).toBe("REVIEW");
    expect(result.decisionWindowAllowed).toBe(true);
    const reviewDriver = result.drivers.find((driver) => driver.name === "source_posture_review_pressure");
    expect(reviewDriver?.direction).toBe("DOWN");
  });

  it("fails closed with a BLOCKED posture when the source policy is empty", () => {
    const result = playableWindowScore({ ...openInput, sourcePolicy: [] });

    expect(result.sourcePosture).toBe("BLOCKED");
    expect(result.decisionWindowAllowed).toBe(false);
    expect(result.band).toBe("CLOSED");
    expect(result.blockReasons.join(" ")).toContain("Source policy blocks modeling.");
  });

  it("does not treat model agreement as a data proxy that inflates uncertainty", () => {
    const withAgreement = playableWindowScore(openInput);
    const withoutAgreement = playableWindowScore({ ...openInput, modelAgreement: undefined });

    expect(withAgreement.uncertaintyBand).toBe("MEDIUM");
    expect(withAgreement.uncertaintyBand).toBe(withoutAgreement.uncertaintyBand);
    expect(withAgreement.confidenceScore).toBeCloseTo(withoutAgreement.confidenceScore, 2);
  });

  it("keeps readiness separate from confidence, EV, and betting advice", () => {
    const result = playableWindowScore({
      ...openInput,
      evidenceHealth: 52,
      modelAgreement: 0.42,
      roleVolatilityIndex: 58,
    });

    expect(result.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE");
    expect(result.confidenceScore).not.toBeCloseTo(result.score, 2);
    expect(result.probability).toBeNull();
    expect(result.birthCertificate.metricId).toBe("playable-window-score");
  });
});
