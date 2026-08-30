/**
 * POST /api/gse/v1/rights/classify-export — SPDX/export classification.
 * Refuse-default: missing SPDX → 422. Never invents commercial OK.
 */
import { NextRequest, NextResponse } from "next/server";
import { classifyExport, requireSpdx } from "@sports/stats-api";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // External GSE v1 surface — stop a single caller from looping the export
  // classifier (defense-in-depth; mirrors the consumeRateLimit call pattern on
  // the authenticated checkout / explain routes). Limit copied from
  // subscriptions/checkout (8/min is ample for a human operator console).
  const limit = consumeRateLimit("gse-v1-rights-classify-export", clientIp(req), 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  let body: {
    bulkRowCount?: number;
    includesRawSourceRows?: boolean;
    licenseSpdx?: string;
    surface?: "public_api" | "pro_api" | "elite_api" | "internal_only" | "dark";
    rightsHold?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const spdx = requireSpdx({ licenseSpdx: body.licenseSpdx ?? null });
  if (!spdx.ok) {
    return NextResponse.json(
      { error: "licenseSpdx required", code: spdx.code },
      { status: 422 },
    );
  }
  const result = classifyExport({
    bulkRowCount: Number(body.bulkRowCount ?? 0),
    includesRawSourceRows: Boolean(body.includesRawSourceRows),
    licenseSpdx: spdx.licenseSpdx,
    surface: body.surface ?? "public_api",
    rightsHold: body.rightsHold,
  });
  return NextResponse.json(
    { ...result, oddsApiRequired: false },
    { headers: { "X-GSE-API": "rights.v1.export-class" } },
  );
}
