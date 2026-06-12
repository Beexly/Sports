import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { getReadinessGates, assessStaleSettlement } from "@sports/prediction-engine";
import type { SettlementGameStatus } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }

  const gates = getReadinessGates();
  const byStatus = await db.cockpitTask.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  // Settlement-liveness signal: PENDING picks whose games should long since
  // have been graded. A silently failing settle-picks cron shows up here.
  const pendingPicks = await db.pick.findMany({
    where: { result: "PENDING" },
    select: { game: { select: { commenceTime: true, status: true } } },
  });
  const staleSettlement = assessStaleSettlement(
    pendingPicks.map((p) => ({
      commenceTime: p.game.commenceTime,
      gameStatus: p.game.status as SettlementGameStatus,
    })),
    new Date(),
  );

  return NextResponse.json({
    success: true,
    data: {
      gates: {
        canPersistCanonicalHistory: gates.canPersistCanonicalHistory,
        canUseDerivedHistory: gates.canUseDerivedHistory,
        canExposePublicPicks: gates.canExposePublicPicks,
        canPromoteFeaturedPicks: gates.canPromoteFeaturedPicks,
        canPublishContent: gates.canPublishContent,
        canExposePerformanceStats: gates.canExposePerformanceStats,
        canLearnFromOutcomes: gates.canLearnFromOutcomes,
        canApplyCalibrationAdjustments: gates.canApplyCalibrationAdjustments,
        isBootstrapMode: gates.isBootstrapMode,
        confidenceDisplayMode: gates.confidenceDisplayMode,
      },
      queueDepth: byStatus.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      minSettledPicksForLearning: gates.minSettledPicksForLearning,
      // Alert when count > 0: settle-eligible picks ungraded past the grace
      // window — i.e. the settlement cron has likely been down for hours.
      staleUnsettledPicks: {
        count: staleSettlement.count,
        oldestAgeHours: staleSettlement.oldestAgeHours,
        eligibleWithinGrace: staleSettlement.eligibleWithinGrace,
        threshold: {
          estimatedGameDurationHours: staleSettlement.estimatedGameDurationHours,
          graceHours: staleSettlement.graceHours,
          staleAfterHoursFromCommence: staleSettlement.thresholdHours,
        },
      },
    },
  });
}
