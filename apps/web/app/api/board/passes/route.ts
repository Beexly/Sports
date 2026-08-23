import { NextResponse } from "next/server";
import { loadBoardPasses } from "@/lib/board/passes";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadBoardPasses();
  return NextResponse.json({ success: true, ...payload });
}
