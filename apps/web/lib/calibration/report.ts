import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
    /**
     * True ONLY when the DB read itself failed (T-outage-sweep, states
     * doctrine): "collecting" is a deliberate young-record state; a failed
     * read is an OUTAGE and must be machine-distinguishable. Server pages
     * that embed this loader keep rendering the calm degraded panel; the
     * /api/calibration route turns it into the distinct outage 503.
     */
    readFailed?: true;
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
    // OUTAGE, not "collecting": the read failed. Pages embedding this loader
    // still get a render-safe payload (never crash home/board/house/proof on
    // a DB blip), but the state carries the readFailed discriminator so the
    // API surface and monitors never mistake a failure for the deliberate
    // young-record state (T-outage-sweep).
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage: "Calibration is temporarily unavailable.",
        readFailed: true,
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
