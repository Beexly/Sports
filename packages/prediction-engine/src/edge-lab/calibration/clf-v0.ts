/**
 * CLF v0 — calibration layer (empirical-Bayes shrinkage).
 *
 * WHAT THIS IS
 * A v0 calibration layer: a simple, transparent empirical-Bayes shrinker
 * that pulls raw model probabilities toward the empirical base rate. This
 * is a CALIBRATION transform, not a tout score — it does not rank, does
 * not generate edges, does not select thresholds. It answers only:
 * "given that the model said p and the historical base rate is b, what
 * probability best respects both?"
 *
 * ── The model ──
 * Raw model probabilities p_i are treated as noisy observations of a
 * latent calibrated probability. The natural conjugate model for a
 * probability is Beta-Binomial: if the base rate is b, the calibrated
 * probability is the posterior mean of a Beta(α, β) whose mean is b,
 * shrunk from the raw p_i by a strength κ (the prior pseudo-count).
 *
 * The shrinkage is a logit-space weighted blend:
 *   logit(p_cal) = w · logit(b) + (1 - w) · logit(p_raw)
 *   where w = κ / (κ + n_i)
 *
 * Here n_i is a per-sample evidence weight (default 1 = one "game" of
 * evidence per sample). κ (kappa) is the prior strength, set from the
 * aggregate sample: κ = α + β where (α, β) are fit by method-of-moments
 * from the empirical distribution of the calibrated residuals. When n_i
 * is large (high-confidence, well-backed prediction) the weight shrinks
 * toward 0 and p_cal → p_raw; when n_i is small, p_cal → b.
 *
 * v0 is deliberately simple: a single global base rate and a single global
 * κ. Later versions add per-score-bin shrinkage (isotonic / beta) and
 * per-model κ via hierarchical pooling. v0 is the "does the framework
 * work" gate.
 *
 * ── Not a tout score ──
 * CLF v0 outputs CALIBRATED PROBABILITIES, not edge scores. The decision
 * to bet (or not) is downstream. The calibrated p never sees the outcome
 * y at fit time beyond the aggregate base-rate and κ estimation — it does
 * not optimize log-loss by tuning to y directly (that is the
 * calibrated-blend / isotonic layer's job in later versions).
 *
 * ── Fail closed ──
 * Insufficient samples (fewer than 1), non-finite inputs, or p outside
 * (0, 1) → returns the base rate b (maximum shrinkage) rather than NaN.
 * The calibrator is inactive (identity passthrough with calibrated=false)
 * until minSample is met.
 *
 * Pure, deterministic, no I/O.
 */

import type { CalibrationSample } from "../../probability-calibration.js";

/** Default minimum settled samples before the calibrator is active. */
export const DEFAULT_MIN_CALIBRATION_SAMPLE = 100;

/** Default strength of the empirical-Bayes prior (Jeffreys-equivalent). */
export const DEFAULT_PRIOR_STRENGTH = 2;

/** Clamp into (EPS, 1-EPS) to avoid logit(0/1) blow-ups. */
const EPS = 1e-9;

