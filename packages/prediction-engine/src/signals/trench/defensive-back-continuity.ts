/**
 * defensive-back-continuity.ts — Secondary & defensive back continuity model.
 *
 * Parallel to defensive-line-continuity.ts and offensive-line-continuity.ts.
 * Positions: CB, S, FS, SS, DB, NB.
 */

export interface DefensiveBackContinuityInput {
  readonly startingDbCount: number; // typically 4 or 5
  readonly returningStartersFromPriorWeek: number;
  readonly backupCornersStarting: number; // CB / NB
  readonly backupSafetiesStarting: number; // S / FS / SS
}

export function evaluateDefensiveBackContinuity(
  input: DefensiveBackContinuityInput,
): { dbContinuityScore: number } {
  const starters = Math.max(1, input.startingDbCount || 4);
  const returning = Math.min(starters, Math.max(0, input.returningStartersFromPriorWeek));
  const rawContinuity = returning / starters;

  const cornerPenalty = (input.backupCornersStarting || 0) * 0.15;
  const safetyPenalty = (input.backupSafetiesStarting || 0) * 0.10;

  const dbContinuityScore = Math.max(
    0.1,
    Math.min(1.0, rawContinuity - (cornerPenalty + safetyPenalty) * 0.5),
  );

  return { dbContinuityScore: Number(dbContinuityScore.toFixed(3)) };
}

/**
 * Computes dbContinuityDelta from Out and Questionable DB counts.
 * clamp(-(outDb * 0.15 + qDb * 0.08), -1, 0)
 */
export function computeDbContinuityDelta(outDb: number, qDb: number): number {
  if (outDb <= 0 && qDb <= 0) return 0;
  const raw = -(outDb * 0.15 + qDb * 0.08);
  return Number(Math.max(-1, Math.min(0, raw)).toFixed(3));
}
