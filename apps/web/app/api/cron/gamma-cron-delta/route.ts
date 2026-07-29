/**
 * Vercel cron — free Polymarket Gamma → closing archive (hot q-plane).
 * No THE_ODDS_API_KEY. Not a sportsbook affiliate path.
 * Schedule: every 30m in vercel.json (same cadence as refresh-odds, independent).
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  makeMemoryClosingArchive,
  runGammaCronDelta,
  summarizeGammaTicks,
} from "@sports/stats-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Process-local archive for this isolate — swap for durable store later. */
const archive = makeMemoryClosingArchive();

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "40");
  const result = await runGammaCronDelta({
    archive,
    limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 40,
  });

  const summary = summarizeGammaTicks([result.tick]);

  return NextResponse.json(
    {
      success: result.ok,
      ...result,
      summary,
      archiveSizeNote: "process-local isolate",
      oddsApiRequired: false,
      note: "Free Gamma hot plane. Process-local archive until durable quote SoR lands.",
    },
    {
      status: result.ok ? 200 : 422,
      headers: { "X-GSE-API": "stats.v1.gamma", "X-GSE-ODDS-API": "not-required" },
    },
  );
}
