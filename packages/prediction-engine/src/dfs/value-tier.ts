/**
 * Value-tier classification framing for NFL DFS slate screening.
 *
 * Quantizes DraftKings salaries (or projected fantasy points) into ~20
 * tiers; the tier-classification framing (instead of regression-then-
 * quantize) is evaluated on top-3 tier accuracy and tier-error cost. Use
 * cases: fast slate screening (which tier does a player belong in?) as a
 * pre-filter before the optimizer, and mispricing flags (model tier >>
 * salary tier = value). (The paper's neural network and its 6.32% FIFA-2017
 * error are rejected as artifacts; the framing is what's adapted.)
 *
 * @see arXiv:1711.05865v2 — "Pricing Football Players with Neural Networks"
 *
 * ACCEPTANCE GATE: ADAPT the tier-classification framing iff it beats
 * regression-then-quantize on tier error by ≥ 10% relative on a 4-week
 * holdout; otherwise keep the regression formulation. The gate is a training
 * concern; this module is the pure tiering kernel, not wired live.
 */

/**
 * Quantize values into `nTiers` equal-count tiers (1 = cheapest). Returns
 * the tier per value and the tier cut points.
 */
export function quantizeToTiers(values: readonly number[], nTiers = 20): number[] {
  if (values.length === 0) return [];
  if (!(nTiers >= 2)) throw new Error("quantizeToTiers: nTiers ≥ 2");
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    // rank-based tier: 1 + floor(rank * nTiers / n), clamped
    const rank = sorted.findIndex((s) => s >= v);
    const r = rank < 0 ? sorted.length - 1 : rank;
    return Math.min(nTiers, 1 + Math.floor((r * nTiers) / sorted.length));
  });
}

/**
 * Tier-error cost: mean absolute tier miss, with an optional asymmetric
 * penalty (missing high is worse for value detection).
 */
export function tierErrorCost(
  predicted: readonly number[],
  actual: readonly number[],
  upMissPenalty = 1,
): number {
  if (predicted.length !== actual.length || predicted.length === 0) {
    throw new Error("tierErrorCost: length mismatch/empty");
  }
  let s = 0;
  for (let i = 0; i < predicted.length; i++) {
    const err = (predicted[i] ?? 0) - (actual[i] ?? 0);
    s += Math.abs(err) * (err > 0 ? upMissPenalty : 1);
  }
  return s / predicted.length;
}

/** Top-3 tier accuracy: predicted tier within 3 of actual. */
export function top3TierAccuracy(
  predicted: readonly number[],
  actual: readonly number[],
): number {
  if (predicted.length !== actual.length || predicted.length === 0) {
    throw new Error("top3TierAccuracy: length mismatch/empty");
  }
  let hit = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (Math.abs((predicted[i] ?? 0) - (actual[i] ?? 0)) <= 3) hit++;
  }
  return hit / predicted.length;
}

export interface MispriceFlag {
  id: string;
  salaryTier: number;
  modelTier: number;
  /** Positive = model says the player belongs in a higher tier than paid. */
  tierGap: number;
  value: boolean;
}

/**
 * Flag mispriced players: model tier exceeds salary tier by ≥ `minGap`.
 */
export function flagMispriced(
  ids: readonly string[],
  salaryTiers: readonly number[],
  modelTiers: readonly number[],
  minGap = 3,
): MispriceFlag[] {
  if (ids.length !== salaryTiers.length || ids.length !== modelTiers.length) {
    throw new Error("flagMispriced: length mismatch");
  }
  return ids.map((id, i) => {
    const gap = (modelTiers[i] ?? 0) - (salaryTiers[i] ?? 0);
    return {
      id,
      salaryTier: salaryTiers[i] ?? 0,
      modelTier: modelTiers[i] ?? 0,
      tierGap: gap,
      value: gap >= minGap,
    };
  });
}
