import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildRadarFeed, isRadarEnabled } from "@/lib/resource-intelligence/radar";

export const dynamic = "force-dynamic";

/**
 * R&D Radar feed — admin-only, read-only, flag-gated.
 *
 * Serves the deterministic radar feed built from the committed snapshot.
 * Gated (owner-review / quarantine) items are included as counts and as
 * fully-labeled dossiers with their blocks spelled out; the only
 * action-shaped list (`recommendedExperiments`) structurally excludes them.
 * There is no install action anywhere in this payload.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  if (!isRadarEnabled()) {
    // Flag-off is a deliberate state, not an error: the module ships dark.
    return NextResponse.json(
      { success: false, disabled: true, error: "RESOURCE_RADAR_V2_ENABLED is not set" },
      { status: 404 },
    );
  }

  const asOfDate = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ success: true, data: buildRadarFeed(asOfDate) });
}
