/**
 * Public Promotions API — /api/promotions
 *
 * Returns only promotions that pass every compliance gate. Honors an
 * optional ?state=XX query parameter for geo-aware filtering. The route
 * never invents a state — when `state` is omitted, promos without an
 * explicit eligible-states list are still filtered out.
 *
 * No auth required. The route is read-only. Cache headers permit a brief
 * cache to keep the page snappy without serving expired promos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@sports/db";
import {
  buildDegradedPublicPromotionsResponse,
  buildPublicPromotionsResponse,
} from "@/lib/promotions/public-payload";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseStateParam(raw: string | null): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const state = parseStateParam(url.searchParams.get("state"));

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