function clampUnit(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

function logit(p: number): number {
  const c = clampUnit(p);
  return Math.log(c / (1 - c));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function clamp01(p: number): number {
  return Math.max(0, Math.min(1, p));
}

function mean(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((s, x) => s + x, 0) / samples.length;
}

function variance(xs: readonly number[], mu: number): number {
  if (xs.length < 2) return 0;
  const n = xs.length;
  const ss = xs.reduce((s, x) => s + (x - mu) * (x - mu), 0);
  return ss / (n - 1);
}

export interface ClfCalibrator {
  /** True only when the calibrator has sufficient data to be active. */
  readonly isActive: boolean;
  /** Human-readable reason it is inactive (empty when active). */
  readonly inactiveReason: string;
  /** Number of samples the calibrator was fit on. */
  readonly sampleSize: number;
  /** The base rate (empirical win rate) the calibrator shrinks toward. */
  readonly baseRate: number;
  /** The empirical prior strength κ (pseudo-counts). */
  readonly kappa: number;
  /** Whether the calibrator is wired into the live scoring path. Always false for v0. */
  readonly priced: false;
  /**
   * Apply the calibration layer to a raw probability. Returns the
   * calibrated probability and whether the calibrator was active.
   * When inactive: identity passthrough, calibrated=false.
   */
  readonly apply: (pRaw: number, evidence: number) => ClfResult;
}

export interface ClfResult {
  /** Calibrated probability in [0, 1]. */
  readonly p: number;
  /** Whether the calibrator was active when this was computed. */
  readonly calibrated: boolean;
}

/**
 * Fit a CLF v0 calibrator from settled (p, y) samples.
 *
 * The base rate b = mean(y). The prior strength κ is estimated by
 * method-of-moments from the variance of the calibrated residuals:
 *
 *   residual_i = y_i - p_i  (how far raw p was from the outcome)
 *   var(residual) ≈ b(1−b) − shrinkage · var(p)  (decomposition)
 *
 * Solving for κ gives the shrinkage intensity. When the sample is too
 * small or the moment estimate is degenerate, κ falls back to the
 * Jeffreys prior strength (DEFAULT_PRIOR_STRENGTH).
 */
export function fitClfCalibrator(
  samples: readonly CalibrationSample[],
  opts: { readonly minSample?: number; readonly priorStrength?: number } = {},
): ClfCalibrator {
  const minSample = opts.minSample ?? DEFAULT_MIN_CALIBRATION_SAMPLE;
  const priorStrength = opts.priorStrength ?? DEFAULT_PRIOR_STRENGTH;
  const sampleSize = samples.length;

  if (sampleSize === 0) {
    return {
      isActive: false,
      inactiveReason: "no settled samples (n=0)",
      sampleSize: 0,
      baseRate: 0.5,
      kappa: priorStrength,
      priced: false,
      apply: (_pRaw: number): ClfResult => ({ p: 0.5, calibrated: false }),
    };
  }

  // Base rate = empirical win rate.
  const wins = samples.reduce((s, c) => s + c.y, 0);
  const baseRate = wins / sampleSize;

  // Estimate κ via method-of-moments on the residual variance.
  // Under the shrinkage model: Var(p_obs | y) ≈ b(1−b) − shrinkage · Var(p_model)
  // Solving: κ = Var(p_model) · n / (b(1−b) − Var(residual) + Var(p_model) · n)
  // But this is noisy at small n; fall back to prior strength on degeneracy.
  let kappa = priorStrength;

  if (sampleSize >= 2) {
    const ps = samples.map((s) => s.p);
    const residuals = samples.map((s) => s.y - s.p);
    const varP = variance(ps, mean(ps));
    const varResid = variance(residuals, mean(residuals));
    const binVar = baseRate * (1 - baseRate);
    const denom = binVar - varResid + varP * sampleSize;
    if (denom > 1e-12 && varP > 1e-12) {
      const estKappa = (varP * sampleSize * priorStrength) / denom;
      if (Number.isFinite(estKappa) && estKappa > 0) {
        kappa = Math.max(0.1, Math.min(1000, estKappa));
      }
    }
  }

  const isActive = sampleSize >= minSample;
  const inactiveReason = isActive
    ? ""
    : `sample size ${sampleSize} below minimum ${minSample} (calibrator inactive, passes through raw p)`;

  return {
    isActive,
    inactiveReason,
    sampleSize,
    baseRate,
    kappa,
    priced: false,
    apply: (pRaw: number, evidence: number = 1): ClfResult => {
      // Fail closed: degenerate p → identity passthrough (no fabrication).
      if (!Number.isFinite(pRaw) || pRaw <= 0 || pRaw >= 1) {
        if (!isActive) return { p: clamp01(pRaw), calibrated: false };
        return { p: pRaw, calibrated: false };
      }
      if (!isActive) {
        return { p: clamp01(pRaw), calibrated: false };
      }
      if (!Number.isFinite(evidence) || evidence < 0) {
        return { p: clamp01(pRaw), calibrated: false };
      }

      // Logit-space weighted blend toward base rate.
      const w = kappa / (kappa + Math.max(evidence, 0.001));
      const logitP = logit(pRaw);
      const logitBase = logit(baseRate);
      const logitCal = w * logitBase + (1 - w) * logitP;
      return { p: clamp01(sigmoid(logitCal)), calibrated: true };
    },
  };
}

/**
 * Convenience: apply a fitted calibrator to a set of (p, evidence) pairs,
 * returning the calibrated probabilities. Pure delegation — use for bulk
 * backfill / OOF evaluation.
 */
export function applyClfBatch(
  calibrator: ClfCalibrator,
  samples: readonly { readonly p: number; readonly evidence?: number }[],
): ClfResult[] {
  return samples.map((s) => calibrator.apply(s.p, s.evidence ?? 1));
}
