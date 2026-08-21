/**
 * Public Performance Policy
 *
 * Single source of truth for "can this surface make a public performance
 * claim right now?". Used by /dashboard, /performance, and Jarvis.
 *
 * Rules:
 *   1. canExposePerformanceStats OFF → blocked, GATE_OFF_PERFORMANCE_STATS
 *   2. canonicalSettledCount < min → blocked, INSUFFICIENT_CANONICAL_SAMPLE
 *   3. every recent pick bootstrap → blocked, ALL_RECENT_PICKS_BOOTSTRAP
 *   4. otherwise → allowed
 *
 * Headline rate is wins / (wins + losses). Pushes and voids are population,
 * not rate. The published interval is Clopper-Pearson exact, never a bare
 * point estimate.
 */

import { clopperPearsonInterval } from "./clopper-pearson-interval";

export type PublicPerformanceBlocker =
  | "GATE_OFF_PERFORMANCE_STATS"
  | "INSUFFICIENT_CANONICAL_SAMPLE"
  | "ALL_RECENT_PICKS_BOOTSTRAP";

export interface PublicPerformancePolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minSettledPicksForLearning: number;
  readonly canonicalSettledCount: number;
  readonly bootstrapCount: number;
  readonly pendingCount: number;
  readonly canonicalWins: number;
  readonly canonicalLosses: number;
  readonly canonicalPushes: number;
  /** VOID settled picks — counted in population, never in the win-rate denominator. */
  readonly canonicalVoids?: number;
  /** Model versions present in the sample. Empty when the loader did not pin. */
  readonly modelVersions?: readonly string[];
  readonly recentTotalCount?: number;
  readonly recentBootstrapCount?: number;
}

export interface PublicPerformancePolicy {
  readonly canExposePerformanceStats: boolean;
  readonly blockers: readonly PublicPerformanceBlocker[];
  readonly primaryReason: PublicPerformanceBlocker | null;
  readonly canonicalSettledCount: number;
  readonly bootstrapCount: number;
  readonly pendingCount: number;
  readonly canonicalWins: number;
  readonly canonicalLosses: number;
  readonly canonicalPushes: number;
  readonly canonicalVoids: number;
  readonly eligibleForRateCount: number;
  readonly publicWinRate: number | null;
  /** 95% Clopper-Pearson lower/upper on the decided win rate (percent). Null when gated or no decided picks. */
  readonly publicWinRateCiLowPct: number | null;
  readonly publicWinRateCiHighPct: number | null;
  readonly publicWinRateBoundMethod: "clopper-pearson";
  readonly modelVersions: readonly string[];
  readonly publicRecord: string;
  readonly publicMessage: string;
  readonly operatorMessage: string;
  readonly disclaimer: string;
  readonly minimumRequirements: readonly string[];
}

const MIN_CANONICAL_DEFAULT = 25;

