import { describe, expect, it } from "vitest";
import { computeGseActionScore, type GseActionScoreInput } from "../gse-action-score.js";

function validInput(overrides: Partial<GseActionScoreInput> = {}): GseActionScoreInput {
  return {
    calibration: {
      baselineBrierScore: 0.23,
      brierScore: 0.21,
      driftScore: 0.02,
      expectedCalibrationError: 0.025,
      sampleCount: 500,
    },
    featureContract: {
      features: [
        {
          ageMinutes: 10,
          key: "market_fair_probability",
          quality: 0.96,
          required: true,
          sourcePolicy: {
            allowedForModeling: true,
            sourceId: "market-consensus",
            status: "allowed",
          },
          value: 0.52,
        },
        {
          ageMinutes: 15,
          key: "source_freshness_score",
          quality: 0.92,
          value: 0.92,
        },
      ],
      maxAgeMinutes: 120,
    },
    marketProbability: 0.52,
    modelParliament: {
      votes: [
        { confidence: 0.9, evidenceWeight: 1, modelId: "elo-shadow", probability: 0.61 },
        { confidence: 0.86, evidenceWeight: 1, modelId: "market-reconcile-shadow", probability: 0.6 },
      ],
    },
    ...overrides,
  };
}

describe("computeGseActionScore", () => {
  it("keeps modeled probability separate from decision confidence", () => {
    const result = computeGseActionScore(
      validInput({
        marketProbability: 0.5,
        modelParliament: {
          votes: [
            { confidence: 0.24, evidenceWeight: 1, modelId: "high-prob-low-confidence", probability: 0.76 },
          ],
        },
      }),
    );

    expect(result.modeledProbability).toBeGreaterThan(0.7);
    expect(result.confidenceScore).toBeLessThan(35);
    expect(result.confidenceScore).not.toBeCloseTo((result.modeledProbability ?? 0) * 100, 2);
  });

  it("can produce a high action score only when evidence, model, and calibration gates survive", () => {
    const result = computeGseActionScore(validInput());

    expect(result.score).toBeGreaterThan(70);
    expect(result.decision).toBe("PLAY");
    expect(result.calibration.probabilityClaimsAllowed).toBe(true);
    expect(result.noBetStrength).toBeLessThan(5);
  });

  it("forces HARD_PASS when required data is missing even if modeled edge is large", () => {
    const result = computeGseActionScore(
      validInput({
        featureContract: {
          features: [],
          requiredFeatureKeys: ["market_fair_probability", "injury_status"],
        },
        marketProbability: 0.48,
        modelParliament: {
          votes: [{ confidence: 0.95, evidenceWeight: 1, modelId: "aggressive-shadow", probability: 0.82 }],
        },
      }),
    );

    expect(result.probabilityEdge).toBeGreaterThan(0.3);
    expect(result.decision).toBe("HARD_PASS");
    expect(result.score).toBeLessThanOrEqual(24);
    expect(result.noBet.hardPassReasons.join(" ")).toContain("Missing required data");
  });

  it("penalizes model disagreement against an otherwise similar consensus slate", () => {
    const consensus = computeGseActionScore(validInput());
    const split = computeGseActionScore(
      validInput({
        modelParliament: {
          votes: [
            { confidence: 0.95, evidenceWeight: 1, modelId: "bull", probability: 0.8 },
            { confidence: 0.95, evidenceWeight: 1, modelId: "bear", probability: 0.42 },
          ],
        },
      }),
    );

    expect(split.parliament.disagreement).toBeGreaterThan(consensus.parliament.disagreement);
    expect(split.noBetStrength).toBeGreaterThan(consensus.noBetStrength);
    expect(split.score).toBeLessThan(consensus.score);
  });

  it("blocks action for stale required data", () => {
    const fresh = computeGseActionScore(validInput());
    const stale = computeGseActionScore(
      validInput({
        featureContract: {
          features: [
            { ageMinutes: 240, key: "market_fair_probability", quality: 0.9, required: true, value: 0.52 },
          ],
          maxAgeMinutes: 60,
        },
      }),
    );

    expect(stale.featureContract.status).toBe("BLOCK");
    expect(stale.featureContract.staleRequired).toContain("market_fair_probability");
    expect(stale.decision).toBe("HARD_PASS");
    expect(stale.noBetStrength).toBeGreaterThan(fresh.noBetStrength);
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("never recommends LEAN or PLAY when the modeled edge is non-positive", () => {
    const result = computeGseActionScore(
      validInput({
        marketProbability: 0.7,
        modelParliament: {
          votes: [
            { confidence: 0.95, evidenceWeight: 1, modelId: "under-market-a", probability: 0.55 },
            { confidence: 0.95, evidenceWeight: 1, modelId: "under-market-b", probability: 0.55 },
          ],
        },
      }),
    );

    expect(result.modeledProbability).not.toBeNull();
    expect(result.modeledProbability ?? 1).toBeLessThanOrEqual(result.marketProbability);
    expect(result.probabilityEdge).toBeLessThanOrEqual(0);
    expect(result.decision).not.toBe("LEAN");
    expect(result.decision).not.toBe("PLAY");
    expect(result.decision).toBe("WATCH");
  });

  it("forces HARD_PASS with null modeled probability when all model votes carry zero evidence weight", () => {
    const result = computeGseActionScore(
      validInput({
        modelParliament: {
          votes: [
            { confidence: 0.95, evidenceWeight: 0, modelId: "weightless-a", probability: 0.8 },
            { confidence: 0.9, evidenceWeight: 0, modelId: "weightless-b", probability: 0.62 },
          ],
        },
      }),
    );

    expect(result.parliament.status).toBe("BLOCK");
    expect(result.modeledProbability).toBeNull();
    expect(result.probabilityEdge).toBe(0);
    expect(result.decision).toBe("HARD_PASS");
  });

  it("clamps scores to the 0-100 range and exposes drivers without internal weights", () => {
    const high = computeGseActionScore(
      validInput({
        marketProbability: 0,
        modelParliament: {
          votes: [{ confidence: 1, evidenceWeight: 5, modelId: "ceiling-shadow", probability: 0.99 }],
        },
      }),
    );
    const low = computeGseActionScore(
      validInput({
        additionalNoBetRisks: [
          {
            factor: "RESPONSIBLE_GAMING",
            hardBlock: true,
            reason: "Responsible-gaming fence blocks the action.",
            severity: 1,
          },
        ],
      }),
    );

    expect(high.score).toBeLessThanOrEqual(100);
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.decision).toBe("HARD_PASS");
    expect(high.drivers.length).toBeGreaterThan(0);
    expect(Object.prototype.hasOwnProperty.call(high.drivers[0], "weight")).toBe(false);
  });
});
