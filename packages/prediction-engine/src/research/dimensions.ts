/**
 * Dimension gate for research evidence.
 *
 * Quote verification proves a sentence exists in the paper. It does NOT prove the
 * number means what a slot needs. Two verified examples from the corpus:
 *
 *   recency_half_life = 390   -- the paper's half period is 390 DAYS for an Elo
 *                                rating; this engine weights recency in games.
 *   shrinkage_k       = 640   -- the paper's 640 is a match-progress bucket value,
 *                                not an empirical-Bayes constant.
 *
 * Both quotes are genuine. Both would corrupt the model. So every slot declares the
 * dimension it expects, and a value outside that window is refused, not rescaled.
 */
export interface SlotDimension {
  readonly min: number;
  readonly max: number;
  /** What the number is counted in, for the audit trail. */
  readonly unit: string;
}

export const SLOT_DIMENSIONS: Readonly<Record<string, SlotDimension>> = Object.freeze({
  // pseudo-count of games used to regress toward a prior. Zero is legal: a paper may
  // state no shrinkage at all, and 0 then means "adopt the observed rate outright".
  regression_games: { min: 0, max: 40, unit: "games" },
  // points per game prior
  league_prior_ppr: { min: 0, max: 40, unit: "points/game" },
  // empirical-Bayes shrinkage constant, modest by construction
  shrinkage_k: { min: 1, max: 100, unit: "pseudo-observations" },
  // recency half-life measured in GAMES, not days
  recency_half_life: { min: 1, max: 30, unit: "games" },
  // reliability/calibration bin count
  calibration_bins: { min: 5, max: 100, unit: "bins" },
  // Brier score sits in [0, 1] by definition
  brier_target: { min: 0, max: 1, unit: "probability" },
});

export interface DimensionVerdict {
  readonly accepted: boolean;
  readonly reason?: string;
}

/** Accept only values that fall inside the slot's declared dimension. */
export function checkDimension(slot: string, value: number): DimensionVerdict {
  const dim = SLOT_DIMENSIONS[slot];
  if (!dim) return { accepted: false, reason: `unknown slot ${slot}` };
  if (!Number.isFinite(value)) return { accepted: false, reason: "non-finite value" };
  if (value < dim.min || value > dim.max) {
    return {
      accepted: false,
      reason: `${value} is outside ${dim.min}..${dim.max} ${dim.unit}`,
    };
  }
  return { accepted: true };
}

/** Filter a parameter list down to dimensionally valid entries. */
export function filterByDimension<T extends { name: string; value: number }>(
  params: readonly T[],
): { kept: T[]; rejected: Array<T & { reason: string }> } {
  const kept: T[] = [];
  const rejected: Array<T & { reason: string }> = [];
  for (const p of params) {
    const v = checkDimension(p.name, p.value);
    if (v.accepted) kept.push(p);
    else rejected.push({ ...p, reason: v.reason ?? "rejected" });
  }
  return { kept, rejected };
}
