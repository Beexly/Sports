import { NextResponse } from "next/server";
import { loadNflverseEdgeSignals } from "@/lib/nflverse/edge-signals";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseEdgeSignals();
  return NextResponse.json({ success: true, data });
}
