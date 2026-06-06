import { NextResponse } from "next/server";
import { loadReceivingOpportunity } from "@/lib/intelligence/receiving-opportunity";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadReceivingOpportunity();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