export function evaluatePublicPerformancePolicy(
  input: PublicPerformancePolicyInput
): PublicPerformancePolicy {
  const minCanonical = Math.max(
    1,
    input.minSettledPicksForLearning > 0
      ? input.minSettledPicksForLearning
      : MIN_CANONICAL_DEFAULT
  );

  const blockers: PublicPerformanceBlocker[] = [];

  if (!input.canExposePerformanceStats) {
    blockers.push("GATE_OFF_PERFORMANCE_STATS");
  }
  if (input.canonicalSettledCount < minCanonical) {
    blockers.push("INSUFFICIENT_CANONICAL_SAMPLE");
  }
  const recentTotal = input.recentTotalCount ?? 0;
  const recentBootstrap = input.recentBootstrapCount ?? 0;
  if (recentTotal > 0 && recentBootstrap === recentTotal) {
    blockers.push("ALL_RECENT_PICKS_BOOTSTRAP");
  }

  const eligibleForRate = input.canonicalWins + input.canonicalLosses;
  const canonicalVoids = input.canonicalVoids ?? 0;
  const modelVersions = input.modelVersions ?? [];
  const winRate =
    eligibleForRate > 0
      ? Math.round((input.canonicalWins / eligibleForRate) * 1000) / 10
      : null;
  const record = `${input.canonicalWins}W-${input.canonicalLosses}L${
    input.canonicalPushes > 0 ? `-${input.canonicalPushes}P` : ""
  }${canonicalVoids > 0 ? `-${canonicalVoids}V` : ""}`;

  const allowed = blockers.length === 0;
  const primary = blockers[0] ?? null;

  const minimumRequirements: string[] = [];
  if (blockers.includes("GATE_OFF_PERFORMANCE_STATS")) {
    minimumRequirements.push(
      "Set PERFORMANCE_STATS_ENABLED=true after canonical history accumulates."
    );
  }
  if (blockers.includes("INSUFFICIENT_CANONICAL_SAMPLE")) {
    minimumRequirements.push(
      `Accumulate at least ${minCanonical} settled canonical picks (currently ${input.canonicalSettledCount}).`
    );
  }
  if (blockers.includes("ALL_RECENT_PICKS_BOOTSTRAP")) {
    minimumRequirements.push(
      "Generate canonical picks (set CANONICAL_HISTORY_ENABLED=true) so the recent window contains non-bootstrap data."
    );
  }

  let publicMessage: string;
  let operatorMessage: string;

  if (allowed) {
    publicMessage =
      `Tracking ${input.canonicalSettledCount} verified picks. ` +
      `Past performance does not guarantee future results.`;
    operatorMessage =
      `Public performance is allowed. ${eligibleForRate} eligible picks ` +
      `(W ${input.canonicalWins} / L ${input.canonicalLosses} / P ${input.canonicalPushes}); ` +
      `${input.pendingCount} pending; ${input.bootstrapCount} bootstrap excluded. ` +
      `canonical=${input.canonicalSettledCount} sample/min=${input.canonicalSettledCount}/${minCanonical}.`;
  } else if (primary === "GATE_OFF_PERFORMANCE_STATS") {
    publicMessage =
      "Performance tracking is collecting baseline data. Public win rates " +
      "will appear after we've tracked enough complete picks. " +
      "Past performance does not guarantee future results.";
    operatorMessage =
      "Performance gate is OFF. PERFORMANCE_STATS_ENABLED is false; the " +
      "system holds back public stats until the operator opens the gate. " +
      `canonical=${input.canonicalSettledCount} sample/min=${input.canonicalSettledCount}/${minCanonical}.`;
  } else if (primary === "INSUFFICIENT_CANONICAL_SAMPLE") {
    publicMessage =
      "Performance tracking is collecting baseline data. " +
      "Public win rates will appear once we have a meaningful sample. " +
      "Past performance does not guarantee future results.";
    operatorMessage =
      `Sample too small. ${input.canonicalSettledCount} of ${minCanonical} canonical settled picks accumulated. ` +
      `${input.pendingCount} pending; ${input.bootstrapCount} bootstrap (excluded). ` +
      `canonical=${input.canonicalSettledCount} sample/min=${input.canonicalSettledCount}/${minCanonical}.`;
  } else {
    publicMessage =
      "Performance tracking is collecting baseline data. " +
      "Public win rates will appear once we have a meaningful sample. " +
      "Past performance does not guarantee future results.";
    operatorMessage =
      "Recent window is entirely bootstrap. No canonical picks exist yet. " +
      `canonical=${input.canonicalSettledCount} sample/min=${input.canonicalSettledCount}/${minCanonical}.`;
  }

  const band =
    allowed && eligibleForRate > 0
      ? clopperPearsonInterval(input.canonicalWins, eligibleForRate)
      : null;

  const disclaimer =
    "Win rate is decided picks only (wins / (wins + losses)). Pushes and voids count in the population, not the rate. The band is a 95% Clopper-Pearson exact interval, not a prediction. Past performance does not guarantee future results.";

  return {
    canExposePerformanceStats: allowed,
    blockers,
    primaryReason: primary,
    canonicalSettledCount: input.canonicalSettledCount,
    bootstrapCount: input.bootstrapCount,
    pendingCount: input.pendingCount,
    canonicalWins: input.canonicalWins,
    canonicalLosses: input.canonicalLosses,
    canonicalPushes: input.canonicalPushes,
    canonicalVoids,
    eligibleForRateCount: eligibleForRate,
    publicWinRate: allowed ? winRate : null,
    publicWinRateCiLowPct: band ? Math.round(band.low * 1000) / 10 : null,
    publicWinRateCiHighPct: band ? Math.round(band.high * 1000) / 10 : null,
    publicWinRateBoundMethod: "clopper-pearson",
    modelVersions,
    publicRecord: record,
    publicMessage,
    operatorMessage,
    disclaimer,
    minimumRequirements,
  };
}

export interface LoadablePerformanceClient {
  pick: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

export interface LoadPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minSettledPicksForLearning: number;
  readonly recentWindowDays?: number;
}

export async function loadPublicPerformancePolicy(
  db: LoadablePerformanceClient,
  input: LoadPolicyInput
): Promise<PublicPerformancePolicy> {
  const recentDays = input.recentWindowDays ?? 14;
  const recentSince = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);

  const settledFilter = {
    result: { in: ["WIN", "LOSS", "PUSH"] as const },
    isPublished: true,
  };

  // Seed/demo picks (modelVersion "v5.0.0-seed") must NEVER count toward a
  // public win rate. The three other win-rate readers (load-performance,
  // /api/performance, calibration/report) already exclude them; mirror that
  // here so this loader is safe-by-construction if it is ever wired to a
  // public surface.
  const notSeed = { NOT: { modelVersion: "v5.0.0-seed" } };

  const [
    canonicalSettledCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalVoids,
    pendingCount,
    bootstrapCount,
    recentTotalCount,
    recentBootstrapCount,
  ] = await Promise.all([
    db.pick.count({ where: { ...settledFilter, isBootstrap: false, ...notSeed } }),
    db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false, ...notSeed } }),
    db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false, ...notSeed } }),
    db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false, ...notSeed } }),
    db.pick.count({ where: { result: "VOID", isPublished: true, isBootstrap: false, ...notSeed } }),
    db.pick.count({ where: { result: "PENDING", isPublished: true, isBootstrap: false, ...notSeed } }),
    db.pick.count({ where: { isBootstrap: true, ...settledFilter } }),
    db.pick.count({ where: { generatedAt: { gte: recentSince } } }),
    db.pick.count({ where: { generatedAt: { gte: recentSince }, isBootstrap: true } }),
  ]);

  return evaluatePublicPerformancePolicy({
    canExposePerformanceStats: input.canExposePerformanceStats,
    minSettledPicksForLearning: input.minSettledPicksForLearning,
    canonicalSettledCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalVoids,
    pendingCount,
    bootstrapCount,
    recentTotalCount,
    recentBootstrapCount,
  });
}
