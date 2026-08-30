import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import { loadPublicClvPolicy } from "@/lib/performance/public-clv-policy";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public CLV (closing line value) JSON surface — the programmatic sibling of
 * the /clv page. CLV is the sharp-credible leading indicator of a real edge and
 * the benchmark tout services almost never publish; exposing it as JSON lets the
 * paywall proof widget, SEO embeds, and external verifiers read the same
 * honest, gated number the page renders.
 *
 * All honesty enforcement lives in `loadPublicClvPolicy` / `evaluatePublicClvPolicy`
 * (single source of truth) — this route adds NO new numeric computation:
 *   - readiness gate `canExposePerformanceStats` (503 until on),
 *   - the MIN_SETTLED graded-sample floor (rate is null below threshold; never
 *     a fabricated rate off a thin sample),
 *   - canonical-only counting (isBootstrap:false, isPublished:true),
 *   - Wilson CI framed against the 52.4% vig break-even, so no "edge" is implied
 *     when the lower bound doesn't clear the vig.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route (4 count queries per call). Add IP-keyed
  // rate limiting to stop abuse loops — pattern copied from
  // apps/web/app/api/nflverse/injuries/route.ts (consumeRateLimit + clientIp).
  const limit = consumeRateLimit("public-clv", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const gates = getReadinessGates();
  if (!gates.canExposePerformanceStats) {
    return NextResponse.json(bootstrapGateResponse("CLV"), { status: 503 });
  }

  // Fail OPEN to the same gated/collecting shape on a DB error rather than
  // leaking a stack trace on this public, unauthenticated route.
  const policy = await loadPublicClvPolicy(db, {
    canExposePerformanceStats: gates.canExposePerformanceStats,
    minGradedForPublic: gates.minSettledPicksForLearning,
  }).catch(() => null);

  if (policy === null) {
    return NextResponse.json(bootstrapGateResponse("CLV"), { status: 503 });
  }

  return NextResponse.json({
    success: true,
    data: policy,
    disclaimer:
      "Closing line value measures our entry price against the market's closing " +
      "line. It is a leading indicator of edge, not a guarantee. Past performance " +
      "does not guarantee future results. For informational purposes only.",
  });
}
