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
export function isCalibrationPublished(env: Record<string, string | undefined> = process.env): boolean {
  return env["CALIBRATION_PUBLISHED"]?.trim().toLowerCase() === "true";
}

export interface CanonicalSampleBySport {
  readonly sportKey: string;
  readonly displayName: string;
  readonly canonicalSettled: number;
  readonly canonicalWins: number;
  readonly canonicalLosses: number;
  readonly canonicalPushes: number;
  /**
   * Set only when this sport's counts could not be loaded. When present, the
   * numeric fields above are a safe placeholder (0), NOT a real "no settled
   * picks" result — never render them without checking this field first.
   * Mirrors this module's own "never fabricate a total" rule: a failed query
   * must surface as a failure, not silently coerce to an indistinguishable
   * zero.
   */
  readonly error?: string;
}

/**
 * Per-sport breakdown of the same canonical-settled definition
 * `loadPublicPerformancePolicy` uses, scoped by `game.sport.key`.
 *
 * One `Promise.all` group PER SPORT (four counts each), and each sport's
 * group is isolated in its own try/catch — a failing sport reports `error`
 * on its own row instead of rejecting the whole batch and blanking the
 * others.
 */
export async function loadCanonicalSampleBySport(
  db: LoadablePerformanceClient & { pick: { count: (args: Record<string, unknown>) => Promise<number> } },
  sports: readonly { key: string; displayName: string }[],
): Promise<readonly CanonicalSampleBySport[]> {
  // Identical filter shape to loadPublicPerformancePolicy's settledFilter +
  // isBootstrap:false + notSeed — drifting this definition would make
  // sum(bySport[*].canonicalSettled) disagree with the cumulative total.
  const notSeed = { NOT: { modelVersion: "v5.0.0-seed" } };

  return Promise.all(
    sports.map(async (sport): Promise<CanonicalSampleBySport> => {
      const scope = { game: { sport: { key: sport.key } } };
      try {
        const [canonicalSettled, canonicalWins, canonicalLosses, canonicalPushes] = await Promise.all([
          db.pick.count({
            where: { result: { in: ["WIN", "LOSS", "PUSH"] }, isPublished: true, isBootstrap: false, ...notSeed, ...scope },
          }),
          db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false, ...notSeed, ...scope } }),
          db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false, ...notSeed, ...scope } }),
          db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false, ...notSeed, ...scope } }),
        ]);
        return {
          sportKey: sport.key,
          displayName: sport.displayName,
          canonicalSettled,
          canonicalWins,
          canonicalLosses,
          canonicalPushes,
        };
      } catch (err) {
        return {
          sportKey: sport.key,
          displayName: sport.displayName,
          canonicalSettled: 0,
          canonicalWins: 0,
          canonicalLosses: 0,
          canonicalPushes: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
}
