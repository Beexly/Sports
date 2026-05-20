/**
 * Customer dashboard — performance loader.
 *
 * Extracted from `apps/web/app/dashboard/page.tsx` so the loader can be
 * unit-tested without spinning up a Next.js server component, and so the
 * page file shrinks back to layout/rendering concerns.
 *
 * Returns the computed PublicPerformancePolicy plus the raw 14-day list of
 * recent settled picks (still useful in the UI for the recent-picks tile).
 *
 * Bootstrap entries are returned in `recentPicks` so the UI can tag them
 * — they are never folded into the policy's counts.
 */

import { subDays } from "date-fns";
import type { PickResult, PickType } from "@sports/types";
import {
  evaluatePublicPerformancePolicy,
  type PublicPerformancePolicy,
} from "@/lib/performance/public-performance-policy";

export interface DashboardRecentPick {
  id: string;
  selection: string;
  pickType: PickType;
  confidence: number;
  result: PickResult;
  generatedAt: Date;
  isBootstrap: boolean;
  game: {
    homeTeamName: string;
    awayTeamName: string;
    sport: { name: string };
  };
}

/** Minimal DB surface the loader needs. */
export interface DashboardLoaderDb {
  pick: {
    findMany: (args: {
      where: Record<string, unknown>;
      include: Record<string, unknown>;
      orderBy: Record<string, unknown>;
      take: number;
    }) => Promise<DashboardRecentPick[]>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

export interface DashboardPerformanceInput {
  readonly canExposePerformanceStats: boolean;
  readonly minSettledPicksForLearning: number;
  readonly now?: Date;
  readonly recentWindowDays?: number;
}

export interface DashboardPerformance {
  readonly policy: PublicPerformancePolicy;
  readonly recentPicks: readonly DashboardRecentPick[];
}

export async function loadDashboardPerformance(
  db: DashboardLoaderDb,
  input: DashboardPerformanceInput
): Promise<DashboardPerformance> {
  const now = input.now ?? new Date();
  const recentDays = input.recentWindowDays ?? 14;
  const recentSince = subDays(now, recentDays);

  const [
    recentPicks,
    canonicalSettledCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalPendingCount,
    bootstrapSettledCount,
    recentTotalCount,
    recentBootstrapCount,
  ] = await Promise.all([
    db.pick.findMany({
      where: {
        isPublished: true,
        result: { not: "PENDING" },
        generatedAt: { gte: recentSince },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { generatedAt: "desc" },
      take: 10,
    }),
    // Canonical settled counts — exclude synthetic seed picks
    // (modelVersion === "v5.0.0-seed") so a dev-only seed cannot
    // inflate the Verified Record / Win Rate.
    db.pick.count({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH"] },
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
    }),
    db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } } }),
    db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } } }),
    db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } } }),
    db.pick.count({
      where: { result: "PENDING", isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } },
    }),
    db.pick.count({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH"] },
        isPublished: true,
        isBootstrap: true,
      },
    }),
    db.pick.count({ where: { generatedAt: { gte: recentSince } } }),
    db.pick.count({ where: { generatedAt: { gte: recentSince }, isBootstrap: true } }),
  ]);

  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: input.canExposePerformanceStats,
    minSettledPicksForLearning: input.minSettledPicksForLearning,
    canonicalSettledCount,
    bootstrapCount: bootstrapSettledCount,
    pendingCount: canonicalPendingCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    recentTotalCount,
    recentBootstrapCount,
  });

  return { policy, recentPicks };
}
