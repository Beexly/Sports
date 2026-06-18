/**
 * Multi-market true-probability ensemble (precision-weighted) — the "find more
 * honest ≥70% picks" lever for docs/path-to-70.md Step 2.
 *
 * THE GAP IT FIXES
 * edge-engine.ts blends independent estimators with a flat trust weight
 * (`weight ?? 1`): a thin, high-vig sportsbook quote counts exactly as much as a
 * deep, near-vig-free exchange. That is wrong. The textbook way to fuse noisy
 * estimates of the same quantity is INVERSE-VARIANCE weighting (meta-analysis /
 * Bayesian sensor fusion): each source's weight ∝ 1/σ², the combined estimate is
 * Σŵᵢ·pᵢ, and its variance is 1/Σ(1/σᵢ²) — strictly tighter than any single
 * source. A lower-vig, deeper, fresher market therefore pulls the fair price more.
 *
 * This module computes those weights from each source's *reliability* and emits:
 *   - a precision-weighted `fairProb` (the sharper P that surfaces real edges),
 *   - the combined `stdError`,
 *   - `crossMarketDivergence` (weighted disagreement — a market-uncertainty signal
 *     a caller can pass straight into assessEdge's `uncertainty`), and
 *   - `independents`: the SAME estimators with principled `weight`s — a drop-in for
 *     edge-engine.assessEdge, so its agreement/CLV logic is unchanged but its blend
 *     becomes precision-weighted.
 *
 * Pure, no I/O, fully unit-tested. Additive: it changes no existing behaviour — it
 * produces better inputs for the engine that already exists. Wiring it into live
 * scoring stays a founder-gated MODEL_VERSION step, like every other estimator.
 *
 * The inverse-variance math is principled; only the σ-from-reliability mapping uses
 * documented, tunable heuristics (same posture as market-read.ts's gravity constants).
 */

import type { IndependentEstimate } from "./edge-engine.js";

// ── σ-derivation constants (tunable; documented heuristics, not fitted) ──────────
/** Baseline standard error (prob points) of an ideal, vig-free, deep, fresh quote. */
export const SIGMA_BASE = 0.05;
/** Each 1pt of book hold/over-round multiplies σ by (1 + this). 5pt hold ⇒ ×1.25. */
const HOLD_COEF = 0.05;
/** Staleness: σ widens by (1 + AGE_COEF · age/AGE_REF_SECONDS). */
const AGE_COEF = 0.5;
const AGE_REF_SECONDS = 300; // 5 minutes
/** Model sample size that counts as "reference" tightness; σ ∝ 1/√(n/ref). */
const SAMPLE_REF = 20;
/** Clamp σ so a single source can neither dominate absolutely nor vanish. */
const SIGMA_MIN = 0.01;
const SIGMA_MAX = 0.5;

/** How noisy is this source? Lower σ ⇒ more weight in the blend. */
export interface EstimatorReliability {
  /** Book hold / over-round in percentage points (0 for a vig-free exchange). Higher → noisier. */
  readonly holdPct?: number;
  /** Depth/coverage proxy (e.g. book count, exchange depth tier ≥ 1). Higher → tighter (σ ∝ 1/√liquidity). */
  readonly liquidity?: number;
  /** Quote age in seconds. Older → staler → noisier. */
  readonly ageSeconds?: number;
  /** Sample size behind a MODEL estimate (e.g. games used for team rates). Higher → tighter. */
  readonly sampleSize?: number;
  /** Direct standard error in probability points, if the source knows it. Overrides the derivation. */
  readonly stdError?: number;
}

export interface MarketEstimate {
  /** Source label — MUST NOT be the sportsbook line we are grading against. */
  readonly source: string;
  /** Independent P(side is correct), 0–1. */
  readonly prob: number;
  readonly reliability?: EstimatorReliability;
}

