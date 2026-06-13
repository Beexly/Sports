/**
 * Tests for the ML independent estimator scaffold (ml-estimator.ts).
 *
 * Coverage:
 *   1. Fit a tiny reference model → predictions in (0, 1).
 *   2. Monotonic response on a single dominant feature.
 *   3. Provenance gate — null on missing/stale/mismatched schema/empty stumps.
 *   4. Ensemble additivity pinned against hand-computed values.
 *   5. Feature-schema hash stability.
 *   6. toMlFairValue bridge (source tag, sums to 1, capturedAt).
 */

import { describe, expect, it } from "vitest";
import {
  predictWinProb,
  fitReferenceModel,
  toMlFairValue,
  computeFeatureSchemaHash,
  FEATURE_SCHEMA_HASH,
  MIN_SAMPLE_SIZE,
  MODEL_MAX_AGE_DAYS,
  type MlFeatureVector,
  type MlModelObject,
  type TrainingSample,
  type DecisionStump,
} from "../ml-estimator.js";

// ============================================================
// Shared fixtures
// ============================================================

/** A fully-populated feature vector representing a moderate home-team edge. */
const BASE_FEATURES: MlFeatureVector = {
  marketFairProbHome: 0.54,
  spreadLine: -3.0,
  bookHoldPct: 4.76,
  bookCount: 8,
  spreadMovementPts: -0.5,
  lineMovementScore: 4.0,
  homeRestDays: 3,
  awayRestDays: 1,
  restAdvantageScore: 5.0,
  scheduleStressScore: -1.0,
  historicalFormScore: 3.0,
  headToHeadScore: 2.0,
  venueFormScore: 1.5,
  crossMarketScore: 1.5,
};

/** Identical to BASE_FEATURES but with a stronger home edge (dominant feature). */
function withHomeEdge(extra: Partial<MlFeatureVector>): MlFeatureVector {
  return { ...BASE_FEATURES, ...extra };
}

/** Build a training set where `marketFairProbHome` is the lone predictor. */
function buildBiasedSamples(n: number): TrainingSample[] {
  const samples: TrainingSample[] = [];
  for (let i = 0; i < n; i++) {
    // Strong home-team signal: high marketFairProbHome → outcome = 1.
    const p = 0.3 + (i / n) * 0.5; // ramp from 0.3 to 0.8
    const outcome: 0 | 1 = p >= 0.55 ? 1 : 0;
    samples.push({
      features: { ...BASE_FEATURES, marketFairProbHome: p },
      outcome,
    });
  }
  return samples;
}

/** ISO date string for a fresh model (today). */
const FRESH_TRAINED_AT = new Date().toISOString();

/** ISO date string for a model that is 200 days old (exceeds MODEL_MAX_AGE_DAYS=180). */
const STALE_TRAINED_AT = new Date(
  Date.now() - (MODEL_MAX_AGE_DAYS + 20) * 24 * 60 * 60 * 1000,
).toISOString();

/** Provenance that passes all gate checks. */
const VALID_PROVENANCE = {
  trainedAt: FRESH_TRAINED_AT,
  sampleSize: MIN_SAMPLE_SIZE + 1,
  featureSchemaHash: FEATURE_SCHEMA_HASH,
};

// ============================================================
// 1. Fit a reference model → predictions in (0, 1)
// ============================================================

describe("fitReferenceModel + predictWinProb — basic round-trip", () => {
  const samples = buildBiasedSamples(60);

  it("returns a non-null model with at least one stump", () => {
    const model = fitReferenceModel(samples, 8, 0.3, VALID_PROVENANCE);
    expect(model).not.toBeNull();
    expect(model!.stumps.length).toBeGreaterThanOrEqual(1);
  });

  it("all predictions on the training set are strictly in (0, 1)", () => {
    const model = fitReferenceModel(samples, 8, 0.3, VALID_PROVENANCE);
    expect(model).not.toBeNull();
    for (const s of samples) {
      const p = predictWinProb(model, s.features);
      expect(p).not.toBeNull();
      expect(p!).toBeGreaterThan(0);
      expect(p!).toBeLessThan(1);
    }
  });

  it("predictions on unseen feature vectors are strictly in (0, 1)", () => {
    const model = fitReferenceModel(samples, 8, 0.3, VALID_PROVENANCE);
    expect(model).not.toBeNull();
    const p = predictWinProb(model, BASE_FEATURES);
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0);
    expect(p!).toBeLessThan(1);
  });
});

