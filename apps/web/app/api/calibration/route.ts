import { NextResponse } from "next/server";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { outageGateResponse } from "@/lib/data-reliability/outage-gate";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadPublicCalibrationReport();
  // A failed DB read is an OUTAGE with its own distinct 503 body — never a
  // 200 dressed as the deliberate "collecting" state (T-outage-sweep, states
  // doctrine). The loader keeps server PAGES render-safe; this API boundary
  // is where monitors read the truth.
  if (payload.data.readFailed) {
    return NextResponse.json(outageGateResponse("Calibration"), {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
  return NextResponse.json({ success: true, ...payload });
}
