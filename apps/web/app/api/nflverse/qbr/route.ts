import { NextResponse } from "next/server";
import { loadNflverseQbr } from "@/lib/nflverse/qbr";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseQbr();
  return NextResponse.json({ success: true, data });
}
