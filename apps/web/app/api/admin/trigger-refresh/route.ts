import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "THE_ODDS_API_KEY not configured" }, { status: 503 });
  }

  // Read gates once — identical to how the scheduled worker reads them.
  // processSport() derives isBootstrap from these gates internally, ensuring
  // provenance (isBootstrap, GameSignal.isBootstrap) is correct regardless of
  // which ingestion path triggers the refresh.
  const gates = getReadinessGates();

  const results = [];
  for (const sport of SUPPORTED_SPORTS) {
    results.push(await processSport(sport, apiKey, gates, "[trigger-refresh]"));
  }

  return NextResponse.json({ success: true, results });
}
