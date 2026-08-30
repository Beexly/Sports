/**
 * ML independent estimator — gradient-boosted stumps (GBM) scaffold.
 *
 * WHAT THIS IS
 * An independent estimator candidate that feeds `independentFairValues` in the
 * edge engine (edge-engine.ts) ONLY after calibration proves it. That is the
 * same law governing the Poisson and Elo estimators: a new independent can raise
 * or lower `trueProb`, which in turn widens or narrows the gap from the
 * sportsbook's fair price — so we earn the right to call something "independent"
 * by demonstrating it is actually calibrated against settled results, not just
 * mathematically runnable. See repo-firehose-review.md build-queue item #4 and
 * edge-engine.ts for the full independent-referee pattern.
 *
 * CONCEPT SOURCE
 * kyleskom/NBA-Machine-Learning-Sports-Betting (XGBoost + NN win/totals model).
 * The Python XGBoost library is NOT ported — no new heavy dependencies. The
 * concept (gradient boosted trees for sport win probability from structured
 * features) is implemented here as a minimal, pure-TypeScript gradient-boosted
 * stump ensemble:
 *   • Each stump is a depth-1 decision tree: one feature, one threshold, two leaf
 *     values (logit-space predictions).
 *   • Inference: sum all stump leaf contributions (additive) then apply the
 *     logistic sigmoid to produce a calibrated probability in (0, 1).
 *   • Fitting (reference/test only): greedy single-variable split minimizing
 *     squared-error on pseudo-residuals, one stump per boosting round.
 * This is genuine GBM math that round-trips: fit → predict → compare with
 * hand-computed values. It cannot be used in production without real training
 * data, provenance metadata, and calibration (the gate enforces this).
 *
 * HONESTY GATE
 * `predictWinProb` returns `null` — never a guess — when any of these fail:
 *   1. `model` is null or undefined.
 *   2. `model.provenance.sampleSize` is below `MIN_SAMPLE_SIZE` (documented floor).
 *   3. `model.provenance.trainedAt` is older than `MODEL_MAX_AGE_DAYS`, OR is not
 *      a parseable ISO timestamp. NOTE: this staleness check is one-sided — it
 *      rejects models that are too OLD but does NOT reject a `trainedAt` dated in
 *      the future (a future date yields a negative age, which passes the
 *      upper-bound test). A clock-skewed or corrupt future training date is
 *      therefore served, not gated; callers needing future-date rejection must
 *      validate provenance upstream.
 *   4. `model.provenance.featureSchemaHash` does not match `FEATURE_SCHEMA_HASH`
 *      (the deterministic hash of `MlFeatureVector`'s own field names, computed
 *      once at module load). A mismatched schema means the model was fit on
 *      different features; serving it would be silently wrong.
 *   5. `model.stumps` is empty (the ensemble has no opinion to serve).
 *   6. any field in `features` is null or non-finite (no silent imputation).
 *
 * DETERMINISM / CLOCK SEAM
 * The inference math is pure. The one impurity is the staleness gate's clock:
 * `predictWinProb` / `toMlFairValue` accept an injectable `options.now`, and when
 * it is omitted they fall back to an argless wall-clock `() => new Date()`. That
 * default is the module's single non-deterministic seam — two runs on identical
 * inputs straddling the `MODEL_MAX_AGE_DAYS` boundary can disagree. Production and
 * any reproducibility-sensitive caller MUST inject `now` at the I/O boundary (as
 * the tests do); the default exists only as a convenience escape hatch.
 *
 * Types, feature contract, inference math, the deterministic reference fitter,
 * and all gate logic live here. Wiring into the scorer is a separate,
 * founder-gated step (identical protocol to Poisson / Elo). The reference fitter
 * is test-only and is clearly labelled as such.
 */

import type { IndependentMarketFairValue } from "@sports/types";

// ============================================================
// Feature contract
// ============================================================

