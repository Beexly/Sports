import { NextResponse } from "next/server";
import { loadNflverseExpectedMetrics } from "@/lib/nflverse/expected-metrics";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import {
  internalSurfaceBlockedResponse,
  isApiRoutePublic,
} from "@/lib/launch/internal-surface-fence";

export const dynamic = "force-dynamic";

/**
 * GSE Expected Metrics — our own CPOE/RYOE/xYAC from public play-by-play, each
 * carrying its ground-truth validation report vs Next Gen Stats.
 *
 * NGS internal-only doctrine (Garrett, 2026-09-28, HARD): the NGS validation
 * reports name NGS metrics, so this route is internal. Refuse before the
 * entitlement check or any data load.
 */
export async function GET(): Promise<NextResponse> {
  if (!isApiRoutePublic("/api/nflverse/expected-metrics")) {
    return NextResponse.json(
      internalSurfaceBlockedResponse("/api/nflverse/expected-metrics"),
      { status: 404 },
    );
  }
  const denied = await requirePremiumApiRateLimited("nflverse/expected-metrics");
  if (denied) return denied;
  const data = await loadNflverseExpectedMetrics();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
