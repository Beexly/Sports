/**
 * Vercel cron — Polymarket Gamma free quote plane.
 *
 * No THE_ODDS_API_KEY. Parallel to refresh-odds (enrichment only).
 * Auth: Bearer CRON_SECRET via shared cronAuthError (timing-safe, dual-secret).
 *
 * Law: oddsApiRequired=false · refuse-default · LIVE_BOARD independent
 *
 * Schedule: vercel.json every 30 minutes (ADD — keep existing crons)
 *
 * Durability: set CLOSING_ARCHIVE_PATH for file-backed archive across cold starts.
 * Unset path = process-local only (honest single-isolate).
 */
import { NextResponse } from "next/server";
import { extractBearerSecret } from "@sports/util";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  ClosingArchive,
  createPolymarketGammaProvider,
  GammaCronRunner,
  DEFAULT_GAMMA_CRON,
  hydrateClosingArchive,
  persistClosingArchive,
} from "@sports/quote-plane";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Process-local archive + runner; hydrate from disk when path configured. */
const archive = new ClosingArchive();
const hydrateBoot = hydrateClosingArchive(archive);
const gamma = createPolymarketGammaProvider();
const runner = new GammaCronRunner(gamma, archive, {
  ...DEFAULT_GAMMA_CRON,
  scheduleCron: "*/30 * * * *",
  sports: ["NFL", "NBA", "MLB", "MULTI"],
});

export async function GET(request: Request): Promise<NextResponse> {
  // HTTP SoT — dual CRON_SECRET + CRON_SECRET_PREVIOUS
  const denied = cronAuthError(request);
  if (denied) return denied;

  const provided = extractBearerSecret(request.headers.get("authorization"));
  try {
    const result = await runner.run({
      auth: {
        providedSecret: provided,
        expectedSecret: process.env["CRON_SECRET"],
        previousSecret: process.env["CRON_SECRET_PREVIOUS"],
      },
    });

    const persist = persistClosingArchive(archive);

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
        durable: {
          boot: hydrateBoot,
          persist,
        },
        note: "Free Gamma path. Odds API not required. Dual-secret auth. CLOSING_ARCHIVE_PATH enables file durability.",
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
