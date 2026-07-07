/**
 * GET /api/dynasty/me — the Galaxy Dynasty tie-in seam.
 *
 * The ONE bridge between GSN and the game. Read-only, session-gated, one
 * direction (GSN → game). It resolves the viewer's real entitlements and real
 * settled record, then derives their Dynasty profile with the pure progression
 * module. It never writes a pick, never mints an entitlement, and — like every
 * gated GSN surface — fails CLOSED to the anonymous FREE world on any error, so
 * a game request can never leak paid state or crash a subscription path.
 *
 * The game client only ever renders this output. See docs/product/galaxy-dynasty-tie-in.md.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import {
  deriveDynastyProfile,
  anonymousDynastyProfile,
  type DynastyProfile,
} from "@/lib/dynasty/dynasty-progression";

export const dynamic = "force-dynamic";

/** Canonical settled sample threshold at which a player's own record is treated as public-grade. */
const MIN_CANONICAL_FOR_PUBLIC = 25;

/** Non-bootstrap, published, non-seed — the exact sample GSN counts as canonical (see load-performance.ts). */
const CANONICAL = { isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } } as const;

interface RealProof {
  canonicalSettledCount: number;
  wins: number;
  losses: number;
  pushes: number;
  clvBeatRate: number | null;
  hasPublishedCalibration: boolean;
  performanceStatsPublic: boolean;
}

async function loadRealProof(): Promise<RealProof> {
  const [settled, wins, losses, pushes, beatClose, graded] = await Promise.all([
    db.pick.count({ where: { ...CANONICAL, result: { in: ["WIN", "LOSS", "PUSH"] } } }),
    db.pick.count({ where: { ...CANONICAL, result: "WIN" } }),
    db.pick.count({ where: { ...CANONICAL, result: "LOSS" } }),
    db.pick.count({ where: { ...CANONICAL, result: "PUSH" } }),
    db.pick.count({ where: { ...CANONICAL, clvVerdict: "BEAT_CLOSE" } }),
    db.pick.count({ where: { ...CANONICAL, clvVerdict: { in: ["BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE"] } } }),
  ]);

  return {
    canonicalSettledCount: settled,
    wins,
    losses,
    pushes,
    clvBeatRate: graded > 0 ? beatClose / graded : null,
    // TODO(dynasty): wire to the published-calibration signal once the game consumes it.
    // Conservatively false until then — the Calibrated floor stays honestly locked, never faked.
    hasPublishedCalibration: false,
    performanceStatsPublic: settled >= MIN_CANONICAL_FOR_PUBLIC,
  };
}

export async function GET(): Promise<NextResponse> {
  let profile: DynastyProfile;
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      profile = anonymousDynastyProfile();
    } else {
      const entitlements = await getUserEntitlements(userId);
      const proof = await loadRealProof();
      profile = deriveDynastyProfile({
        tier: entitlements.tier,
        authenticated: true,
        entitlements: {
          canUseFantasyFull: entitlements.canUseFantasyFull,
          canUseClvLedger: entitlements.canUseClvLedger,
          canGetAlerts: entitlements.canGetAlerts,
        },
        proof,
      });
    }
  } catch {
    // Fail closed — a broken read must never crash the world or leak paid state.
    profile = anonymousDynastyProfile();
  }

  return NextResponse.json({ success: true, profile });
}
