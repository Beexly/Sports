/**
 * Log-odds opinion-pool aggregation with extremization (Satopaa-style).
 *
 * EDGE THESIS: the repo's referee field (Kalshi/Elo/Poisson/devig market, …) is
 * currently pooled by weighted ARITHMETIC mean (`consensus.ts`). The forecasting-
 * platform literature (Satopää et al. 2014; Metaculus' production aggregator;
 * Baron et al. 2014) consistently finds the geometric mean of odds (log-odds
 * linear pooling) dominates the arithmetic mean of probabilities, and that a
 * small extremization exponent (>1) applied to the log-odds pool recovers the
 * shared-information overlap that averaging otherwise double-counts away.
 *
 * This module is the pure math layer: given source probabilities + optional
 * weights and an extremization exponent, produce a pooled probability. It does
 * NOT decide weights (that stays with earned-weight/Brier-OGD machinery) and
 * does NOT wire into any gate — research/feature use only.
 *
 * Honesty rules: fail closed on empty input, non-finite or out-of-range
 * probabilities; clamp only at eps to keep logs finite. Extremization exponent
 * is caller-supplied and never inferred here.
 *
 * References:
 * - Satopää, Baron, Foster, Mellers, Tetlock, Ungar (2014),
 *   "Combining multiple probability predictions using a simple logit model",
 *   Int. J. Forecasting 30(2). logit(p̄*) = w·Σ logit(p_i), extremize w>1.
 * - Baron et al. (2014) "Two Reasons to Make Aggregated Probability Forecasts
 *   More Extreme". Geometric mean of odds as default pool.
 * - Metaculus engineering: geomean-of-log-odds base aggregate + extremization.
 */

const EPS = 1e-12;

function clamp01(x: number): number {
  return Math.max(EPS, Math.min(1 - EPS, x));
}

export function isFiniteUnit(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
}

/** logit with clamping so 0/1 inputs stay finite. */
export function logitClamped(p: number): number {
  const c = clamp01(p);
  return Math.log(c / (1 - c));
}

export function logistic(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export interface PooledMember {
  readonly source: string;
  readonly prob: number;
  /** Optional weight ≥ 0 (e.g. earned-weight). Default 1. */
  readonly weight?: number;
}

export interface LogOddsPoolResult {
  /** Arithmetic mean of probabilities — the incumbent baseline. */
  readonly arithmeticMean: number;
  /** Geometric mean of odds (equal to extremization exponent = 1). */
  readonly geometricMeanOfOdds: number;
  /**
   * Extremized pool: logit result = k · Σ w_i·logit(p_i) / Σ w_i, k > 1 pushes
   * away from 0.5, k < 1 shrinks toward it. Returned for whatever k was passed.
   */
  readonly extremized: number;
  /** Effective member count actually pooled (finite, in-range members). */
  readonly n: number;
  /** Sources excluded from pooling: non-finite/out-of-range prob, or non-finite/non-positive weight. Never silently imputed. */
  readonly dropped: readonly string[];
}

/**
 * Pool independent probability quotes in log-odds space with optional
 * extremization. Pure; no I/O. Weights need not sum to 1 (normalized inside).
 */
export function logOddsPool(
  members: readonly PooledMember[],
  extremizationExponent: number,
): LogOddsPoolResult {
  if (!Number.isFinite(extremizationExponent) || extremizationExponent <= 0) {
    throw new Error("extremizationExponent must be a positive finite number");
  }
  if (members.length === 0) {
    throw new Error("members must contain at least one entry");
  }

  const kept: Array<{ source: string; prob: number; weight: number }> = [];
  const dropped: string[] = [];

  for (const m of members) {
    const weight = m.weight ?? 1;
    if (!isFiniteUnit(m.prob) || !Number.isFinite(weight) || weight <= 0) {
      dropped.push(m.source);
      continue;
    }
    kept.push({ source: m.source, prob: m.prob, weight });
  }

  if (kept.length === 0) {
    throw new Error("no finite in-range members with positive weight");
  }

  let arith = 0;
  let wSum = 0;
  let zSum = 0;
  for (const m of kept) {
    arith += m.weight * m.prob;
    zSum += m.weight * logitClamped(m.prob);
    wSum += m.weight;
  }
  const arithmeticMean = arith / wSum;
  const meanLogOdds = zSum / wSum;
  const geometricMeanOfOdds = logistic(meanLogOdds);
  const extremized = logistic(extremizationExponent * meanLogOdds);

  return { arithmeticMean, geometricMeanOfOdds, extremized, n: kept.length, dropped };
}
