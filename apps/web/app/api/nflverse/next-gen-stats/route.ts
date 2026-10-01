import { NextResponse } from "next/server";
import { loadNflverseNextGenStats } from "@/lib/nflverse/next-gen-stats";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import {
  internalSurfaceBlockedResponse,
  isApiRoutePublic,
} from "@/lib/launch/internal-surface-fence";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // NGS internal-only doctrine (Garrett, 2026-09-28, HARD): raw NGS data never
  // serves publicly. Refuse before the entitlement check or any data load.
  if (!isApiRoutePublic("/api/nflverse/next-gen-stats")) {
    return NextResponse.json(
      internalSurfaceBlockedResponse("/api/nflverse/next-gen-stats"),
      { status: 404 },
    );
  }
  const denied = await requirePremiumApiRateLimited("nflverse/next-gen-stats");
  if (denied) return denied;
  const data = await loadNflverseNextGenStats();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
