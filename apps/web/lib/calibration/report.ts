import { db } from "@sports/db";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";
import { resolveEffectivePerformanceGate } from "@/lib/ops/effective-performance-gate";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
  };
  meta: { gated: boolean; isSampleData: boolean };
}

export async function loadPublicCalibrationReport(now = new Date()): Promise<CalibrationReportPayload> {
  // Public numbers only when published ∩ GREEN (effective gate). Env PERFORMANCE_STATS alone is not enough.
  const effective = await resolveEffectivePerformanceGate();

  if (!effective.canExposePerformanceStats) {
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage:
          "Building calibration history from settled canonical picks. Public metrics stay dark until eligibility GREEN and publish policy.",
      },
      meta: { gated: true, isSampleData: false },
    };
  }
  // Fail OPEN like loadBoardState: a DB blip must never crash the home, board,
  // house, or proof pages that await this. On error, return the honest
  // building/empty state instead of throwing into the global error screen.
  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "desc" },
      take: 500,
    })
    .catch(() => null);

  if (picks === null) {
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage: "Calibration is temporarily unavailable; building history from settled canonical picks.",
      },
      meta: { gated: false, isSampleData: false },
    };
  }

  const input: CalibrationPickInput[] = picks.map((pick) => ({
    id: pick.id,
    confidence: pick.confidence,
    result: pick.result,
    sport: pick.game.sport.name,
    pickType: pick.pickType,
    riskLevel: pick.riskLevel,
    dataQualityScore: pick.game.dataQualityScore,
  }));

  const report = computeCalibration(input);

  return {
    data: {
      ...report,
      updatedAt: now.toISOString(),
      isCollecting: report.sampleSize === 0,
      publicMessage:
        report.sampleSize === 0
          ? "Building calibration history from settled canonical picks."
          : "Calibration is computed from settled canonical picks only.",
    },
    meta: { gated: false, isSampleData: false },
  };
}
