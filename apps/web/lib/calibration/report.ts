import { db } from "@sports/db";
import {
  aggregatePublicClv,
  getReadinessGates,
  type PublicClvAggregate,
  type PublicClvRow,
} from "@sports/prediction-engine";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
    /** Closing-line value proof aggregate. Public surfaces must respect
     *  clv.meetsPublicSampleFloor before rendering any number from it. */
    clv: PublicClvAggregate;
  };
  meta: { gated: boolean; isSampleData: boolean };
}

export async function loadPublicCalibrationReport(now = new Date()): Promise<CalibrationReportPayload> {
  const gates = getReadinessGates();

  if (!gates.canExposePerformanceStats) {
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage: "Building calibration history from settled canonical picks.",
        // Gate closed → no DB query and an empty (floor-failing) CLV aggregate.
        clv: aggregatePublicClv([]),
      },
      meta: { gated: true, isSampleData: false },
    };
  }

  const picks = await db.pick.findMany({
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
  });

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

  // Closing-line value: settled, published, canonical picks whose lock-time
  // line/price was graded against a captured closing line at settlement.
  // Same exclusions as the calibration sample (bootstrap + seed picks out);
  // rows without a graded verdict never enter the aggregate.
  const clvRows: PublicClvRow[] = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS", "PUSH"] },
      clvVerdict: { not: null },
      NOT: { modelVersion: "v5.0.0-seed" },
    },
    select: { clvVerdict: true, clvValue: true, clvKind: true },
    orderBy: { settledAt: "desc" },
    take: 1000,
  });

  return {
    data: {
      ...report,
      updatedAt: now.toISOString(),
      isCollecting: report.sampleSize === 0,
      publicMessage:
        report.sampleSize === 0
          ? "Building calibration history from settled canonical picks."
          : "Calibration is computed from settled canonical picks only.",
      clv: aggregatePublicClv(clvRows),
    },
    meta: { gated: false, isSampleData: false },
  };
}
