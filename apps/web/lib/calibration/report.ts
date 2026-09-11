import { db } from "@sports/db";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";
import { resolveEffectivePerformanceGate } from "@/lib/ops/effective-performance-gate";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
    /** Distinct modelVersion values in this sample. Empty when gated or no rows. */
    modelVersions: readonly string[];
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
        modelVersions: [],
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
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      // ORDER IS PRESENTATION ONLY; THERE IS NO `take`. A cap here silently
      // replaced the record with a rolling window of the newest settled picks
      // while the header still read "N settled picks" — so the published
      // 80-89 bucket read 78.0% (n=41) here and 51.9% (n=129) over the full
      // record, and the confidence-tail monitor, which reads the same
      // population with no cap, called the same tail overconfident at 52.3%
      // (n=222). Two public surfaces, one population, two samples: the panel
      // must score everything the population definition admits.
      orderBy: { settledAt: "desc" },
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
        modelVersions: [],
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
  const modelVersions = [...new Set(picks.map((pick) => pick.modelVersion).filter(Boolean))].sort();

  return {
    data: {
      ...report,
      updatedAt: now.toISOString(),
      isCollecting: report.sampleSize === 0,
      publicMessage:
        report.sampleSize === 0
          ? "Building calibration history from settled canonical picks."
          : "Calibration is computed from settled canonical picks only.",
      modelVersions,
    },
    meta: { gated: false, isSampleData: false },
  };
}
