import { NextResponse } from "next/server";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { isApiRoutePublic, internalSurfaceBlockedResponse } from "@/lib/launch/internal-surface-fence";

export const dynamic = "force-dynamic";

/**
 * Calibration report JSON — INTERNAL under the public/private surface doctrine
 * (docs/research/2026-09-28/orchestration/public-private-surface-doctrine.md).
 *
 * Calibration internals are methodology, which the doctrine keeps off every
 * public surface. This route was reachable with no gate at all. It now refuses
 * before the loader runs, so a dark route does not even touch the database.
 *
 * The response names the surface and the founder-only opt-in flag and carries
 * nothing about what the payload would have held.
 */
export async function GET(): Promise<NextResponse> {
  if (!isApiRoutePublic("/api/calibration")) {
    return NextResponse.json(internalSurfaceBlockedResponse("/api/calibration"), {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const payload = await loadPublicCalibrationReport();
  return NextResponse.json({ success: true, ...payload });
}
