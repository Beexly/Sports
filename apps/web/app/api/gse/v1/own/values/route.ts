/**
 * POST /api/gse/v1/own/values — PIT own-feed value. asOf required.
 * Refuse-default on missing/future asOf.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  OwnFeedMemoryStore,
  handleOwnValues,
} from "@sports/stats-api";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Process-local first-party Source of Record. EMPTY until a real writer
 * hydrates it; `readOwnValue` then refuses with 404 `not_found`.
 *
 * This was `createDemoOwnStore()`, which seeded own.model.p 0.58 /
 * own.model.p_lo 0.54 / own.quote.q 0.51 for nfl:kc and nfl:phi at
 * asOf = now - 2h, stamped ownership "first_party", sourceId "gse.own",
 * pitCorrect true. Those are invented model outputs presented as ours, on an
 * unauthenticated route, always looking fresh. AGENTS.md law 8. Never seed a
 * production store; the refusal is the honest answer.
 */
const store = new OwnFeedMemoryStore();

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
