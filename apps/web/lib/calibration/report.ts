import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";
import { CANONICAL_SETTLED_PICK_WHERE } from "@/lib/performance/canonical-population";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
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
      where: CANONICAL_SETTLED_PICK_WHERE,
      include: {
        game: { include: { sport: { select: { name: true } } } },
        proofReceipt: { select: { modelProb: true } },
      },
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
        publicMessage: "Calibration is temporarily unavailable.",
        readFailed: true,
      },
      meta: { gated: false, isSampleData: false },
    };
  }

  const input: CalibrationPickInput[] = picks.map((pick) => ({
    id: pick.id,
    confidence: pick.confidence,
    modelProbability: pick.proofReceipt?.modelProb ?? null,
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
          : report.probabilitySampleSize === 0
            ? "Confidence is a strength ranking, not a win probability. Probability calibration stays withheld until frozen model probabilities exist."
            : "Probability calibration uses frozen model probabilities from settled canonical picks only.",
    },
    meta: { gated: false, isSampleData: false },
  };
}
