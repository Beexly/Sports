import { NextRequest, NextResponse } from "next/server";
import { handleGetMetric } from "@sports/stats-api";
import { resolveStatsBillingTier } from "@/lib/gse-stats/session-tier";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ metricId: string }> },
): Promise<NextResponse> {
  const { metricId } = await ctx.params;
  // Tier is resolved from the SESSION, never from `?tier=`. Reading the query
  // param directly let any anonymous caller self-declare ELITE and read
  // restricted metric definitions — description, formulaClass, sourceIds — for
  // the proprietary set. The anti-spoof resolver already existed and was already
  // used by the sibling `values/[metricId]` route; this route simply never
  // adopted it. (Security assessment, 2026-08-16.)
  const resolved = await resolveStatsBillingTier(req);
  const result = handleGetMetric(decodeURIComponent(metricId), resolved.tier);
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
