
export interface ConditionalTdInputs {
  /** P(targeted = t) for each eligible receiver t; must sum to ~1. */
  readonly targetProbs: readonly number[];
  /** P(TD | targeted = t) for each eligible receiver t. */
  readonly tdGivenTarget: readonly number[];
}

/** P(TD on play) = sum_t P(TD|t) P(t). */
export function marginalizeConditionalTD(o: ConditionalTdInputs): number {
  if (o.targetProbs.length !== o.tdGivenTarget.length) {
    throw new Error("conditional-td: targetProbs and tdGivenTarget must align");
  }
  if (o.targetProbs.length === 0) return 0;
  return o.targetProbs.reduce((s, p, t) => s + p * (o.tdGivenTarget[t] ?? 0), 0);
}

/** Same decomposition for first-down props: P(1D) = sum_t P(1D|t) P(t). */
export function marginalizeConditionalFirstDown(
  targetProbs: readonly number[],
  firstDownGivenTarget: readonly number[],
): number {
  return marginalizeConditionalTD({ targetProbs, tdGivenTarget: firstDownGivenTarget });
}

/** Sanity: target distribution should be a proper distribution (within tolerance). */
export function isProperTargetDist(targetProbs: readonly number[], tol = 1e-6): boolean {
  const sum = targetProbs.reduce((s, p) => s + p, 0);
  return Math.abs(sum - 1) <= tol && targetProbs.every((p) => p >= -tol);
}
