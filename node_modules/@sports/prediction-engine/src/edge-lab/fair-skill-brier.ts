/**
 * Fair Skill Brier Score — Wang, Mellers, Ungar, Satopää
 * (INSEAD 2023/48/TOM, SSRN 4556542).
 *
 * Original categorical Brier is Σ_k (p_k − y_k)². An unskilled expert who
 * always forecasts 1/B (principle of indifference) scores (B − 1)/B.
 * Raw Brier is unfair across event types: a 5-bucket yards ladder is
 * harder than a binary anytime-TD, so the same number is not the same skill.
 *
 *   fsBrS = BrS − (B − 1)/B     (Def. 1)
 *
 * Negative = better than indifference. Zero = indifference. Positive = worse.
 * Paper: reliable when outcomes are not near-certain.
 *
 * This is NOT Murphy BSS vs grouped climatology (position × week). That
 * baseline is historical cell rates, not 1/B. Do not mix. Still not priced
 * edge — a scoring primitive only. Independent p is untouched.
 *
 * GSE binary unit Brier is (p − y)², which is half of the two-class original
 * Brier. Convert with originalBrierFromBinaryUnit before the fair adjustment.
 *
 * Pure, deterministic, no I/O.
 */

export const FAIR_SKILL_BRIER_METHOD_TAG = "fair_skill_brier_v1" as const;

/** Original Brier of the uniform 1/B forecast: (B − 1)/B. */
export function indifferenceBrier(nOutcomes: number): number {
  if (!Number.isInteger(nOutcomes) || nOutcomes < 2) {
    throw new RangeError(`indifferenceBrier: nOutcomes must be an integer ≥ 2 (got ${nOutcomes})`);
  }
  return (nOutcomes - 1) / nOutcomes;
}

/**
 * Original categorical Brier Σ_k (p_k − y_k)². `p` must be a probability
 * vector (finite, ≥ 0, sums to 1). `yIndex` is the realized class.
 */
export function originalBrier(p: readonly number[], yIndex: number): number {
  const b = p.length;
  if (b < 2) throw new RangeError("originalBrier: need at least 2 outcomes");
  if (!Number.isInteger(yIndex) || yIndex < 0 || yIndex >= b) {
    throw new RangeError(`originalBrier: yIndex must be in 0..${b - 1} (got ${yIndex})`);
  }
  let sum = 0;
  let mass = 0;
  for (let k = 0; k < b; k++) {
    const pk = p[k] as number;
    if (!Number.isFinite(pk) || pk < 0) {
      throw new RangeError(`originalBrier: p[${k}] must be finite and ≥ 0 (got ${pk})`);
    }
    mass += pk;
    const yk = k === yIndex ? 1 : 0;
    const d = pk - yk;
    sum += d * d;
  }
  if (Math.abs(mass - 1) > 1e-9) {
    throw new RangeError(`originalBrier: probabilities must sum to 1 (got ${mass})`);
  }
  return sum;
}

/** Binary unit Brier (p − y)² → original two-class Brier = 2(p − y)². */
export function originalBrierFromBinaryUnit(unitBrier: number): number {
  if (!Number.isFinite(unitBrier) || unitBrier < 0) {
    throw new RangeError(`originalBrierFromBinaryUnit: unit Brier must be finite and ≥ 0 (got ${unitBrier})`);
  }
  return 2 * unitBrier;
}

/**
 * fsBrS = BrS − (B − 1)/B. `originalBrS` is the original (sum-of-squares)
 * Brier, not the GSE binary unit Brier.
 */
export function fairSkillBrier(originalBrS: number, nOutcomes: number): number {
  if (!Number.isFinite(originalBrS) || originalBrS < 0) {
    throw new RangeError(`fairSkillBrier: original Brier must be finite and ≥ 0 (got ${originalBrS})`);
  }
  return originalBrS - indifferenceBrier(nOutcomes);
}

/** Mean fair-skill Brier over events that may have different B. */
export function meanFairSkillBrier(
  events: readonly { readonly originalBrS: number; readonly nOutcomes: number }[],
): number {
  if (events.length === 0) throw new RangeError("meanFairSkillBrier: empty sample");
  let s = 0;
  for (const e of events) s += fairSkillBrier(e.originalBrS, e.nOutcomes);
  return s / events.length;
}
