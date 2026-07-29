import { NextRequest, NextResponse } from "next/server";
import { handleListMetrics } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/metrics — list rights-tagged metrics.
 * Query: sport, family, status, publicOnly, q, limit, offset
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const result = handleListMetrics({
    sport: sp.get("sport") ?? undefined,
    family: sp.get("family") ?? undefined,
    status: sp.get("status") ?? undefined,
    publicOnly: sp.get("publicOnly") === "false" ? false : true,
    q: sp.get("q") ?? undefined,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  const limit = Math.min(Number(sp.get("limit") ?? 100) || 100, 500);
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);
  const page = result.data.metrics.slice(offset, offset + limit);
  return NextResponse.json(
    {
      metrics: page,
      page: { limit, offset, total: result.data.metrics.length, returned: page.length },
      meta: result.data.meta,
    },
    { headers: { "X-GSE-API": "stats.v1" } },
  );
}
