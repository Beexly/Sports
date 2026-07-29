import { NextRequest, NextResponse } from "next/server";
import { handleListMetrics } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/metrics — list rights-tagged metrics.
 * Query: sport, family, status, q, limit, offset
 *
 * `publicOnly` is DELIBERATELY NOT read from the query string.
 *
 * `handleListMetrics` accepts `publicOnly: false` so internal callers can see
 * the whole registry — legitimate, and kept. But this route is the PUBLIC,
 * UNAUTHENTICATED surface, and passing that flag through let
 * `?publicOnly=false` enumerate every restricted metric definition: the DARK
 * proprietary set (unshipped IP) plus the BLOCKED `excluded_sharealike` entry
 * whose entire point is that it is excluded rather than taken. Measured at the
 * time of this fix: 776 public against 808 total — 32 definitions exposed.
 *
 * The inconsistency is what gave it away. `/metrics/:id` returns 403 for
 * exactly those metrics, so the single-get path was refusing what the list
 * path served in bulk. A boundary that refuses one at a time and relents in
 * aggregate is not a boundary.
 *
 * Pinned true here. When API keys and Pro/Elite tiers land, an AUTHENTICATED
 * route may open the wider view to entitled callers — a deliberate, reviewed
 * unlock on an authenticated path, never a query parameter on an anonymous one.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const result = handleListMetrics({
    sport: sp.get("sport") ?? undefined,
    family: sp.get("family") ?? undefined,
    status: sp.get("status") ?? undefined,
    publicOnly: true,
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
