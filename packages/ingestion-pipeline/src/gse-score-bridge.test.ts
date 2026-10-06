import { describe, expect, it } from "vitest";
import { computeGseActionScore, type GseActionScoreInput } from "@sports/prediction-engine/src/gse-score/gse-action-score.js";
import { evalGseActionScore } from "./gse-score-bridge.js";

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

describe("gse-score bridge", () => {
  it("passes a real positive edge through and still refuses to publish a pick", () => {
    const r = evalGseActionScore(validInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.kernelDecision).toBe("PLAY");
    expect(r.data.publishablePick).toBe(false);
    expect(r.data.scoreIsProbability).toBe(false);
    expect(r.data.readingKind).toBe("ACTION_QUALITY");
    expect(r.data.parliamentConfidenceIsProbability).toBe(false);
    expect(r.data.probabilityEdge).toBeGreaterThan(0);
    expect(r.data.probabilityEdge).toBeCloseTo(r.data.modeledProbability - r.data.marketProbability, 4);
    expect(r.data.score).toBeGreaterThan(70);
    expect(r.data.score).toBeLessThanOrEqual(100);
    expect(r.data.votesUsed).toBe(2);
    expect(r.data.publicationRefusal.toLowerCase()).toContain("not a pick");
  });

  it("keeps a negative edge negative and will not call it PLAY or LEAN", () => {
    const r = evalGseActionScore(
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
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.probabilityEdge).toBeLessThan(0);
    expect(r.data.kernelDecision).toBe("WATCH");
    expect(r.data.publishablePick).toBe(false);
  });

  it("forwards HARD_PASS when required data is missing and the edge is real", () => {
    const r = evalGseActionScore(
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
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.kernelDecision).toBe("HARD_PASS");
    expect(r.data.probabilityEdge).toBeGreaterThan(0.3);
    expect(r.data.score).toBeLessThanOrEqual(24);
    expect(r.data.hardPassReasons.join(" ")).toContain("Missing required data");
    expect(r.data.publishablePick).toBe(false);
  });

  it("refuses a market probability the kernel would clamp onto 1", () => {
    const input = validInput({ marketProbability: 1.4 });
    const kernel = computeGseActionScore(input);
    expect(kernel.marketProbability).toBe(1);
    const r = evalGseActionScore(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("clamp01");
    expect(r.reason).toContain("1.4");
  });

  it("refuses market probability 0, which the kernel accepts and will score", () => {
    const input = validInput({
      marketProbability: 0,
      modelParliament: {
        votes: [{ confidence: 1, evidenceWeight: 5, modelId: "ceiling-shadow", probability: 0.99 }],
      },
    });
    const kernel = computeGseActionScore(input);
    expect(kernel.marketProbability).toBe(0);
    expect(kernel.decision).toBe("PLAY");
    const r = evalGseActionScore(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("(0, 1)");
  });

  it("refuses NaN market probability", () => {
    const r = evalGseActionScore(validInput({ marketProbability: Number.NaN }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("NaN");
  });

  it("refuses a vote the kernel would drop and then score from the survivor", () => {
    const input = validInput({
      modelParliament: {
        votes: [
          { confidence: 0.9, evidenceWeight: 1, modelId: "out-of-range", probability: 1.4 },
          { confidence: 0.9, evidenceWeight: 1, modelId: "survivor", probability: 0.6 },
        ],
      },
    });
    const kernel = computeGseActionScore(input);
    expect(kernel.parliament.votesUsed).toBe(1);
    expect(kernel.modeledProbability).toBeCloseTo(0.6, 4);
    const r = evalGseActionScore(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("out-of-range");
    expect(r.reason).toContain("drops");
  });

  it("refuses the kernel's zero edge when every vote has zero evidence weight", () => {
    const input = validInput({
      modelParliament: {
        votes: [
          { confidence: 0.95, evidenceWeight: 0, modelId: "weightless-a", probability: 0.8 },
          { confidence: 0.9, evidenceWeight: 0, modelId: "weightless-b", probability: 0.62 },
        ],
      },
    });
    const kernel = computeGseActionScore(input);
    expect(kernel.modeledProbability).toBeNull();
    expect(kernel.probabilityEdge).toBe(0);
    expect(kernel.decision).toBe("HARD_PASS");
    const r = evalGseActionScore(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("missing model is not a zero edge");
    expect(r.reason).toContain("0");
  });

  it("refuses feature quality above 1, which the kernel clamps to the same health as 1", () => {
    const atOne = computeGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: 10, key: "market_fair_probability", quality: 1, required: true, value: 0.52 }],
          maxAgeMinutes: 120,
        },
      }),
    );
    const above = computeGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: 10, key: "market_fair_probability", quality: 1.5, required: true, value: 0.52 }],
          maxAgeMinutes: 120,
        },
      }),
    );
    expect(above.featureContract.featureHealth).toBe(atOne.featureContract.featureHealth);
    const r = evalGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: 10, key: "market_fair_probability", quality: 1.5, required: true, value: 0.52 }],
          maxAgeMinutes: 120,
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("quality");
    expect(r.reason).toContain("1.5");
  });

  it("refuses a non-positive maxAgeMinutes the kernel widens to 1", () => {
    const kernel = computeGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: 0.5, key: "market_fair_probability", quality: 0.9, required: true, value: 0.52 }],
          maxAgeMinutes: 0,
        },
      }),
    );
    expect(kernel.featureContract.staleFeatures).not.toContain("market_fair_probability");
    const r = evalGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: 0.5, key: "market_fair_probability", quality: 0.9, required: true, value: 0.52 }],
          maxAgeMinutes: 0,
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("Math.max(1, maxAgeMinutes)");
  });

  it("refuses a negative age the kernel treats as fresh", () => {
    const kernel = computeGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: -5, key: "market_fair_probability", quality: 0.9, required: true, value: 0.52 }],
          maxAgeMinutes: 60,
        },
      }),
    );
    expect(kernel.featureContract.staleFeatures).not.toContain("market_fair_probability");
    const r = evalGseActionScore(
      validInput({
        featureContract: {
          features: [{ ageMinutes: -5, key: "market_fair_probability", quality: 0.9, required: true, value: 0.52 }],
          maxAgeMinutes: 60,
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("ageMinutes");
  });

  it("refuses a negative calibration sample the kernel calls insufficient", () => {
    const kernel = computeGseActionScore(validInput({ calibration: { sampleCount: -3 } }));
    expect(kernel.calibration.status).toBe("INSUFFICIENT_SAMPLE");
    const r = evalGseActionScore(validInput({ calibration: { sampleCount: -3 } }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("sampleCount");
    expect(r.reason).toContain("-3");
  });

  it("refuses a no-bet severity outside [0, 1]", () => {
    const r = evalGseActionScore(
      validInput({
        additionalNoBetRisks: [
          { factor: "MARKET_VOLATILITY", reason: "book jumped", severity: 2 },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("severity");
  });
});
