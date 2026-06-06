import { NextResponse } from "next/server";
import { loadDfsSalaries } from "@/lib/dfs/salaries";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadDfsSalaries();
  return NextResponse.json({ success: true, data });
}
