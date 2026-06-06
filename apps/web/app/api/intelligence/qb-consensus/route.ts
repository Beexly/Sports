import { NextResponse } from "next/server";
import { loadQbConsensus } from "@/lib/intelligence/qb-consensus";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadQbConsensus();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
