/**
 * Galaxy Dynasty — the server loader behind the tie-in.
 *
 * Two layers:
 *   • `loadDynastyProfile(deps)` — dependency-injected and unit-testable. Given a
 *     pick-count surface, the readiness gates, and resolved entitlements, it reads
 *     the real canonical settled sample and derives the profile. No auth, no global
 *     Prisma — so it can be exercised with a fake db in tests.
 *   • `getViewerDynastyProfile()` — the server glue the route and the page share.
 *     Resolves the session, real entitlements, real gates, and the live db, then
 *     fails CLOSED to the anonymous FREE world on any error.
 *
 * One direction only: GSN → game. Read-only. Never writes.
 */

import { db } from "@sports/db";
import type { Entitlements } from "@sports/types";
import { getReadinessGates } from "@sports/prediction-engine";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import {
  deriveDynastyProfile,
  anonymousDynastyProfile,
  type DynastyProfile,
} from "./dynasty-progression";

/** The minimal pick-count surface the loader needs (matches Prisma's `pick.count`). */
export interface DynastyCountDb {
  readonly pick: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

/** Real readiness signals, flattened from `getReadinessGates()` — never fabricated. */
export interface DynastyGates {
  readonly performanceStatsEnabled: boolean;
  readonly minSettledPicksForLearning: number;
  /** The isotonic calibrator is active — GSN's own definition of "calibration is live". */
  readonly calibrationActive: boolean;
}

export interface DynastyLoaderDeps {
  readonly db: DynastyCountDb;
  readonly gates: DynastyGates;
  /** Resolved viewer entitlements, or null for a signed-out viewer. */
  readonly entitlements: Entitlements | null;
}

/** Non-bootstrap, published, non-seed — the exact sample GSN counts as canonical (see load-performance.ts). */
const CANONICAL = { isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } } as const;

/**
 * Injectable core: read the real record and derive the profile. Pure of I/O beyond
 * the provided db surface, so tests drive it with counts of their choosing.
 */
export async function loadDynastyProfile(deps: DynastyLoaderDeps): Promise<DynastyProfile> {
  const { entitlements, gates } = deps;
  if (!entitlements) return anonymousDynastyProfile();

  const [settled, wins, losses, pushes, beatClose, graded] = await Promise.all([
    deps.db.pick.count({ where: { ...CANONICAL, result: { in: ["WIN", "LOSS", "PUSH"] } } }),
    deps.db.pick.count({ where: { ...CANONICAL, result: "WIN" } }),
    deps.db.pick.count({ where: { ...CANONICAL, result: "LOSS" } }),
    deps.db.pick.count({ where: { ...CANONICAL, result: "PUSH" } }),
    deps.db.pick.count({ where: { ...CANONICAL, clvVerdict: "BEAT_CLOSE" } }),
    deps.db.pick.count({ where: { ...CANONICAL, clvVerdict: { in: ["BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE"] } } }),
  ]);

  const minSettled = Math.max(1, gates.minSettledPicksForLearning);

  return deriveDynastyProfile({
    tier: entitlements.tier,
    authenticated: true,
    entitlements: {
      canUseFantasyFull: entitlements.canUseFantasyFull,
      canUseClvLedger: entitlements.canUseClvLedger,
      canGetAlerts: entitlements.canGetAlerts,
    },
    proof: {
      canonicalSettledCount: settled,
      wins,
      losses,
      pushes,
      clvBeatRate: graded > 0 ? beatClose / graded : null,
      hasPublishedCalibration: gates.calibrationActive,
      performanceStatsPublic: gates.performanceStatsEnabled && settled >= minSettled,
    },
  });
}

/** Server glue used by both `GET /api/dynasty/me` and the `/dynasty` page. Fails closed. */
export async function getViewerDynastyProfile(): Promise<DynastyProfile> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const entitlements = userId ? await getUserEntitlements(userId) : null;
    const raw = getReadinessGates();
    return await loadDynastyProfile({
      db,
      entitlements,
      gates: {
        performanceStatsEnabled: raw.canExposePerformanceStats,
        minSettledPicksForLearning: raw.minSettledPicksForLearning,
        calibrationActive: raw.canApplyCalibrationAdjustments,
      },
    });
  } catch {
    return anonymousDynastyProfile();
  }
}
