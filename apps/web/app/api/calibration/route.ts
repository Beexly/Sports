import { NextResponse } from "next/server";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { backendOutageResponse } from "@/lib/data-reliability/public-freshness-gate";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadPublicCalibrationReport();
  if (payload.data.readFailed) {
    return NextResponse.json(backendOutageResponse("Calibration"), {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
  return NextResponse.json({ success: true, ...payload });
}
