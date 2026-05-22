import { NextResponse } from "next/server";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadPublicCalibrationReport();
  return NextResponse.json({ success: true, ...payload });
}
