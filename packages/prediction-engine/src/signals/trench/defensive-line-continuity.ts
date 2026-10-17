/**
 * defensive-line-continuity.ts — Defensive line continuity & trench disruption model.
 *
 * Parallel to offensive-line-continuity.ts.
 * Positions: DE, DT, EDGE, NT, OLB, DL.
 */

export interface DefensiveLineContinuityInput {
  readonly startingDlCount: number; // typically 4 or 5
  readonly returningStartersFromPriorWeek: number;
  readonly backupEdgesStarting: number; // DE / EDGE / OLB
  readonly backupInteriorStarting: number; // DT / NT
}

export function evaluateDefensiveLineContinuity(
  input: DefensiveLineContinuityInput,
): { dlContinuityScore: number } {
  const starters = Math.max(1, input.startingDlCount || 4);
  const returning = Math.min(starters, Math.max(0, input.returningStartersFromPriorWeek));
  const rawContinuity = returning / starters;

  const edgePenalty = (input.backupEdgesStarting || 0) * 0.15;
  const interiorPenalty = (input.backupInteriorStarting || 0) * 0.10;

  const dlContinuityScore = Math.max(
    0.1,
    Math.min(1.0, rawContinuity - (edgePenalty + interiorPenalty) * 0.5),
  );

  return { dlContinuityScore: Number(dlContinuityScore.toFixed(3)) };
}

/**
 * Computes dlContinuityDelta from Out and Questionable DL counts.
 * clamp(-(outDl * 0.15 + qDl * 0.08), -1, 0)
 */
export function computeDlContinuityDelta(outDl: number, qDl: number): number {
  if (outDl <= 0 && qDl <= 0) return 0;
  const raw = -(outDl * 0.15 + qDl * 0.08);
  return Number(Math.max(-1, Math.min(0, raw)).toFixed(3));
}