export interface EnsembleResult {
  /** Precision-weighted (inverse-variance) fair probability, 0–1; null when no valid estimate. */
  readonly fairProb: number | null;
  /** Standard error of the combined estimate: 1/√(Σ 1/σᵢ²). Tighter than any single σ. */
  readonly stdError: number;
  /** Weighted SD of the estimates around fairProb (0 = perfect agreement). A market-uncertainty signal. */
  readonly crossMarketDivergence: number;
  /** Largest absolute disagreement between any two sources, 0–1. */
  readonly maxPairwiseDisagreement: number;
  /** Kish effective number of sources: (Σw)²/Σw². ~1 when one source dominates. */
  readonly effectiveSources: number;
  /** Per-source normalised weight, descending. */
  readonly weights: ReadonlyArray<{ readonly source: string; readonly weight: number }>;
  /** The estimators with precision weights attached — a drop-in for edge-engine.assessEdge. */
  readonly independents: IndependentEstimate[];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round(v: number, d = 4): number {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

/**
 * Standard error (prob points) implied by a source's reliability. A direct
 * `stdError` wins; otherwise σ grows with hold and staleness and shrinks with
 * liquidity and model sample size, around SIGMA_BASE, clamped to [MIN, MAX].
 */
export function estimatorSigma(reliability: EstimatorReliability = {}): number {
  if (
    typeof reliability.stdError === "number" &&
    Number.isFinite(reliability.stdError) &&
    reliability.stdError > 0
  ) {
    return clamp(reliability.stdError, SIGMA_MIN, SIGMA_MAX);
  }
  const hold = Math.max(0, reliability.holdPct ?? 0);
  const liquidity = Math.max(1, reliability.liquidity ?? 1);
  const age = Math.max(0, reliability.ageSeconds ?? 0);
  const sample = Math.max(1, reliability.sampleSize ?? SAMPLE_REF);

  const sigma =
    (SIGMA_BASE *
      (1 + HOLD_COEF * hold) *
      (1 + AGE_COEF * (age / AGE_REF_SECONDS))) /
    (Math.sqrt(liquidity) * Math.sqrt(sample / SAMPLE_REF));

  return clamp(sigma, SIGMA_MIN, SIGMA_MAX);
}

/**
 * Fuse independent probability estimates of the SAME outcome by inverse-variance
 * weighting. Returns the sharper fair probability, its uncertainty, a cross-market
 * divergence signal, and the precision-weighted estimators ready for assessEdge.
 */
export function precisionWeightedEnsemble(estimates: readonly MarketEstimate[]): EnsembleResult {
  const valid = estimates.filter(
    (e) => Number.isFinite(e.prob) && e.prob >= 0 && e.prob <= 1,
  );

  if (valid.length === 0) {
    return {
      fairProb: null,
      stdError: 0,
      crossMarketDivergence: 0,
      maxPairwiseDisagreement: 0,
      effectiveSources: 0,
      weights: [],
      independents: [],
    };
  }

  const sigmas = valid.map((e) => estimatorSigma(e.reliability));
  const rawWeights = sigmas.map((s) => 1 / (s * s));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const norm = rawWeights.map((w) => w / weightSum);

  const fairProb = clamp(
    valid.reduce((acc, e, i) => acc + e.prob * (norm[i] ?? 0), 0),
    0,
    1,
  );

  // Inverse-variance combination: 1/Var = Σ 1/σᵢ²  ⇒  combined σ = 1/√Σ.
  const combinedVar = 1 / weightSum;
  const stdError = Math.sqrt(combinedVar);

  // Weighted spread of the estimates around the blend (uncertainty among sources).
  const weightedVar = valid.reduce(
    (acc, e, i) => acc + (norm[i] ?? 0) * (e.prob - fairProb) ** 2,
    0,
  );
  const crossMarketDivergence = Math.sqrt(weightedVar);

  let maxPairwise = 0;
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      maxPairwise = Math.max(maxPairwise, Math.abs(valid[i]!.prob - valid[j]!.prob));
    }
  }

  // Kish effective sample size: (Σw)²/Σw². Penalises one dominant source.
  const sumSqWeights = rawWeights.reduce((a, b) => a + b * b, 0);
  const effectiveSources = sumSqWeights > 0 ? (weightSum * weightSum) / sumSqWeights : 0;

  const weights = valid
    .map((e, i) => ({ source: e.source, weight: round(norm[i] ?? 0) }))
    .sort((a, b) => b.weight - a.weight);

  const independents: IndependentEstimate[] = valid.map((e, i) => ({
    source: e.source,
    prob: e.prob,
    weight: round(norm[i] ?? 0),
  }));

  return {
    fairProb: round(fairProb),
    stdError: round(stdError),
    crossMarketDivergence: round(crossMarketDivergence),
    maxPairwiseDisagreement: round(maxPairwise),
    effectiveSources: round(effectiveSources, 2),
    weights,
    independents,
  };
}
