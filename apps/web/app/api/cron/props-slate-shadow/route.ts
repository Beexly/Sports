/**
 * GET /api/cron/props-slate-shadow
 *
 * The live call path `runPropsSlate` never had (wiring-backlog 2026-10-01
 * item 11). Runs the GSE 4-Beat props pipeline in SHADOW mode:
 *
 *   - Env-gated by PROPS_SLATE_SHADOW_ENABLED (default OFF). Dark until the
 *     founder flips it; the route then reports the dark state honestly.
 *   - Shadow-only: the slate is computed and reported, never persisted,
 *     never published. Result carries `shadow: true, weight: 0`.
 *   - Honest inputs only: model P(over) comes from the hierarchical-Bayes
 *     bridge over real rate samples; props without samples are recorded as
 *     missing, never imputed. No prop-line feed is wired to this path yet,
 *     so an enabled run returns the fail-closed empty-slate result until one
 *     implements `PropsSlateShadowSource`.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { captureError } from "@/lib/observability/sentry";
import { createDbRateHistoryResolver } from "@/lib/props/db-rate-history-resolver";
import {
  createBoard360PropsShadowSource,
  runPropsSlateShadow,
} from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const fetchCache = "force-no-store";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const source = createBoard360PropsShadowSource({
      resolveRateHistory: createDbRateHistoryResolver({
        onError: (err) => captureError(err, { cron: "props-slate-shadow", phase: "db-rate-history" }),
      }),
    });
    const result = await runPropsSlateShadow({ source });
    return NextResponse.json({
      ok: true,
      ...result,
      claimPosture: "shadow_props_slate_weight_0",
    });
  } catch (err) {
    console.error(`[cron:props-slate-shadow] ${err instanceof Error ? err.message : err}`);
    captureError(err, { path: "props-slate-shadow" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
