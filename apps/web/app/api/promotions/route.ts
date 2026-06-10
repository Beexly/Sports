/**
 * Public Promotions API — /api/promotions
 *
 * Returns only promotions that pass every compliance gate. Honors an
 * optional ?state=XX query parameter for geo-aware filtering. The route
 * never invents a state — when `state` is omitted, promos without an
 * explicit eligible-states list are still filtered out. A malformed
 * `state` is rejected with a clean 400 (shared public-query schema)
 * rather than silently treated as "no state".
 *
 * No auth required. The route is read-only. Cache headers permit a brief
 * cache to keep the page snappy without serving expired promos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@sports/db";
import { enforcePublicApiRateLimit } from "@/lib/rate-limit";
import { parsePublicQuery, promotionsQuerySchema } from "@/lib/public-query";
import {
  buildDegradedPublicPromotionsResponse,
  buildPublicPromotionsResponse,
} from "@/lib/promotions/public-payload";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Inbound throttle first — cheapest rejection.
  const limited = await enforcePublicApiRateLimit(req, "promotions");
  if (limited) return limited;

  // Malformed input is the caller's fault: clean 400, never a 503.
  const query = parsePublicQuery(req, promotionsQuerySchema);
  if (!query.ok) return query.response;

  const state = query.data.state ?? null;

  try {
    // Pre-filter at the DB layer for indexable fields. Compliance / disclosure
    // gating happens in the response builder to keep the rule in one place.
    const rows = await db.promotion.findMany({
      where: {
        status: "ACTIVE",
        complianceStatus: "APPROVED",
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const payload = buildPublicPromotionsResponse(rows, { state });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (err) {
    console.warn(
      "[api/promotions] promotions unavailable; returning safe empty response.",
      err instanceof Error ? err.message : "unknown error"
    );
    return NextResponse.json(buildDegradedPublicPromotionsResponse({ state }), {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    });
  }
}
