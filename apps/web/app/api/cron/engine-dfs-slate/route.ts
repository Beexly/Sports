/**
 * GET /api/cron/engine-dfs-slate
 *
 * The end-to-end receipt for the total-signal wiring: build the DFS slate from
 * MEASURED engine data and report what it actually produced. This is the call
 * site `registerDfsSlateProvider` never had.
 *
 * READ-ONLY. It writes nothing and flips nothing. Two reasons, both from this
 * repo's own history:
 *   - `gate_decisions` had three readers and no writer for 94 days, which is
 *     the standing lesson: a write path deserves its own review, not a side
 *     effect of a reporting job.
 *   - DFS_PROVIDER is a founder-only env flag (law 3). This route REPORTS
 *     whether the live path would be reachable; it does not set it.
 *
 * The report states plainly which parts of the slate are measured and which
 * are not, because three of the optimizer's inputs are not yet real:
 * salary (no licensed feed), ownership (not derivable), and the adjustment
 * magnitudes (uncalibrated until a backtest replaces them).
 */
import { NextRequest, NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { captureError } from "@/lib/observability/sentry";
import { isLiveDfs, resolveDfsSlateProvider } from "@/lib/integrations/dfs";
import { buildEngineSlate, type EngineSlateReport } from "@/lib/fantasy/engine-slate";

export const dynamic = "force-dynamic";
const MAX_TAKE = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = cronAuthError(request);
  if (auth) return auth;

  const now = new Date().toISOString();

  // Read-only: count what IS available so the report can say "0 projections"
  // honestly rather than because a query failed.
  let season = new Date().getUTCFullYear();
  let week = 0;
  try {
    const { db } = await import("@sports/db");
    const latest = await db.playerGameStat.findFirst({
      orderBy: [{ season: "desc" }, { week: "desc" }],
      select: { season: true, week: true },
    });
    if (latest) {
      season = latest.season;
      week = latest.week;
    }
  } catch (err) {
    captureError(err, { route: "cron/engine-dfs-slate" });
  }

  let report: EngineSlateReport;
  try {
    report = await buildEngineSlate({ season, week, now });
  } catch (err) {
    captureError(err, { route: "cron/engine-dfs-slate" });
    // MEASURED 2026-09-28: this branch returned `{ status: 200 }` with
    // `success: false` in the body. Someone wrote the failure branch and then
    // chose 200, so a slate build that CRASHED was answered 200 to Vercel's
    // scheduler, to any uptime check, and to whoever reads the log — the exact
    // 200-shaped failure fixed in the three sibling crons in this same series.
    // The body was honest; only the status lied, which is the worst place for
    // the lie because the status is what everything automated reads.
    //
    // 503: nothing was built, so this cron did not do its work. The note is
    // kept verbatim — an empty slate is the honest failure and the sample slate
    // is never substituted.
    return NextResponse.json(
      {
        success: false,
        error: "slate build failed",
        season,
        week,
        note: "An empty slate is the honest failure; the sample slate is never substituted here.",
      },
      { status: 503 },
    );
  }

  const provider = resolveDfsSlateProvider();
  return NextResponse.json({
    success: true,
    generatedAt: now,
    season,
    week,
    players: report.players.length,
    dropped: report.dropped.length,
    sample: report.players.slice(0, MAX_TAKE).map((p) => ({
      name: p.name,
      pos: p.pos,
      team: p.team,
      proj: p.proj,
      floor: p.floor,
      ceiling: p.ceiling,
      salary: p.salary,
    })),
    // THE HONESTY BLOCK: what is measured and what is not.
    provenance: {
      projection: `MEASURED mean fantasyPointsPpr over the last ${report.window} real games`,
      floorCeiling: `MEASURED observed min/max in the same ${report.window}-game window`,
      salary: report.salaryIsReal
        ? "licensed feed"
        : "NOT REAL - no licensed feed, salary is 0 and the cap is a no-op",
      ownership: report.ownershipIsAssumed
        ? "ASSUMED neutral 0.5 - not derivable from any repo source, the tournament edge depends on it"
        : "projected",
      adjustments: report.adjustmentsCalibrated
        ? "calibrated magnitudes supplied"
        : `UNCALIBRATED defaults - ${report.adjustmentCount} adjustment(s) computed and reported but NOT applied to any projection`,
    },
    gate: {
      // Law 3: reported, never set.
      dfsProviderEnvSet: Boolean(process.env["DFS_PROVIDER"]?.trim()),
      isLiveDfsNow: isLiveDfs(),
      activeProvider: provider.name,
      note: "DFS_PROVIDER is founder-only. Until it is set, activeDfsSlate() returns the illustrative slate by design.",
    },
    droppedSample: report.dropped.slice(0, MAX_TAKE),
  });
}
