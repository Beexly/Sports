import { NextResponse } from "next/server";
import { loadSleeperLeagues } from "@/lib/integrations/sleeper-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "";
  const season = (searchParams.get("season") ?? "").replace(/\D/g, "").slice(0, 4) || "2025";
  const data = await loadSleeperLeagues({ username, season });
  return NextResponse.json({ success: data.status !== "source-error", data });
}
