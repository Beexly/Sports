/**
 * Vercel cron — scheduled backtest harness (continuous calibration proof).
 *
 * Mission #6: replay SETTLED canonical picks through the REAL calibration
 * pipeline (`@/lib/backtest/harness`, which itself reuses `computeCalibration`,
 * `groupCalibrationByModelVersion`, and `@sports/prediction-engine`'s
 * `brierDecomposition` — no scoring math is reimplemented here) and persist a
 * provenance-stamped report, on a schedule, so the platform continuously
 * re-proves its own calibration instead of only proving it when a human opens
 * /calibration.
 *
 * ============================================================================
 * NOT LIVE. GATED OFF BY DEFAULT. NOT REGISTERED IN vercel.json.
 * ============================================================================
 * Unless `BACKTEST_HARNESS_ENABLED === "true"`, GET is a documented no-op: it
 * returns `{ status: "disabled" }` immediately, before touching auth, the DB,
 * or the filesystem. This route is intentionally ABSENT from `vercel.json`'s
 * `crons` array — per the mission, a live cron entry is not something this
 * change ships. To activate on Vercel's scheduler, the founder must do BOTH:
 *
 *   1. Set the env var:              BACKTEST_HARNESS_ENABLED="true"
 *   2. Add this entry to the top-level `crons` array in vercel.json:
 *
 *        {
 *          "path": "/api/cron/backtest-calibration",
 *          "schedule": "0 12 * * 0"
 *        }
 *
 *      ("0 12 * * 0" = weekly, Sunday 12:00 UTC — a calibration backtest is a
 *      slow-moving proof, not a same-day-freshness job like odds/settlement,
 *      so it does not need daily cadence. Any Vercel Hobby-safe cron string
 *      the founder prefers is fine; this is a suggested default, not a
 *      requirement.)
 *
 * This exact block is mirrored in reports/ops/backtest-harness-cron.md for a
 * reader who is not grepping route source.
 *
 * Authentication (once enabled): identical Bearer `CRON_SECRET` check as
 * every other `/api/cron/*` route, via the shared `cronAuthError` helper — a
 * request without the right token still 401s even when the feature is on.
 *
 * Output: the report is returned in the response body AND best-effort written
 * to `reports/calibration/` (see `@/lib/backtest/artifact`) — no schema was
 * added; see that module's header for why a local-file artifact is the right
 * fallback here, same as the existing GSE waitlist store.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { runBacktestHarness, type BacktestPickInput } from "@/lib/backtest/harness";
import { writeBacktestArtifact } from "@/lib/backtest/artifact";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env["BACKTEST_HARNESS_ENABLED"] !== "true") {
    return NextResponse.json({
      status: "disabled",
      note:
        'Scheduled backtest harness is flagged off. Set BACKTEST_HARNESS_ENABLED="true" and add the ' +
        "vercel.json cron entry documented in this route's file header to activate.",
    });
  }

  const denied = cronAuthError(request);
  if (denied) return denied;

  const gates = getReadinessGates();

  // Same settled-canonical query shape as loadPublicCalibrationReport
  // (apps/web/lib/calibration/report.ts) plus modelVersion, which that route
  // does not need but this harness's model-version grouping does.
  //
  // Season is intentionally left undefined for every pick: no cross-sport
  // season model exists in this repo today (only NFL/NHL ingestion code has
  // season-derivation helpers, and Pick/Game carry no season column — see the
  // harness module header). Leaving it undefined means the harness's
  // unsettled-season exclusion is wired and tested (see harness.test.ts) but
  // is inert here rather than guessing at a wrong per-sport season boundary,
  // which would risk silently corrupting the report — the same "never
  // fabricate" posture as the honest-zero gate below it.
  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: {
        id: true,
        confidence: true,
        result: true,
        modelVersion: true,
        pickType: true,
        riskLevel: true,
        game: { select: { sport: { select: { name: true } }, dataQualityScore: true } },
      },
      orderBy: { settledAt: "desc" },
      take: 5000, // a scheduled backtest run, not an interactive page — generous but bounded
    })
    .catch(() => null);

  if (picks === null) {
    return NextResponse.json(
      { status: "error", error: "Failed to load settled picks from the database." },
      { status: 500 },
    );
  }

  const input: BacktestPickInput[] = picks.map((pick) => ({
    id: pick.id,
    confidence: pick.confidence,
    result: pick.result,
    modelVersion: pick.modelVersion,
    sport: pick.game.sport.name,
    pickType: pick.pickType,
    riskLevel: pick.riskLevel,
    dataQualityScore: pick.game.dataQualityScore,
    season: undefined,
  }));

  const report = runBacktestHarness(input, {
    // Honor the live operator floor (MIN_SETTLED_PICKS_FOR_LEARNING) rather
    // than the harness's pure-module default, exactly like /api/performance
    // does for its own honest-zero floor.
    minSampleSize: Math.max(1, gates.minSettledPicksForLearning),
  });

  const artifact = await writeBacktestArtifact(report);

  return NextResponse.json({
    status: "ok",
    report,
    artifact,
  });
}
