import { describe, expect, it } from "vitest";
import { gseSignalScore } from "../../metrics/decision/gse-signal-score.js";
import { marketGravityIndex } from "../../metrics/market/market-gravity-index.js";
import { dataReliabilityIndex } from "../../metrics/source/data-reliability-index.js";
import { computeGseActionScore, type GseActionScoreInput } from "../gse-action-score.js";

const BLOCKED_DECISIONS = ["PASS", "HARD_PASS"] satisfies readonly string[];
const RESTRAINED_DECISIONS = ["WATCH", "PASS", "HARD_PASS"] satisfies readonly string[];

function highEdgeInput(overrides: Partial<GseActionScoreInput> = {}): GseActionScoreInput {
  return {
    calibration: {
      baselineBrierScore: 0.24,
      brierScore: 0.2,
      driftScore: 0.01,
      expectedCalibrationError: 0.025,
      sampleCount: 700,
    },
    featureContract: {
      features: [
        {
          ageMinutes: 8,
          key: "market_fair_probability",
          quality: 0.97,
          required: true,
          sourcePolicy: { allowedForModeling: true, sourceId: "market-consensus", status: "allowed" },
          value: 0.49,
        },
        {
          ageMinutes: 12,
          key: "data_reliability_index",
          quality: 0.95,
          required: true,
          sourcePolicy: { allowedForModeling: true, sourceId: "cleared-derived-metric", status: "allowed" },
          value: 88,
        },
      ],
      maxAgeMinutes: 60,
    },
    marketProbability: 0.49,
    modelParliament: {
      votes: [
        { confidence: 0.94, evidenceWeight: 1, modelId: "edge-shadow-a", probability: 0.81 },
        { confidence: 0.91, evidenceWeight: 1, modelId: "edge-shadow-b", probability: 0.8 },
      ],
    },
    ...overrides,
  };
}

describe("no-bet governor integration", () => {
  it("forces a hard pass when required evidence is missing despite high edge", () => {
    // Given
    const input = highEdgeInput({
      featureContract: { features: [], requiredFeatureKeys: ["market_fair_probability", "injury_status"] },
    });

    // When
    const result = computeGseActionScore(input);

    // Then
    expect(result.probabilityEdge).toBeGreaterThan(0.3);
    expect(result.decision).toBe("HARD_PASS");
    expect(result.noBet.hardPassReasons.join(" ")).toContain("Missing required data");
  });

  it("forces a hard pass when market gravity is stale instead of treating movement as clean signal", () => {
    // Given
    const staleMarket = marketGravityIndex({
      bookLines: [-1.5, -1.5, -1],
      currentLine: -3.5,
      freshnessTtlMinutes: 45,
      hoursToStart: 2,
      marketType: "spread",
      openingLine: -1,
      sourceAgeMinutes: 180,
    });
    const input = highEdgeInput({
      featureContract: {
        features: [
          {
            ageMinutes: 180,
            key: "market_gravity_index",
            quality: staleMarket.score / 100,
            required: true,
            sourcePolicy: { allowedForModeling: true, sourceId: "market-consensus", status: "allowed" },
            value: staleMarket.score,
          },
        ],
        maxAgeMinutes: 45,
      },
    });

    // When
    const result = computeGseActionScore(input);

    // Then
    expect(staleMarket.stale).toBe(true);
    expect(staleMarket.signal).toBe("NO_SIGNAL");
    expect(result.decision).toBe("HARD_PASS");
    expect(result.featureContract.staleRequired).toContain("market_gravity_index");
  });

  it("hard-passes unclear source rights even when the modeled edge is large", () => {
    // Given
    const reliability = dataReliabilityIndex({
      expectedSourceCount: 3,
      missingRequiredFields: 1,
      providerTrustScore: 0.5,
      rightsStatus: "unknown",
      sourceAgeMinutes: 15,
      sourceCount: 1,
      ttlMinutes: 60,
    });
    const input = highEdgeInput({
      featureContract: {
        features: [
          {
            ageMinutes: 15,
            key: "data_reliability_index",
            quality: reliability.score / 100,
            required: true,
            sourcePolicy: { allowedForModeling: false, sourceId: "unclear-source", status: "unknown" },
            value: reliability.score,
          },
        ],
      },
    });

    // When
    const result = computeGseActionScore(input);

    // Then
    expect(reliability.grade).toBe("BLOCKED");
    expect(result.decision).toBe("HARD_PASS");
    expect(result.featureContract.blockedSources).toContain("data_reliability_index");
  });

  it("prevents drift pressure from becoming a play or lean even with high expected edge", () => {
    // Given
    const input = highEdgeInput({
      calibration: {
        driftScore: 0.32,
        expectedCalibrationError: 0.03,
        maxDriftScore: 0.08,
        sampleCount: 700,
      },
    });

    // When
    const result = computeGseActionScore(input);

    // Then
    expect(result.calibration.status).toBe("DRIFTING");
    expect(BLOCKED_DECISIONS).toContain(result.decision);
    expect(result.score).toBeLessThan(55);
    expect(result.noBet.drivers.map((driver) => driver.name)).toContain("CALIBRATION_NOT_VALIDATED");
  });

  it("caps calibration debt below action even when the edge looks attractive", () => {
    // Given
    const debtSignal = gseSignalScore({
      calibrationDebt: 88,
      calibrationIntegrityGrade: 42,
      driftPressure: 20,
      edgeQualityScore: 92,
      marketGravityIndex: 70,
      noBetPressure: 20,
      portfolioFitScore: 80,
      proprietaryPlayerSignal: 78,
      signalIntegrityIndex: 72,
    });
    const input = highEdgeInput({
      calibration: {
        baselineBrierScore: 0.22,
        brierScore: 0.24,
        expectedCalibrationError: 0.11,
        sampleCount: 700,
      },
    });

    // When
    const result = computeGseActionScore(input);

    // Then
    expect(debtSignal.grade).not.toBe("STRONG");
    expect(result.calibration.probabilityClaimsAllowed).toBe(false);
    expect(RESTRAINED_DECISIONS).toContain(result.decision);
    expect(result.score).toBeLessThan(55);
  });
});
