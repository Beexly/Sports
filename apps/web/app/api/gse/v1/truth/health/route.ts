import { NextRequest, NextResponse } from "next/server";
import { handleTopologyHealth } from "@sports/stats-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gse/v1/truth/health — score topology readiness for edge fire */
export async function POST(req: NextRequest): Promise<NextResponse> {
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
