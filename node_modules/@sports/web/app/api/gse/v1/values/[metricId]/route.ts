import { NextRequest, NextResponse } from "next/server";
import { handleGetMetricValue } from "@sports/stats-api";
import { demoValueProvider } from "@/lib/gse-stats/value-provider";
import { resolveStatsBillingTier } from "@/lib/gse-stats/session-tier";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/values/:metricId?entityId=&asOf=&tier=
 * PIT value fetch — refuse-default without asOf.
 * Session Stripe tier is authority; query ?tier= alone cannot elevate.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ metricId: string }> },
): Promise<NextResponse> {
  const { metricId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const resolved = await resolveStatsBillingTier(req);
  const result = await handleGetMetricValue(
    {
      metricId: decodeURIComponent(metricId),
      entityId: sp.get("entityId") ?? "",
      asOf: sp.get("asOf") ?? "",
      tier: resolved.tier,
    },
    demoValueProvider,
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        entitlement: {
          tier: resolved.tier,
          source: resolved.source,
          spoofBlocked: resolved.spoofBlocked,
        },
      },
      { status: result.status },
    );
  }
  return NextResponse.json(
    {
      ...result.data,
      entitlement: {
        tier: resolved.tier,
        source: resolved.source,
        spoofBlocked: resolved.spoofBlocked,
      },
      _note:
        "Session tier authority. Demo/memory provider until full FeatureStore loaders land. Not a performance claim.",
    },
    { headers: { "X-GSE-API": "stats.v1" } },
  );
}