/**
 * The ML model's input vector. Every field must be derivable from data the
 * engine already computes or ingests — no fabricated stats.
 *
 * Odds/line-derived: from the sportsbook market (market-read.ts).
 * Rest/schedule:     from game schedule metadata (game-context.ts).
 * Form aggregates:   from ATS history (game-context.ts).
 *
 * All fields are `number | null`. `null` means the feature is genuinely
 * unavailable for this game (absent data, new team, etc.) — the predictor
 * requires all fields to be finite; a null in any field causes `predictWinProb`
 * to return `null`. We never impute silently.
 */
export interface MlFeatureVector {
  // ---- Odds / line -derived (sportsbook market, de-vigged) ----
  /** De-vigged fair P(home wins) per the consensus market, 0–1. */
  readonly marketFairProbHome: number | null;
  /** Spread line for the home side (negative = home is favored). */
  readonly spreadLine: number | null;
  /** Bookmaker hold as a percentage, e.g. 4.76 for a -110/-110 line. */
  readonly bookHoldPct: number | null;
  /** Number of sportsbooks covering this game (market depth). */
  readonly bookCount: number | null;

  // ---- Line movement (game-context.ts: computeLineMovementScore) ----
  /** Spread movement since opening: current − opening, in points. */
  readonly spreadMovementPts: number | null;
  /**
   * Normalised line-movement score from computeLineMovementScore, −15 to +15.
   * Positive = sharp-money signal for the home side.
   */
  readonly lineMovementScore: number | null;

  // ---- Rest / schedule (game-context.ts: computeRestAdvantageScore) ----
  /** Home team days of rest before this game (0 = back-to-back). */
  readonly homeRestDays: number | null;
  /** Away team days of rest before this game. */
  readonly awayRestDays: number | null;
  /**
   * Normalised rest-advantage score from computeRestAdvantageScore, −10 to +10.
   * Positive = home side better rested.
   */
  readonly restAdvantageScore: number | null;
  /**
   * Normalised schedule-stress score from computeScheduleStressScore, −5 to +5.
   * Negative = the home team faces schedule fatigue.
   */
  readonly scheduleStressScore: number | null;

  // ---- Form aggregates (game-context.ts: computeHistoricalFormScore) ----
  /**
   * Normalised ATS form score from computeHistoricalFormScore, −10 to +10.
   * Positive = home side on a good ATS run.
   */
  readonly historicalFormScore: number | null;
  /**
   * Normalised head-to-head ATS score from computeHeadToHeadScore, −5 to +5.
   */
  readonly headToHeadScore: number | null;
  /**
   * Normalised venue-form score from computeVenueFormScore, −5 to +5.
   */
  readonly venueFormScore: number | null;
  /**
   * Cross-market (spread vs moneyline) agreement score from
   * computeCrossMarketScore, −3 to +4.
   */
  readonly crossMarketScore: number | null;
}

/** Ordered list of feature keys — canonical ordering must never change once
 *  a model is fit. Used to compute `FEATURE_SCHEMA_HASH`. */
const FEATURE_KEYS: ReadonlyArray<keyof MlFeatureVector> = [
  "marketFairProbHome",
  "spreadLine",
  "bookHoldPct",
  "bookCount",
  "spreadMovementPts",
  "lineMovementScore",
  "homeRestDays",
  "awayRestDays",
  "restAdvantageScore",
  "scheduleStressScore",
  "historicalFormScore",
  "headToHeadScore",
  "venueFormScore",
  "crossMarketScore",
] as const;

// ============================================================
// Deterministic feature-schema hash
// ============================================================

/**
 * A deterministic, collision-resistant hash of the feature schema (the ordered
 * list of field names). Computed once at module load and baked into every
 * trained model's provenance. If the field list changes, the hash changes, and
 * any previously trained model will fail the provenance gate — making stale
 * models un-servable rather than silently wrong.
 *
 * Implementation: djb2-style (polynomial rolling hash over char codes). Fast,
 * deterministic, zero deps. Not cryptographic — this is a schema-drift detector,
 * not a security primitive.
 */
