import { NextResponse } from "next/server";
import { loadExpectedPoints } from "@/lib/intelligence/expected-points";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadExpectedPoints();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
