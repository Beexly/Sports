/**
 * Retrospective independent trueProb enrichment for settled picks.
 * Auth: CRON_SECRET / x-vercel-cron. Never invents p; never rewrites results.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { backfillIndependentTrueProb } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const fetchCache = "force-no-store";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(limitRaw) ? Math.min(300, Math.max(1, limitRaw)) : 80;
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const result = await backfillIndependentTrueProb({
      limit,
      dryRun,
      logPrefix: "[cron:backfill-independent-trueprob]",
    });
    return NextResponse.json({
      ...result,
      claimPosture: "retrospective_independent_trueProb_not_proven",
    });
  } catch (err) {
    console.error(
      `[cron:backfill-independent-trueprob] ${err instanceof Error ? err.message : err}`,
    );
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
