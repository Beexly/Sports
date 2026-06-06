import { NextResponse } from "next/server";
import { loadNflverseSnapShare } from "@/lib/nflverse/snap-share";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseSnapShare();
  return NextResponse.json({ success: true, data });
}
