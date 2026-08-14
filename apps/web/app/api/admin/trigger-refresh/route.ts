import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Per-admin throttle on a route that fans out to The Odds API for EVERY sport.
  // That bills per call — a single admin looping this endpoint drains the shared
  // monthly odds budget for everyone (denial-of-wallet). Stop it at the door.
  // Limit copied from subscriptions/checkout (10/min is ample for a human op).
  const limit = consumeRateLimit("admin-trigger-refresh", session.user.id, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many refresh requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
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
