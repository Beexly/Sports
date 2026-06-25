/**
 * DECISION FIELD RUNTIME — Field Stress.
 *
 * A card is born from FIELD STRESS — the tension when reality, markets, fantasy, the crowd, source
 * quality and time disagree. Stress means "pay attention," NEVER "act." Two physics-grade guards:
 *  (1) light-cone invariance — stress is computed only from point-in-time-knowable facts upstream, so
 *      it cannot be manufactured from future leakage;
 *  (2) conservation — when the opportunity is already accounted for (the edge is absorbed), stress is
 *      attenuated, so a fully-repriced move yields no free edge. Pure + deterministic.
 */

export interface FieldStressInputs {
  readonly entityId: string;
  readonly realityDelta: number;          // 0..1 magnitude of the real change (role/injury/etc.)
  readonly observerDisagreement: number;  // 0..1 how much observers disagree
  readonly marketVelocity: number;        // 0..1 how fast the market is moving
  readonly fantasyAbsorptionGap: number;  // 0..1 how far fantasy belief lags reality
  readonly sourceConflictSeverity: number;// 0..1 severity of a classified conflict
  readonly deadlinePressure: number;      // 0..1 how close the decision deadline is
  readonly userContextWeight: number;     // 0..1 relevance to a given user (1 for the public field)
  readonly proofCompleteness: number;     // 0..1 how complete the proof is (reduces stress)
  /** Opportunity-conservation residual (removed − accounted). <= tol ⇒ absorbed, no free edge. */
  readonly conservationResidual?: number;
}

export interface FieldStress {
  readonly entityId: string;
  readonly stress: number; // 0..1
  readonly components: Readonly<Record<string, number>>;
  readonly absorbed: boolean;
  readonly note: string;
}

const W = {
  realityDelta: 0.24,
  observerDisagreement: 0.16,
  marketVelocity: 0.16,
  fantasyAbsorptionGap: 0.18,
  sourceConflictSeverity: 0.12,
  deadlinePressure: 0.08,
  userContextWeight: 0.06,
  proofCompleteness: 0.18, // subtracted
} as const;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** Compute the attention potential at an entity. High stress = "needs attention," not "take action." */
export function computeFieldStress(i: FieldStressInputs, conservationTol = 0.1): FieldStress {
  const positive =
    W.realityDelta * i.realityDelta +
    W.observerDisagreement * i.observerDisagreement +
    W.marketVelocity * i.marketVelocity +
    W.fantasyAbsorptionGap * i.fantasyAbsorptionGap +
    W.sourceConflictSeverity * i.sourceConflictSeverity +
    W.deadlinePressure * i.deadlinePressure +
    W.userContextWeight * i.userContextWeight;
  let stress = clamp01(positive - W.proofCompleteness * i.proofCompleteness); // complete proof resolves tension, lowering stress

  // Conservation: if the opportunity is already accounted for, the edge is absorbed — attenuate.
  const absorbed = i.conservationResidual !== undefined && i.conservationResidual <= conservationTol;
  if (absorbed) stress = clamp01(stress * 0.4);

  return {
    entityId: i.entityId,
    stress: Number(stress.toFixed(4)),
    components: {
      realityDelta: i.realityDelta,
      observerDisagreement: i.observerDisagreement,
      marketVelocity: i.marketVelocity,
      fantasyAbsorptionGap: i.fantasyAbsorptionGap,
      sourceConflictSeverity: i.sourceConflictSeverity,
      deadlinePressure: i.deadlinePressure,
      proofCompleteness: i.proofCompleteness,
    },
    absorbed,
    note: absorbed
      ? "Opportunity already accounted for — edge absorbed; stress attenuated (no free edge)."
      : "Live field tension — pay attention here (not necessarily act).",
  };
}

/** Rank entities by field stress, highest-first — the homepage "Needs attention" ordering. */
export function rankByFieldStress(stresses: readonly FieldStress[]): FieldStress[] {
  return [...stresses].sort((a, b) => b.stress - a.stress);
}
