/**
 * Vercel cron — Polymarket Gamma free quote plane.
 *
 * No THE_ODDS_API_KEY. Parallel to refresh-odds (enrichment only).
 * Auth: Bearer CRON_SECRET via shared cronAuthError (timing-safe).
 *
 * Law: oddsApiRequired=false · refuse-default · LIVE_BOARD independent
 *
 * Schedule: vercel.json every 30 minutes (ADD — keep existing 11 crons)
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  ClosingArchive,
  createPolymarketGammaProvider,
  GammaCronRunner,
  DEFAULT_GAMMA_CRON,
} from "@sports/quote-plane";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Process-local archive + runner (honest single-isolate). */
const archive = new ClosingArchive();
const gamma = createPolymarketGammaProvider();
const runner = new GammaCronRunner(gamma, archive, {
  ...DEFAULT_GAMMA_CRON,
  scheduleCron: "*/30 * * * *",
  sports: ["NFL", "NBA", "MLB", "MULTI"],
});

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const secret = process.env["CRON_SECRET"];
  try {
    const result = await runner.run({
      auth: {
        providedSecret: secret,
        expectedSecret: secret,
      },
    });

    const status =
      result.code === "cron_secret_unset"
        ? 500
        : result.code === "cron_unauthorized"
          ? 401
          : result.ok
            ? 200
            : 207;

    return NextResponse.json(
      {
        success: result.ok,
        ...result,
        oddsApiRequired: false as const,
        archiveSize: archive.size(),
        note: "Free Gamma path. Odds API not required. Process-local cache/archive.",
      },
      {
        status,
        headers: { "X-GSE-API": "quote.v1.gamma-cron" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: message,
        oddsApiRequired: false,
        code: "gamma_cron_failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