export function computeFeatureSchemaHash(keys: readonly string[]): string {
  const joined = keys.join("|");
  let h = 5381;
  for (let i = 0; i < joined.length; i++) {
    // djb2: h = h * 33 XOR char
    h = ((h << 5) + h) ^ (joined.charCodeAt(i) & 0xff);
    h = h | 0; // keep as int32
  }
  // Return as unsigned 8-char hex
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** The canonical schema hash for the current `MlFeatureVector` field list. */
export const FEATURE_SCHEMA_HASH: string = computeFeatureSchemaHash(FEATURE_KEYS);

// ============================================================
// Model object — stumps + provenance
// ============================================================

/** A single depth-1 decision stump in logit space. */
export interface DecisionStump {
  /** Index into the canonical FEATURE_KEYS ordering (0-based). */
  readonly featureIndex: number;
  /** Split threshold; if feature value ≤ threshold → left leaf, else → right. */
  readonly threshold: number;
  /** Left leaf value in logit (log-odds) space. */
  readonly leftLeafLogit: number;
  /** Right leaf value in logit (log-odds) space. */
  readonly rightLeafLogit: number;
}

/** Provenance metadata required by the honesty gate. */
export interface MlModelProvenance {
  /**
   * ISO timestamp when training concluded. The gate rejects models older than
   * `MODEL_MAX_AGE_DAYS` so stale weights are never served silently.
   */
  readonly trainedAt: string;
  /**
   * Number of real, settled training samples. The gate rejects models with
   * fewer than `MIN_SAMPLE_SIZE` samples (below this the pseudo-residuals are
   * too noisy to produce a calibrated probability).
   */
  readonly sampleSize: number;
  /**
   * Hash of the feature schema at training time (must match `FEATURE_SCHEMA_HASH`
   * at inference time). Ensures the feature contract did not change between
   * training and serving — a mismatch would silently map the wrong features.
   */
  readonly featureSchemaHash: string;
  /**
   * Optional: which sport(s) and seasons this model was trained on. Not read by
   * the gate; surfaced in the glass box for human audit.
   */
  readonly trainingSports?: readonly string[];
  /** Optional: model version identifier for traceability. */
  readonly modelVersion?: string;
}

/**
 * A fully self-contained ML model object. Carry this through the prediction
 * pipeline; hand it to `predictWinProb`. The gate checks all provenance fields
 * before returning any probability — a partial/stale/mismatched model returns
 * null, never a guess.
 */
export interface MlModelObject {
  /** The ensemble of decision stumps. Empty array → gate rejects (no opinion). */
  readonly stumps: readonly DecisionStump[];
  /**
   * Intercept term in logit space added before the sigmoid. Represents the
   * base log-odds before any feature contribution (typically ≈ 0 for a balanced
   * training set).
   */
  readonly intercept: number;
  /** Metadata required by the honesty gate. */
  readonly provenance: MlModelProvenance;
}

// ============================================================
// Gate constants — documented floor values
// ============================================================

/**
 * Minimum number of real settled games required before the model may produce
 * a probability. Below this floor, pseudo-residuals in boosting are dominated
 * by noise; the resulting probability would be poorly calibrated.
 * Calibration law: same spirit as MIN_GAMES_FOR_RATES in team-rates.ts.
 */
export const MIN_SAMPLE_SIZE = 200;

/**
 * A model trained more than this many days ago may be out of date (roster
 * changes, injury trends, season context). The gate rejects stale models
 * to prevent serving a frozen probability to a live market.
 */
export const MODEL_MAX_AGE_DAYS = 180;

// ============================================================
// Sigmoid and logit utilities
// ============================================================

/** Numerically stable logistic sigmoid: σ(z) = 1 / (1 + e^−z). */
function sigmoid(z: number): number {
  if (z >= 0) {
    return 1 / (1 + Math.exp(-z));
  }
  // Avoids exp overflow for very negative z
  const e = Math.exp(z);
  return e / (1 + e);
}

// ============================================================
// Inference — predictWinProb
// ============================================================

/**
 * Compute P(home wins) from a trained GBM model.
 *
 * Algorithm:
 *   1. Provenance gate — returns null if model is null, sampleSize < floor,
 *      model is stale (too old) or its trainedAt is unparseable, or
 *      featureSchemaHash does not match this module's hash.
 *   2. Feature completeness check — returns null if any feature is null or
 *      non-finite (no silent imputation).
 *   3. GBM inference: accumulate intercept + each stump's leaf logit, then
 *      apply sigmoid.
 *
 * @param model    The trained ensemble + provenance, or null/undefined.
 * @param features Fully-populated feature vector; any null/non-finite field
 *                 fails the completeness check and yields null.
 * @param options  `options.now` is an injectable clock for the staleness gate.
 *                 Omit to read the wall clock — see the file-header
 *                 DETERMINISM / CLOCK SEAM note; production callers must inject it
 *                 for reproducibility.
 * @returns A probability strictly in (0, 1) on success, or null on any honesty
 *          gate failure. The staleness gate is one-sided (rejects too-old, not
 *          future-dated) — see the file-header HONESTY GATE note.
 */
export function predictWinProb(
  model: MlModelObject | null | undefined,
  features: MlFeatureVector,
  options: { readonly now?: () => Date } = {},
): number | null {
  // ---- Gate 1: model present ----
  if (model == null) return null;

  // ---- Gate 2: sample size floor ----
  if (model.provenance.sampleSize < MIN_SAMPLE_SIZE) return null;

  // ---- Gate 3: staleness (one-sided) ----
  // Clock seam: `options.now` is injectable; the argless `new Date()` fallback is
  // the module's single non-deterministic path (see file-header note). Callers
  // that need reproducible output must pass `now`.
  const now = (options.now ?? (() => new Date()))();
  const trainedAt = Date.parse(model.provenance.trainedAt);
  // Unparseable ISO timestamp → treat as no valid provenance, reject.
  if (!Number.isFinite(trainedAt)) return null;
  // Upper-bound-only staleness: rejects models older than the max age. A future
  // trainedAt produces a negative ageDays that intentionally passes here — this
  // gate does not defend against clock-skewed/corrupt future dates (documented
  // limitation; validate provenance upstream if that matters).
  const ageDays = (now.getTime() - trainedAt) / (1000 * 60 * 60 * 24);
  if (ageDays > MODEL_MAX_AGE_DAYS) return null;

  // ---- Gate 4: schema hash ----
  if (model.provenance.featureSchemaHash !== FEATURE_SCHEMA_HASH) return null;

  // ---- Gate 5: stumps present ----
  if (model.stumps.length === 0) return null;

  // ---- Feature completeness ----
  const vec = extractFeatureVector(features);
  if (vec === null) return null;

  // ---- GBM inference: additive ensemble in logit space ----
  let logit = model.intercept;
  for (const stump of model.stumps) {
    const featureVal = vec[stump.featureIndex];
    if (featureVal === undefined || !Number.isFinite(featureVal)) return null;
    const leaf = featureVal <= stump.threshold ? stump.leftLeafLogit : stump.rightLeafLogit;
    logit += leaf;
  }

  const prob = sigmoid(logit);
  // Clamp to a half-open interval strictly inside (0, 1) — a probability of
  // exactly 0 or 1 would require infinite logit, which the finite model cannot
  // actually achieve. This guard is defensive; the sigmoid already guarantees
  // strict (0,1) for finite inputs.
  if (!Number.isFinite(prob) || prob <= 0 || prob >= 1) return null;
  return prob;
}

/**
 * Extract an ordered numeric vector from the feature struct, using the
 * canonical FEATURE_KEYS ordering. Returns null if any feature is null or
 * non-finite — we never silently impute.
 */
function extractFeatureVector(features: MlFeatureVector): readonly number[] | null {
  const vec: number[] = [];
  for (const key of FEATURE_KEYS) {
    const val = features[key];
    if (val === null || val === undefined || !Number.isFinite(val)) return null;
    vec.push(val);
  }
  return vec;
}

// ============================================================
// Bridge into the engine's independent fair-value shape
// ============================================================

/**
 * Wrap a successful ML prediction into the engine's `IndependentMarketFairValue`
 * envelope. Returns null when `predictWinProb` returns null (gate not cleared).
 *
 * The resolved `now` is used both for the staleness gate (forwarded to
 * `predictWinProb`) and as the provenance `capturedAt`, so a single clock read is
 * shared between the gate check and the stamped timestamp.
 *
 * @param options `options.now` is an injectable clock. Omit to read the wall
 *                clock — the same non-deterministic seam documented in the file
 *                header; production callers must inject it for a reproducible
 *                `capturedAt`.
 */
export function toMlFairValue(
  model: MlModelObject | null | undefined,
  features: MlFeatureVector,
  options: { readonly now?: () => Date } = {},
): IndependentMarketFairValue | null {
  // Resolve the clock once (injectable `now`, argless `new Date()` fallback — the
  // module's sole non-deterministic seam) so the gate check and `capturedAt`
  // agree; see the file-header DETERMINISM / CLOCK SEAM note.
  const now = (options.now ?? (() => new Date()))();
  const homeFairProb = predictWinProb(model, features, { now: () => now });
  if (homeFairProb === null) return null;
  // Re-assert the strict (0, 1) bound after rounding: round4 can collapse an
  // extreme-but-valid probability (e.g. 4.54e-5) to exactly 0 or 1, which would
  // fabricate an impossible certainty that predictWinProb's line-326 guard
  // explicitly promises never to emit (and would break downstream edge math).
  const rh = round4(homeFairProb);
  const ra = round4(1 - homeFairProb);
  if (rh <= 0 || rh >= 1 || ra <= 0 || ra >= 1) return null;
  return {
    source: "ml-gbm",
    homeFairProb: rh,
    awayFairProb: ra,
    capturedAt: now.toISOString(),
  };
}

// ============================================================
// Reference fitter — TEST-ONLY
// ============================================================

/**
 * A labeled training sample for the reference fitter.
 * `outcome` is 1 if the home team won, 0 if not.
 */
export interface TrainingSample {
  readonly features: MlFeatureVector;
  readonly outcome: 0 | 1;
}

/**
 * FIT A REFERENCE MODEL — FOR TESTS ONLY.
 *
 * Fits a small gradient-boosted stump ensemble using a greedy, single-variable
 * split that minimises mean-squared error on pseudo-residuals (the standard
 * gradient-boosted regression tree criterion with log-loss objective). This is
 * genuinely functional GBM math but is designed for verifying the round-trip
 * (fit → predict → expected values), NOT for production use.
 *
 * DO NOT call this function from production code. It is exported solely so
 * tests can exercise the full inference path with a deterministically-fit model.
 * Production models must be trained externally on real settled data, serialized
 * with correct provenance, and loaded from a secured artifact store.
 *
 * Algorithm (honest minimal GBM):
 *   1. Initialise predictions as the class-prior log-odds.
 *   2. For each boosting round:
 *      a. Compute pseudo-residuals: r_i = outcome_i − σ(logit_i)  (log-loss gradient).
 *      b. For each feature × candidate threshold: compute the weighted SSE
 *         reduction of a split.
 *      c. Pick the best (feature, threshold) pair.
 *      d. Compute leaf logit values: mean pseudo-residual per leaf,
 *         adjusted by the learning rate.
 *      e. Accumulate the stump; update logit predictions.
 *   3. Return an MlModelObject with full provenance.
 *
 * @param samples     Training data (must all have finite features and 0/1 outcomes).
 * @param rounds      Number of boosting rounds (stumps). Default 8.
 * @param learningRate Shrinkage applied to each stump's leaf values. Default 0.3.
 * @param provenance  Caller-supplied provenance (trainedAt, sampleSize, etc.).
 * @returns A valid MlModelObject, or null if samples are empty/all-degenerate.
 */
export function fitReferenceModel(
  samples: readonly TrainingSample[],
  rounds = 8,
  learningRate = 0.3,
  provenance: Omit<MlModelProvenance, "featureSchemaHash"> & { featureSchemaHash?: string },
): MlModelObject | null {
  // ---- Validate samples ----
  const validSamples = samples.filter((s) => extractFeatureVector(s.features) !== null);
  if (validSamples.length === 0) return null;

  const n = validSamples.length;
  const features = validSamples.map((s) => extractFeatureVector(s.features) as readonly number[]);
  const outcomes = validSamples.map((s) => s.outcome);

  // ---- Initialise logit predictions at class-prior log-odds ----
  const posCount = outcomes.filter((o) => o === 1).length;
  const priorP = posCount / n;
  const initLogit = Math.log((priorP + 1e-9) / (1 - priorP + 1e-9));
  const logits = new Float64Array(n).fill(initLogit);
  const intercept = initLogit;

  const numFeatures = FEATURE_KEYS.length;
  const stumps: DecisionStump[] = [];

  for (let round = 0; round < rounds; round++) {
    // Pseudo-residuals: r_i = y_i - σ(logit_i)  (gradient of log-loss)
    const residuals = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      residuals[i] = (outcomes[i] ?? 0) - sigmoid(logits[i] ?? 0);
    }

    let bestSse = Infinity;
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestLeftMean = 0;
    let bestRightMean = 0;

    // Greedy search: for each feature, try each unique midpoint as threshold
    for (let f = 0; f < numFeatures; f++) {
      // Collect feature values
      const vals = features.map((v) => v[f] ?? 0);

      // Candidate thresholds: midpoints between sorted unique values
      const sorted = [...new Set(vals)].sort((a, b) => a - b);
      if (sorted.length < 2) continue; // constant feature → skip

      for (let t = 0; t < sorted.length - 1; t++) {
        const threshold = ((sorted[t] ?? 0) + (sorted[t + 1] ?? 0)) / 2;

        let leftSum = 0;
        let leftCount = 0;
        let rightSum = 0;
        let rightCount = 0;

        for (let i = 0; i < n; i++) {
          if ((vals[i] ?? 0) <= threshold) {
            leftSum += residuals[i] ?? 0;
            leftCount++;
          } else {
            rightSum += residuals[i] ?? 0;
            rightCount++;
          }
        }

        if (leftCount === 0 || rightCount === 0) continue;

        const leftMean = leftSum / leftCount;
        const rightMean = rightSum / rightCount;

        // SSE of residuals after the split (minimising this = greedy GBM)
        let sse = 0;
        for (let i = 0; i < n; i++) {
          const pred = (vals[i] ?? 0) <= threshold ? leftMean : rightMean;
          const diff = (residuals[i] ?? 0) - pred;
          sse += diff * diff;
        }

        if (sse < bestSse) {
          bestSse = sse;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftMean = leftMean;
          bestRightMean = rightMean;
        }
      }
    }

    if (!Number.isFinite(bestSse) || bestSse === Infinity) break; // no valid split

    const stump: DecisionStump = {
      featureIndex: bestFeature,
      threshold: bestThreshold,
      leftLeafLogit: learningRate * bestLeftMean,
      rightLeafLogit: learningRate * bestRightMean,
    };
    stumps.push(stump);

    // Update logit predictions
    for (let i = 0; i < n; i++) {
      const fval = (features[i]?.[bestFeature]) ?? 0;
      const leaf = fval <= bestThreshold ? stump.leftLeafLogit : stump.rightLeafLogit;
      logits[i] = (logits[i] ?? 0) + leaf;
    }
  }

  if (stumps.length === 0) return null;

  return {
    stumps,
    intercept,
    provenance: {
      ...provenance,
      featureSchemaHash: provenance.featureSchemaHash ?? FEATURE_SCHEMA_HASH,
    },
  };
}

// ============================================================
// Utilities
// ============================================================

function round4(x: number): number {
  return Number(x.toFixed(4));
}
