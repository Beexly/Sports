import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { getReadinessGates } from "@sports/prediction-engine";

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
    },
  });
}
