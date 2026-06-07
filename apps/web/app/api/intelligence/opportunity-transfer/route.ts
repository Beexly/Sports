import { NextResponse } from "next/server";
import { loadOpportunityTransfer } from "@/lib/intelligence/opportunity-transfer";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadOpportunityTransfer();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
