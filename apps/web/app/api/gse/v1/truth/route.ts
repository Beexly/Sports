import { NextResponse } from "next/server";
import { handleRealtimeTruthCatalog } from "@sports/stats-api";
import { isApiRoutePublic, internalSurfaceBlockedResponse } from "@/lib/launch/internal-surface-fence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/gse/v1/truth — GSE real-time truth topology + law.
 *
 * INTERNAL under the public/private surface doctrine
 * (docs/research/2026-09-28/orchestration/public-private-surface-doctrine.md).
 * A topology graph and the rule set behind it are methodology expressed as
 * data, which is the keep-out case the doctrine names directly. This route was
 * reachable with no gate at all; it now refuses before the catalog is built.
 */
export async function GET(): Promise<NextResponse> {
  if (!isApiRoutePublic("/api/gse/v1/truth")) {
    return NextResponse.json(internalSurfaceBlockedResponse("/api/gse/v1/truth"), {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const result = handleRealtimeTruthCatalog();
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
