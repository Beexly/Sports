/**
 * Ops canonical sample — reuses loadPublicPerformancePolicy only.
 * Definition: WIN/LOSS/PUSH + isPublished + !isBootstrap + modelVersion ≠ v5.0.0-seed.
 */

import {
  loadPublicPerformancePolicy,
  type LoadablePerformanceClient,
} from "@/lib/performance/public-performance-policy";

export interface CanonicalSamplePosture {
  readonly commencedTotal: number;
  readonly canonicalSettled: number;
  readonly canonicalWins: number;
  readonly canonicalLosses: number;
  readonly canonicalPushes: number;
  readonly canonicalPending: number;
  readonly bootstrapSettled: number;
  readonly minSettledForLearning: number;
  readonly remainingToFloor: number;
  readonly operatorHint: string;
}

export async function loadCanonicalSamplePosture(
  db: LoadablePerformanceClient,
  input: {
    readonly commencedTotal: number;
    readonly canExposePerformanceStats: boolean;
    readonly minSettledPicksForLearning: number;
  },
): Promise<CanonicalSamplePosture> {
  const policy = await loadPublicPerformancePolicy(db, {
    canExposePerformanceStats: input.canExposePerformanceStats,
    minSettledPicksForLearning: input.minSettledPicksForLearning,
  });

  const min = Math.max(1, input.minSettledPicksForLearning);
  const remainingToFloor = Math.max(0, min - policy.canonicalSettledCount);

  const operatorHint =
    remainingToFloor > 0
      ? `Canonical settled ${policy.canonicalSettledCount}/${min} (seed+bootstrap excluded). Need ${remainingToFloor} more graded non-seed outcomes — settle-picks only; never invent sample.`
      : `Canonical settled ${policy.canonicalSettledCount} meets learning floor ${min}. PROVEN still requires eligibility GREEN + publish policy (AUTO_PUBLISH or PUBLISHED) — sample alone is not enough.`;

  return {
    commencedTotal: Math.max(0, Math.floor(input.commencedTotal)),
    canonicalSettled: policy.canonicalSettledCount,
    canonicalWins: policy.canonicalWins,
    canonicalLosses: policy.canonicalLosses,
    canonicalPushes: policy.canonicalPushes,
    canonicalPending: policy.pendingCount,
    bootstrapSettled: policy.bootstrapCount,
    minSettledForLearning: min,
    remainingToFloor,
    operatorHint,
  };
}

/** @deprecated Prefer resolveCalibrationPublishPolicy — env flag only. */
export function isCalibrationPublished(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["CALIBRATION_PUBLISHED"]?.trim().toLowerCase() === "true";
}
