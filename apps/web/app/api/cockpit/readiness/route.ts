import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import {
  getReadinessGates,
  loadEvidenceReadiness,
  reportAllFactorReadiness,
} from "@sports/prediction-engine";

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

  let evidenceReadiness: ReturnType<typeof reportAllFactorReadiness> | null = null;
  let evidenceReadinessError: string | null = null;
  try {
    const evidence = await loadEvidenceReadiness(db, { limit: 500 });
    evidenceReadiness = reportAllFactorReadiness({ evidence });
  } catch (error) {
    // This is additive observability. A missing/unmigrated evidence table must
    // not turn the pre-existing cockpit readiness response into a 500 or make
    // the absence of a report look like a healthy ABSENT matrix.
    console.error("[cockpit/readiness] evidence-readiness load failed", error);
    evidenceReadinessError = "unavailable";
  }

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
      evidenceReadiness: evidenceReadiness
        ? {
            status: "available",
            generatedAt: evidenceReadiness.generatedAt,
            integrityScore: evidenceReadiness.integrityScore,
            activeContributingFactors: evidenceReadiness.activeContributingFactors,
            shadowReadyFactors: evidenceReadiness.shadowReadyFactors,
            blockedCriticalFactors: evidenceReadiness.blockedCriticalFactors,
            nextBestActions: evidenceReadiness.nextBestActions,
            rows: evidenceReadiness.rows,
          }
        : {
            status: evidenceReadinessError,
            generatedAt: null,
            integrityScore: null,
            activeContributingFactors: null,
            shadowReadyFactors: null,
            blockedCriticalFactors: null,
            nextBestActions: [],
            rows: [],
          },
    },
  });
}
