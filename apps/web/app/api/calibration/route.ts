import { NextResponse } from "next/server";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { redactUnpublishableReport } from "@/lib/calibration/public-redaction";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadPublicCalibrationReport();
  return NextResponse.json({ success: true, ...redactUnpublishableReport(payload) });
}
