import { NextResponse } from "next/server";
import { loadRouteRate } from "@/lib/intelligence/route-rate";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadRouteRate();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
