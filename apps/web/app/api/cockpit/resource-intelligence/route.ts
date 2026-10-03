import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResourceCockpitFeed } from "@/lib/resource-intelligence";
import {
  SPORTS_DATA_CANDIDATES,
  getCandidateSummary,
} from "@/lib/scraping/sports-data-candidates";

export const dynamic = "force-dynamic";

/**
 * Internal cockpit feed for the resource-intelligence ledger + CFB/NFL data-source
 * candidates. Admin-only. Surfaces SAFE opportunities for action and reports
 * owner-review / quarantine strictly as counts — gated resources are never handed
 * back as ready-to-use items.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  const feed = getResourceCockpitFeed();

  return NextResponse.json({
    success: true,
    data: {
      resourceIntelligence: feed,
      sportsDataCandidates: {
        summary: getCandidateSummary(),
        // Candidates carry env-var NAMES only (never key values) and are all gated.
        items: SPORTS_DATA_CANDIDATES.map((c) => ({
          id: c.id,
          name: c.name,
          priority: c.priority,
          accessModel: c.accessModel,
          freeTier: c.freeTier,
          oddsOnly: c.oddsOnly,
          keyRequired: c.keyRequired,
          apiKeyEnvVar: c.apiKeyEnvVar,
          inMainRegistry: c.inMainRegistry,
          gated: true,
        })),
      },
    },
  });
}
