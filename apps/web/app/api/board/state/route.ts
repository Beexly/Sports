import { NextResponse } from "next/server";
import { loadBoardState } from "@/lib/board/state";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadBoardState();
  return NextResponse.json({ success: true, ...payload });
}
