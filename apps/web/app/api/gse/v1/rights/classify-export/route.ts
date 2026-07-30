/**
 * POST /api/gse/v1/rights/classify-export — SPDX/export classification.
 * Refuse-default: missing SPDX → 422. Never invents commercial OK.
 */
import { NextRequest, NextResponse } from "next/server";
import { classifyExport, requireSpdx } from "@sports/stats-api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
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