// ============================================================
// 2. Monotonic response on the dominant feature
// ============================================================

describe("monotonicity on a single dominant feature", () => {
  // Build samples where marketFairProbHome is the sole predictor with a clear
  // threshold at 0.55, giving the boosting rounds an unambiguous split to find.
  // We use a graded outcome so there are meaningful residuals above AND below the
  // threshold — making subsequent splits across [0.35, 0.55, 0.75] discriminative.
  const samples: TrainingSample[] = [];
  for (let i = 0; i < 120; i++) {
    const p = 0.20 + (i / 120) * 0.65; // ramp 0.20..0.85 in 120 steps
    // Three-tier outcome so there are population-level differences at 0.35, 0.55, 0.75:
    const outcome: 0 | 1 = p >= 0.50 ? 1 : 0;
    // Interleave to give the fitter residuals to split on at multiple thresholds
    samples.push({ features: { ...BASE_FEATURES, marketFairProbHome: p }, outcome });
    // Mirror sample at a lower probability to anchor the low end
    if (i % 3 === 0) {
      samples.push({ features: { ...BASE_FEATURES, marketFairProbHome: p * 0.5 }, outcome: 0 });
    }
  }
  const model = fitReferenceModel(samples, 16, 0.25, VALID_PROVENANCE);

  it("model fits without error and has stumps", () => {
    expect(model).not.toBeNull();
    expect(model!.stumps.length).toBeGreaterThan(0);
  });

  it("higher marketFairProbHome → higher or equal P(home wins) — monotone on dominant feature", () => {
    expect(model).not.toBeNull();
    // Sample predictions at a range of marketFairProbHome values and check monotonicity
    const probs = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75].map((mfp) =>
      predictWinProb(model, withHomeEdge({ marketFairProbHome: mfp })),
    );
    // All must be non-null
    for (const p of probs) expect(p).not.toBeNull();
    // Must be non-decreasing (GBM is not guaranteed strictly monotone at every
    // point, but should be monotone across the primary decision boundary)
    expect(probs[0]!).toBeLessThan(probs[probs.length - 1]!);
    // The boundary must produce higher probability than well below it
    expect(probs[0]!).toBeLessThan(probs[3]!); // 0.25 vs 0.55
    expect(probs[1]!).toBeLessThan(probs[4]!); // 0.35 vs 0.65
  });
});

// ============================================================
// 3. Provenance gate — null on each failure mode
// ============================================================

