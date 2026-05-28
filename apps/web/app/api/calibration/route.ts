import { NextResponse } from "next/server";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { getCalibrationReport, listModelVersions } from "@/lib/signal-ledger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const [payload, versions] = await Promise.all([
    loadPublicCalibrationReport(),
    listModelVersions(),
  ]);

  // Attach Signal Ledger calibration for the most recent model version
  let ledgerCalibration = null;
  if (versions.length > 0) {
    const latestVersion = versions[0];
    if (latestVersion) {
      ledgerCalibration = await getCalibrationReport(latestVersion);
    }
  }

  return NextResponse.json({
    success: true,
    ...payload,
    ...(ledgerCalibration ? { ledger: ledgerCalibration } : {}),
  });
}
