import { NextResponse } from "next/server";
import { loadQbForward } from "@/lib/intelligence/qb-forward";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadQbForward();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