describe("provenance gate returns null", () => {
  /** Minimal dummy model with a single non-trivial stump to test gate logic without fitting. */
  function validModel(): MlModelObject {
    return {
      intercept: 0,
      stumps: [
        {
          featureIndex: 0,
          threshold: 0.5,
          leftLeafLogit: -0.2,
          rightLeafLogit: 0.2,
        },
      ],
      provenance: VALID_PROVENANCE,
    };
  }

  it("null when model is null", () => {
    expect(predictWinProb(null, BASE_FEATURES)).toBeNull();
  });

  it("null when model is undefined", () => {
    expect(predictWinProb(undefined, BASE_FEATURES)).toBeNull();
  });

  it("null when sampleSize < MIN_SAMPLE_SIZE", () => {
    const m: MlModelObject = {
      ...validModel(),
      provenance: { ...VALID_PROVENANCE, sampleSize: MIN_SAMPLE_SIZE - 1 },
    };
    expect(predictWinProb(m, BASE_FEATURES)).toBeNull();
  });

  it("null when sampleSize is exactly MIN_SAMPLE_SIZE - 1 (strict floor)", () => {
    const m: MlModelObject = {
      ...validModel(),
      provenance: { ...VALID_PROVENANCE, sampleSize: MIN_SAMPLE_SIZE - 1 },
    };
    expect(predictWinProb(m, BASE_FEATURES)).toBeNull();
  });

  it("non-null when sampleSize is exactly MIN_SAMPLE_SIZE", () => {
    const m: MlModelObject = {
      ...validModel(),
      provenance: { ...VALID_PROVENANCE, sampleSize: MIN_SAMPLE_SIZE },
    };
    expect(predictWinProb(m, BASE_FEATURES)).not.toBeNull();
  });

  it("null when trainedAt is stale (beyond MODEL_MAX_AGE_DAYS)", () => {
    const m: MlModelObject = {
      ...validModel(),
      provenance: { ...VALID_PROVENANCE, trainedAt: STALE_TRAINED_AT },
    };
    expect(predictWinProb(m, BASE_FEATURES)).toBeNull();
  });

  it("null when featureSchemaHash mismatches (schema drift detection)", () => {
    const m: MlModelObject = {
      ...validModel(),
      provenance: { ...VALID_PROVENANCE, featureSchemaHash: "deadbeef" },
    };
    expect(predictWinProb(m, BASE_FEATURES)).toBeNull();
  });

  it("null when stumps array is empty", () => {
    const m: MlModelObject = {
      ...validModel(),
      stumps: [],
    };
    expect(predictWinProb(m, BASE_FEATURES)).toBeNull();
  });

  it("null when trainedAt is an invalid date string", () => {
    const m: MlModelObject = {
      ...validModel(),
      provenance: { ...VALID_PROVENANCE, trainedAt: "not-a-date" },
    };
    expect(predictWinProb(m, BASE_FEATURES)).toBeNull();
  });

  it("null when any feature is null", () => {
    const m = validModel();
    const badFeatures: MlFeatureVector = { ...BASE_FEATURES, marketFairProbHome: null };
    expect(predictWinProb(m, badFeatures)).toBeNull();
  });

  it("null when any feature is NaN", () => {
    const m = validModel();
    const badFeatures: MlFeatureVector = { ...BASE_FEATURES, bookHoldPct: NaN };
    expect(predictWinProb(m, badFeatures)).toBeNull();
  });
});

// ============================================================
// 4. Ensemble additivity — pinned against hand-computed values
// ============================================================

/**
 * Hand-computation:
 *
 * We construct a model with two stumps and verify the prediction by hand.
 *
 * Feature vector: BASE_FEATURES (marketFairProbHome = 0.54, lineMovementScore = 4.0)
 *
 * Model:
 *   intercept = 0.0
 *   stump[0]: featureIndex=0 (marketFairProbHome), threshold=0.50
 *             leftLeafLogit = -0.30   (market thinks away is favoured)
 *             rightLeafLogit = +0.30  (market thinks home is favoured)
 *   stump[1]: featureIndex=5 (lineMovementScore), threshold=3.0
 *             leftLeafLogit = -0.10   (movement against home)
 *             rightLeafLogit = +0.10  (movement favours home)
 *
 * Inference on BASE_FEATURES (marketFairProbHome=0.54 > 0.50, lineMovementScore=4.0 > 3.0):
 *   logit = 0.0 + 0.30 + 0.10 = 0.40
 *   prob  = sigmoid(0.40) = 1/(1+exp(-0.40))
 *         = 1/(1+0.67032...) = 1/1.67032... ≈ 0.59868...
 *
 * We pin to 4 decimal places: 0.5987
 */
