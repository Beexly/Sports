/**
 * Variant assignment for experiments.
 *
 * Assignment is deterministic from `subjectBucket` and the experiment id,
 * so the same user-bucket always sees the same variant for a given
 * experiment without storing a per-user assignment record.
 */

export interface Variant {
  readonly id: string;
  readonly label: string;
  readonly weight: number; // 0..1, sums to 1 across an experiment
}

export interface VariantAssignment {
  readonly experimentId: string;
  readonly variantId: string;
}

/**
 * Pick a variant deterministically. Uses a simple stable hash of
 * `${experimentId}|${subjectBucket}` to choose from the cumulative
 * weight ladder.
 */
export function assignVariant(
  experimentId: string,
  subjectBucket: number,
  variants: ReadonlyArray<Variant>,
): VariantAssignment {
  if (variants.length === 0) {
    throw new Error(`No variants registered for experiment ${experimentId}`);
  }
  const totalWeight = variants.reduce((s, v) => s + v.weight, 0);
  if (Math.abs(totalWeight - 1) > 1e-6) {
    throw new Error(`Variant weights for ${experimentId} must sum to 1 (got ${totalWeight})`);
  }
  const draw = stableDraw(`${experimentId}|${subjectBucket}`);
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (draw < cumulative) return { experimentId, variantId: v.id };
  }
  return { experimentId, variantId: variants[variants.length - 1]!.id };
}

function stableDraw(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Standard 50/50 control + treatment. */
export const STANDARD_50_50: ReadonlyArray<Variant> = [
  { id: "control", label: "Control", weight: 0.5 },
  { id: "treatment", label: "Treatment", weight: 0.5 },
];

/** Standard 10% holdout. */
export const STANDARD_HOLDOUT_10: ReadonlyArray<Variant> = [
  { id: "control", label: "Control", weight: 0.9 },
  { id: "treatment", label: "Treatment", weight: 0.1 },
];
