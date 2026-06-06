import { NextResponse } from "next/server";
import { loadGradedPool } from "@/lib/integrations/graded-pool";

export const dynamic = "force-dynamic";

/**
 * Preview of the real graded player pool that drives every fantasy tool when the
 * founder enables the projections feed. Shown for transparency; activation is a
 * gated go-live decision (PROJECTIONS_PROVIDER).
 */
export async function GET(): Promise<NextResponse> {
  const data = await loadGradedPool();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
