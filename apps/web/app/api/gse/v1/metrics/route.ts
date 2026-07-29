import { NextRequest, NextResponse } from "next/server";
import { handleListMetrics } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/metrics — list rights-tagged metrics.
 * Query: sport, family, status, publicOnly (default true)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const result = handleListMetrics({
    sport: sp.get("sport") ?? undefined,
    family: sp.get("family") ?? undefined,
    status: sp.get("status") ?? undefined,
    publicOnly: sp.get("publicOnly") === "false" ? false : true,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1" },
  });
}
