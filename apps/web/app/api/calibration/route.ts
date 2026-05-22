import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const gates = getReadinessGates();

  if (!gates.canExposePerformanceStats) {
    const report = computeCalibration([]);
    return NextResponse.json({
      success: true,
      data: {
        ...report,
        updatedAt: new Date().toISOString(),
        isCollecting: true,
        publicMessage: "Building calibration history from settled canonical picks.",
      },
      meta: { gated: true, isSampleData: false },
    });
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

  return NextResponse.json({
    success: true,
    data: {
      ...report,
      updatedAt: new Date().toISOString(),
      isCollecting: report.sampleSize === 0,
      publicMessage:
        report.sampleSize === 0
          ? "Building calibration history from settled canonical picks."
          : "Calibration is computed from settled canonical picks only.",
    },
    meta: { gated: false, isSampleData: false },
  });
}
