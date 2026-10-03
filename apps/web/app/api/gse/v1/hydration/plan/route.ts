import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleHydrationPlan } from "@sports/stats-api";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/** POST /api/gse/v1/hydration/plan
 * Body: { metricIds: string[], entityIds?: string[], asOf?: string }
 * Returns pure plan — does not execute network hydration (runners are server jobs).
 */
const HydrationPlanSchema = z.object({
  metricIds: z.array(z.string()).min(1, "metricIds must be a non-empty array"),
  entityIds: z.array(z.string()).optional(),
  asOf: z
    .string()
    .optional()
    .refine(
      (v) => (v === undefined ? true : !Number.isNaN(Date.parse(v))),
      { message: "asOf must be a valid ISO datetime" },
    ),
});

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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const parsed = HydrationPlanSchema.safeParse(body);
  if (!parsed.success) {
    // Refuse-default: reject any body that doesn't match the contract with a
    // typed 422 instead of forwarding a malformed shape to handleHydrationPlan,
    // which would otherwise receive a non-array metricIds/entityIds at runtime.
    return NextResponse.json(
      {
        error: "invalid request body",
        code: "bad_request",
        issues: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  const result = handleHydrationPlan({
    metricIds: parsed.data.metricIds,
    entityIds: parsed.data.entityIds ?? [],
    asOf: parsed.data.asOf,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
