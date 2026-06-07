import { NextResponse } from "next/server";
import { loadPredictiveness } from "@/lib/intelligence/predictiveness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadPredictiveness();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
