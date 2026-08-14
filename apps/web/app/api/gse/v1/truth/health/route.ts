import { NextRequest, NextResponse } from "next/server";
import { handleTopologyHealth } from "@sports/stats-api";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gse/v1/truth/health — score topology readiness for edge fire */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // External GSE v1 surface — stop a single caller from looping the topology
  // health scorer (defense-in-depth; mirrors the consumeRateLimit call pattern
  // on the authenticated checkout / explain routes). Limit copied from
  // subscriptions/checkout (8/min is ample for a human operator console).
  const limit = consumeRateLimit("gse-v1-truth-health", clientIp(req), 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  let body: {
    planes?: Record<string, { lastAsOf: string | null; rowsAvailable: number; errorRate: number }>;
    now?: string;
    liveBoardEnabled?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const result = handleTopologyHealth({
    planes: (body.planes ?? {}) as never,
    now: body.now ?? new Date().toISOString(),
    liveBoardEnabled: Boolean(body.liveBoardEnabled),
  });
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
