import { NextRequest, NextResponse } from "next/server";
import { handleEntitlements } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/** GET /api/gse/v1/entitlements?tier=PRO — Stripe tier → API surface map */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const result = handleEntitlements(req.nextUrl.searchParams.get("tier") ?? "FREE");
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1" },
  });
}
