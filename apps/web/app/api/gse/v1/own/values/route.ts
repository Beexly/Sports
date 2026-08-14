/**
 * POST /api/gse/v1/own/values — PIT own-feed value. asOf required.
 * Refuse-default on missing/future asOf.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createDemoOwnStore,
  handleOwnValues,
} from "@sports/stats-api";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/** Process-local demo store — durable Prisma SoR is a follow-on. */
const store = createDemoOwnStore();

export async function POST(req: NextRequest): Promise<NextResponse> {
  // External GSE v1 surface — stop a single caller from looping the PIT value
  // store (defense-in-depth; mirrors the consumeRateLimit call pattern on the
  // authenticated checkout / explain routes). Limit copied from
  // subscriptions/checkout (8/min is ample for a human operator console).
  const limit = consumeRateLimit("gse-v1-own-values", clientIp(req), 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  let body: { metricId?: string; entityId?: string; asOf?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const result = handleOwnValues(store, {
    metricId: body.metricId ?? "",
    entityId: body.entityId ?? "",
    asOf: body.asOf ?? "",
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code, oddsApiRequired: false },
      { status: result.status },
    );
  }
  return NextResponse.json(
    { ...result.data, oddsApiRequired: false },
    {
      headers: { "X-GSE-API": "stats.v1.own", "X-GSE-PIT": "required" },
    },
  );
}
