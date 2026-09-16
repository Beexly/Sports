/**
 * Vercel cron — refresh NFL player weekly stats from nflverse.
 *
 * Primary path (default): weekly player stats only + free IngestionRun SUCCESS.
 * Full path (?mode=full, or the daily window): sequential satellites (snaps,
 * injuries, depth, NGS).
 *
 * Why default is primary-only:
 * Hobby serverless OOM'd even with sequential satellites after weekly stats
 * (2026-08-06: killed after ~90s post-primary). Health SLA + paid-worth
 * spine need the primary stamp.
 *
 * C-244 — "satellites can run less often via mode=full" was the plan and it
 * did not happen: the scheduled invocation carries no query string, so on the
 * schedule they ran NEVER. Measured on production 2026-09-08,
 * depth_chart_entries held zero rows. They now also run once a day on their
 * own; lib/ingestion/satellite-window.ts holds the decision and the reasoning,
 * including why the Hobby constraint above is out of date (the account is on
 * Vercel Pro) without being disproven.
 *
 * C-264 — satellites target the LABELLED season directly (see
 * `satelliteSeason` below), never the primary path's own possibly-demoted
 * `season`. nflverse publishes rosters/depth-charts/injuries on an earlier
 * cadence than player-week stats, so coupling the two meant an already-
 * published depth chart stayed dark until player-week stats also shipped.
 * Each satellite's own result is the authority on whether its asset exists.
 *
 * Auth: Bearer <CRON_SECRET>.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { resolveFootballStatsSeasonFromDb } from "@/lib/nflverse/reg-rows-probe";
import { ingestPlayerWeeklyStats, ingestionTargetNflSeason } from "@/lib/ingestion/player-stats";
import { isUnpublishedSeasonSignal } from "@/lib/ingestion/unpublished-season";
import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";
// C-355: PFR advanced charting + rush tendencies. Rights citation —
// source-rights-registry.ts entry `pfr-advstats-via-nflverse`
// (status: permission_required, automation_allowed: false; verdict 2026-07-16,
// reports/rights/pfr-advstats-verdict-2026-07-16.md). The nflverse pfr_advstats
// RELEASE is the route; PFR direct stays `forbidden` in
// packages/data-ingestion/src/source-registry.ts (`pro-football-reference`,
// `sports-reference`). Until written confirmation from Sports Reference LLC
// lands, ingestPfrAdvStats returns clearance-denied and writes nothing.
import { ingestPfrAdvStats } from "@/lib/ingestion/pfr-adv-stats";
import { ingestRushTendencies } from "@/lib/ingestion/rush-tendencies";
import { recordFreeIngestionRun } from "@/lib/data-sources/free-ingestion-run";
import { decideSatelliteRun } from "@/lib/ingestion/satellite-window";
// C-413: watched-player injury / depth-chart status alerts. Snapshot BEFORE
// the injury+depth ingest, dispatch AFTER — the diff is the dedup (a re-run
// against unchanged upstream data produces zero changes and zero sends).
import {
  loadStatusSnapshot,
  dispatchStatusChangeAlerts,
  type StatusAlertSummary,
} from "@/lib/watchlist/status-alert-hook";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type SatelliteBundle = {
  snaps: unknown;
  injuries: unknown;
  depth: unknown;
  ngs: {
    passing: unknown;
    receiving: unknown;
    rushing: unknown;
  };
  pfrAdv: {
    pass: unknown;
    rec: unknown;
    rush: unknown;
  };
  rushTendencies: unknown;
};

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  // C-244: the scheduled invocation carries no query string, so `?mode=full`
  // meant the satellites never ran on the schedule at all — measurably, not
  // theoretically (depth_chart_entries held zero rows). They now run once a
  // day; an explicit ?mode= still wins in both directions. See
  // lib/ingestion/satellite-window.ts for why a clock window and not a
  // coverage check.
  const satelliteDecision = decideSatelliteRun(url.searchParams, new Date());

  // Ask the source for the labelled season (September 2026 → 2026). The
  // resolved display floor (2025 until 2026 REG rows exist) is the fallback
  // when the labelled season is not published yet, so the run stays green and
  // 2026 is picked up automatically the day nflverse ships week-1 rows.
  // Resolved against STORED REG rows (C-95): without the probe the resolver
  // can only ever return the completed floor, so the display season never
  // advanced past 2025 no matter what had been ingested.
  const resolved = await resolveFootballStatsSeasonFromDb();
  const labelled = ingestionTargetNflSeason();
  const requested = seasonParam ? Number(seasonParam) : labelled;
  if (!Number.isInteger(requested) || requested < 1999 || requested > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  let season = requested;
  let stats = await ingestPlayerWeeklyStats(season);
  let labelledAttempt: { season: number; status: string; error: string | null } | null = null;
  // Unpublished-season retry (scheduled runs only, never an explicit ?season
  // override): a 404 source-error is the unpublished signal, and nflverse can
  // also return the older combined asset with status "ok" and zero rows for
  // the labelled season before it ships — the 2b hard-filter upstream
  // (player-stats.ts) then has nothing to upsert. Both mean "not published";
  // any other source error (5xx, timeout) is an outage and keeps the failure
  // path; clearance-denied is a rights stop and never retries. The rule lives
  // in lib/ingestion/unpublished-season.ts, shared with backfill-player-data.
  const labelledUnpublished = isUnpublishedSeasonSignal(stats);
  if (!seasonParam && labelledUnpublished && labelled !== resolved.season) {
    labelledAttempt = { season: labelled, status: stats.status, error: stats.error ?? null };
    season = resolved.season;
    stats = await ingestPlayerWeeklyStats(season);
  }
  const primaryOk = stats.status === "ok";

  // C-264 fix. C-198's original guard stood the WHOLE satellite window down
  // whenever the primary path had fallen back to the completed floor, to stop
  // an automatic run writing 2025 depth charts — the newest of them from the
  // Super Bowl — as if they were current. That guard was correct about the
  // failure mode but too broad about the cause: it treated "player-week
  // stats aren't published for the labelled season" as if it meant "nothing
  // is", when nflverse ships rosters/depth-charts/injuries on an earlier
  // cadence than player-week stats/PBP/snap-counts. Measured 2026-09-09:
  // depth_charts_2026.csv (505k rows) and injuries_2026.csv were already
  // live while player_stats.csv.gz had no 2026 rows at all — the exact split
  // this coupling was blind to.
  //
  // Fix: satellites always target the LABELLED season directly, never the
  // primary's own demoted `season`. Each satellite's own result is the
  // authority on whether ITS asset is published — an unpublished satellite
  // returns its own honest source-error/zero-row status (surfaced in the
  // response body, e.g. `depth.status`) and writes nothing, exactly like an
  // outage would, so no stale prior-season data can ever be written as
  // current. An explicit `?season=` is still the operator's to aim.
  const runFull = satelliteDecision.runFull;
  const satelliteReason = satelliteDecision.reason;
  const satelliteSeason = seasonParam ? season : labelled;

  const ingestionRun = await recordFreeIngestionRun({
    sport: "nflverse-player-stats",
    gamesUpserted: stats.statsUpserted,
    oddsInserted: 0,
    failed: !primaryOk,
    errorMessage: primaryOk
      ? null
      : `refresh-player-stats: stats=${stats.status}${stats.error ? ` (${stats.error})` : ""}`,
  });

  let satellites: SatelliteBundle | null = null;
  let satellitesOk = true;
  /** C-413. Null when the satellite window did not run (nothing to diff). */
  let statusAlerts: StatusAlertSummary | null = null;

  if (runFull) {
    // C-413: capture the pre-ingest published status of every watched PLAYER
    // so the post-ingest snapshot can be diffed. Fail-isolated — a watchlist
    // table that is missing or unreachable yields an empty snapshot and the
    // ingest still proceeds.
    const statusBefore = await loadStatusSnapshot(db, satelliteSeason).catch(() => ({
      playerIds: [] as string[],
      snapshot: [],
    }));

    const snaps = await ingestSnapCounts(satelliteSeason);
    const injuries = await ingestInjuries(satelliteSeason);
    const depth = await ingestDepthCharts(satelliteSeason);
    const ngsPassing = await ingestNextGenStats(satelliteSeason, "passing");
    const ngsReceiving = await ingestNextGenStats(satelliteSeason, "receiving");
    const ngsRushing = await ingestNextGenStats(satelliteSeason, "rushing");
    // C-355. Sequential, same as the other satellites. PFR weekly files are
    // small; rush-tendencies fetches PBP with COLUMN PROJECTION
    // (lib/ingestion/rush-tendencies.ts) so the big file stays light.
    // ingestPfrAdvStats is clearance-gated on `pfr-advstats-via-nflverse`
    // (permission_required) — a denial is a rights stop, not an outage, and
    // the route still returns 200 on a healthy primary (see the satellite
    // SLA comment below).
    const pfrPass = await ingestPfrAdvStats(satelliteSeason, "pass");
    const pfrRec = await ingestPfrAdvStats(satelliteSeason, "rec");
    const pfrRush = await ingestPfrAdvStats(satelliteSeason, "rush");
    const rushTendencies = await ingestRushTendencies(satelliteSeason);
    // C-413: diff the post-ingest published status against the pre-ingest
    // snapshot and fan out through dispatchWatchlistAlert. Fail-isolated —
    // a broken alert path never fails the ingest the operator paid for.
    statusAlerts = await dispatchStatusChangeAlerts(
      db,
      statusBefore.snapshot,
      satelliteSeason,
    ).catch(() => null);
    satellites = {
      snaps,
      injuries,
      depth,
      ngs: { passing: ngsPassing, receiving: ngsReceiving, rushing: ngsRushing },
      pfrAdv: { pass: pfrPass, rec: pfrRec, rush: pfrRush },
      rushTendencies,
    };
    satellitesOk = [
      snaps,
      injuries,
      depth,
      ngsPassing,
      ngsReceiving,
      ngsRushing,
      pfrPass,
      pfrRec,
      pfrRush,
      rushTendencies,
    ].every((r) => r.status === "ok");
  }

  const success = primaryOk && satellitesOk;

  return NextResponse.json(
    {
      success,
      season,
      mode: runFull ? "full" : "primary",
      // Which path this invocation took and WHY, so a reader of the cron log
      // can tell a daily satellite run from an operator's explicit one and
      // from the 47 primary-only runs, without inferring it from the clock.
      satelliteReason,
      seasonResolution: {
        season: resolved.season,
        reason: resolved.reason,
        labelledCurrent: resolved.labelledCurrent,
        completedFloor: resolved.completedFloor,
        ingestionTarget: labelled,
        regRowsProbed: resolved.probed,
        regRowsProbeErrors: resolved.probeErrors,
      },
      labelledAttempt,
      stats,
      ...(satellites ?? {}),
      ...(statusAlerts ? { statusAlerts } : {}),
      ingestionRun,
    },
    { status: primaryOk ? 200 : 502 },
  );
}