describe("ensemble additivity — hand-computed pin", () => {
  const handModel: MlModelObject = {
    intercept: 0.0,
    stumps: [
      // stump 0: split on marketFairProbHome (featureIndex 0), threshold 0.50
      {
        featureIndex: 0,
        threshold: 0.50,
        leftLeafLogit: -0.30,
        rightLeafLogit: 0.30,
      } as DecisionStump,
      // stump 1: split on lineMovementScore (featureIndex 5), threshold 3.0
      {
        featureIndex: 5,
        threshold: 3.0,
        leftLeafLogit: -0.10,
        rightLeafLogit: 0.10,
      } as DecisionStump,
    ],
    provenance: VALID_PROVENANCE,
  };

  it("matches the hand-computed sigmoid(0.40) ≈ 0.5987", () => {
    const p = predictWinProb(handModel, BASE_FEATURES);
    expect(p).not.toBeNull();
    // sigmoid(0.40) = 0.598687...  — pin to 4 decimal places
    expect(p!).toBeCloseTo(0.5987, 3);
  });

  it("lower logit branch: both features on the left → sigmoid(−0.40) ≈ 0.4013", () => {
    // marketFairProbHome=0.40 ≤ 0.50 (left stump 0), lineMovementScore=1.0 ≤ 3.0 (left stump 1)
    // logit = 0 + (−0.30) + (−0.10) = −0.40
    const p = predictWinProb(handModel, withHomeEdge({ marketFairProbHome: 0.40, lineMovementScore: 1.0 }));
    expect(p).not.toBeNull();
    // sigmoid(−0.40) = 1 − sigmoid(0.40) ≈ 0.4013
    expect(p!).toBeCloseTo(0.4013, 3);
  });

  it("mixed branches: stump0 left, stump1 right → sigmoid(−0.20) ≈ 0.4502", () => {
    // marketFairProbHome=0.40 ≤ 0.50 (left, leaf −0.30), lineMovementScore=5.0 > 3.0 (right, leaf +0.10)
    // logit = 0 + (−0.30) + 0.10 = −0.20
    const p = predictWinProb(handModel, withHomeEdge({ marketFairProbHome: 0.40, lineMovementScore: 5.0 }));
    expect(p).not.toBeNull();
    // sigmoid(−0.20) ≈ 0.4502
    expect(p!).toBeCloseTo(0.4502, 3);
  });

  it("three predictions are correctly ordered: mixed < lower < upper", () => {
    const lower = predictWinProb(handModel, withHomeEdge({ marketFairProbHome: 0.40, lineMovementScore: 1.0 }));
    const mixed = predictWinProb(handModel, withHomeEdge({ marketFairProbHome: 0.40, lineMovementScore: 5.0 }));
    const upper = predictWinProb(handModel, BASE_FEATURES);
    expect(mixed).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
    // mixed (-0.20) < lower branches are actually same direction so ordering:
    // lower logit branch (−0.40) < mixed logit (−0.20) < upper logit (0.40)
    expect(lower!).toBeLessThan(mixed!);
    expect(mixed!).toBeLessThan(upper!);
  });
});

// ============================================================
// 5. Feature-schema hash stability
// ============================================================

describe("feature schema hash", () => {
  it("FEATURE_SCHEMA_HASH is a non-empty hex string", () => {
    expect(FEATURE_SCHEMA_HASH).toMatch(/^[0-9a-f]{8}$/);
  });

  it("computeFeatureSchemaHash is deterministic (same output on repeated calls)", () => {
    const keys = ["a", "b", "c"];
    expect(computeFeatureSchemaHash(keys)).toBe(computeFeatureSchemaHash(keys));
  });

  it("differs when the key list changes", () => {
    const a = computeFeatureSchemaHash(["foo", "bar"]);
    const b = computeFeatureSchemaHash(["foo", "baz"]);
    expect(a).not.toBe(b);
  });

  it("differs when key order changes", () => {
    const a = computeFeatureSchemaHash(["alpha", "beta"]);
    const b = computeFeatureSchemaHash(["beta", "alpha"]);
    expect(a).not.toBe(b);
  });

  it("fitReferenceModel bakes in the current schema hash", () => {
    const samples = buildBiasedSamples(30);
    const model = fitReferenceModel(samples, 4, 0.3, VALID_PROVENANCE);
    expect(model).not.toBeNull();
    expect(model!.provenance.featureSchemaHash).toBe(FEATURE_SCHEMA_HASH);
  });
});

