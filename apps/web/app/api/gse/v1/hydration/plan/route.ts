import { NextRequest, NextResponse } from "next/server";
import { handleHydrationPlan } from "@sports/stats-api";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/gse/v1/hydration/plan
 * Body: { metricIds: string[], entityIds?: string[], asOf?: string }
 * Returns pure plan — does not execute network hydration (runners are server jobs).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // External GSE v1 surface — stop a single caller from looping the plan
  // builder (defense-in-depth; mirrors the consumeRateLimit call pattern used
  // on the authenticated checkout / explain routes). Limit copied from
  // subscriptions/checkout (8/min is ample for a human operator console).
  const limit = consumeRateLimit("gse-v1-hydration-plan", clientIp(req), 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  let body: { metricIds?: string[]; entityIds?: string[]; asOf?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const result = handleHydrationPlan({
    metricIds: body.metricIds,
    entityIds: body.entityIds ?? [],
    asOf: body.asOf,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
