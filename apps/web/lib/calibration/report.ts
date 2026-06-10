import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
  };
  meta: {
    gated: boolean;
    isSampleData: boolean;
    dataStatus: "live" | "gated" | "degraded";
    degradedReason?: string;
  };
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
      },
      meta: { gated: true, isSampleData: false, dataStatus: "gated" },
    };
  }

  try {
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
      meta: { gated: false, isSampleData: false, dataStatus: "live" },
    };
  } catch (err) {
    console.warn(
      "[calibration/report] calibration data unavailable; returning degraded public payload.",
      err instanceof Error ? err.message : "unknown error"
    );
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage: "Calibration is temporarily unavailable while the data feed is being checked.",
      },
      meta: {
        gated: false,
        isSampleData: false,
        dataStatus: "degraded",
        degradedReason: "calibration_data_unavailable",
      },
    };
  }
}