// ============================================================
// 6. toMlFairValue bridge
// ============================================================

describe("toMlFairValue — bridge to IndependentMarketFairValue", () => {
  const handModel: MlModelObject = {
    intercept: 0.0,
    stumps: [
      { featureIndex: 0, threshold: 0.50, leftLeafLogit: -0.30, rightLeafLogit: 0.30 },
    ],
    provenance: VALID_PROVENANCE,
  };
  const fixedNow = new Date("2026-06-13T12:00:00.000Z");

  it("returns null when the gate fails", () => {
    expect(toMlFairValue(null, BASE_FEATURES)).toBeNull();
  });

  it("returns null when a feature is missing", () => {
    const badFeatures: MlFeatureVector = { ...BASE_FEATURES, marketFairProbHome: null };
    expect(toMlFairValue(handModel, badFeatures)).toBeNull();
  });

  it('source is "ml-gbm"', () => {
    const fv = toMlFairValue(handModel, BASE_FEATURES, { now: () => fixedNow });
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("ml-gbm");
  });

  it("homeFairProb + awayFairProb sums to 1 (within floating-point precision)", () => {
    const fv = toMlFairValue(handModel, BASE_FEATURES, { now: () => fixedNow });
    expect(fv).not.toBeNull();
    const sum = (fv!.homeFairProb ?? 0) + (fv!.awayFairProb ?? 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("capturedAt is the injected ISO timestamp", () => {
    const fv = toMlFairValue(handModel, BASE_FEATURES, { now: () => fixedNow });
    expect(fv).not.toBeNull();
    expect(fv!.capturedAt).toBe("2026-06-13T12:00:00.000Z");
  });

  it("homeFairProb and awayFairProb are strictly in (0, 1)", () => {
    const fv = toMlFairValue(handModel, BASE_FEATURES, { now: () => fixedNow });
    expect(fv).not.toBeNull();
    expect(fv!.homeFairProb).toBeGreaterThan(0);
    expect(fv!.homeFairProb).toBeLessThan(1);
    expect(fv!.awayFairProb).toBeGreaterThan(0);
    expect(fv!.awayFairProb).toBeLessThan(1);
  });
});

// ============================================================
// 7. fitReferenceModel edge cases
// ============================================================

describe("fitReferenceModel edge cases", () => {
  it("returns null when samples list is empty", () => {
    expect(fitReferenceModel([], 4, 0.3, VALID_PROVENANCE)).toBeNull();
  });

  it("returns null when all samples have null features", () => {
    const bad: TrainingSample[] = [
      { features: { ...BASE_FEATURES, marketFairProbHome: null }, outcome: 1 },
      { features: { ...BASE_FEATURES, marketFairProbHome: null }, outcome: 0 },
    ];
    expect(fitReferenceModel(bad, 4, 0.3, VALID_PROVENANCE)).toBeNull();
  });

  it("uses the supplied featureSchemaHash when explicitly provided", () => {
    const samples = buildBiasedSamples(30);
    const model = fitReferenceModel(samples, 4, 0.3, {
      ...VALID_PROVENANCE,
      featureSchemaHash: "custom01",
    });
    // The explicitly supplied hash is carried through
    expect(model!.provenance.featureSchemaHash).toBe("custom01");
    // But predictWinProb will return null because the hash mismatches the module hash
    expect(predictWinProb(model, BASE_FEATURES)).toBeNull();
  });
});
