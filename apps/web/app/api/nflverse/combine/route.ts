import { NextResponse } from "next/server";
import { loadNflverseCombine } from "@/lib/nflverse/combine";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseCombine();
  return NextResponse.json({ success: true, data });
}
