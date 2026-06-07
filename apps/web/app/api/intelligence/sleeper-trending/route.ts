import { NextResponse } from "next/server";
import { loadSleeperTrending } from "@/lib/integrations/sleeper";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadSleeperTrending();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
