/**
 * GET /api/cron/ngs-ingest — weekly Next Gen Stats ingestion into `signals`.
 *
 * WHY THIS EXISTS. nflverse redistributes NFL Next Gen Stats tracking data
 * under CC-BY-4.0 (verified value-identical to nextgenstats.nfl.com). The
 * typed-access layer (`@sports/data-ingestion` nflverse-ngs.ts) parsed it but
 * had zero production callers — no scheduled fetch, no persistence. This cron
 * closes the loop: it fetches the three NGS assets (receiving / rushing /
 * passing), parses them, and upserts weekly headline metrics
 * (ngs.avg_separation, ngs.ryoe_per_att, ngs.cpoe) as player signals keyed by
 * gsisId — the join key the stored-signal reader (Tier 1 #2) and the ledger
 * composer (Tier 1 #1) already use.
 *
 * POSTURE — READ BEFORE TOUCHING:
 * - INTERNAL-ONLY (2026-09-28 NGS doctrine, HARD): rows land in the internal
 *   `signals` table, read only by shadow/ops paths. Nothing here touches the
 *   public website, projections, or rankings.
 * - weight = 0 on every row. NGS weighting is founder-gated; uncalibrated
 *   signals compute in shadow and never affect published outputs. Re-ingest
 *   never overwrites weight, so a future founder-approved calibration pass
 *   cannot be clobbered by this cron.
 * - confidence = 1.0 (settled tracking measurements). Sample sizes ride in
 *   rightsSnapshot for calibration-time filtering — this writer invents no
 *   cutoffs.
 * - Week defaults to the max REG week present in the fetched data (never
 *   invented); season defaults to the latest nflverse inspection season.
 *   Explicit ?season=&week= override both.
 *
 * LAWS OBSERVED:
 * - WRITES ONLY to `signals`, idempotent upsert on
 *   (entityType, entityId, key, season, week). No other tables.
 * - Bounded: 3 assets, ~1MB each; rows bounded by player count (~1,500 max).
 *   Per-asset try/catch; one asset's failure never aborts the others.
 * - CRON_SECRET auth (cronAuthError). GET, per the repo's cron convention
 *   (Vercel cron jobs issue GET; all 31 sibling cron routes are GET).
 * - nflverse is a free, CC-BY-4.0 redistribution — no paid credits, no spend.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import {
  fetchNflverse,
  parseNgsPassing,
  parseNgsReceiving,
  parseNgsRushing,
  type NgsPassingRow,
  type NgsReceivingRow,
  type NgsRushingRow,
} from "@sports/data-ingestion";
import { projectNgsSignalRows } from "@/lib/nflverse/ngs-signal-project";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const NGS_VARIANTS = ["receiving", "rushing", "passing"] as const;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function maxRegWeek(
  rows: ReadonlyArray<{ season: number; week: number; seasonType: string }>,
  season: number,
): number {
  let max = 0;
  for (const row of rows) {
    if (row.season === season && row.week > max && row.week <= 22) max = row.week;
  }
  return max;
}

export async function GET(request: Request) {
  const authError = cronAuthError(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const season = parsePositiveInt(url.searchParams.get("season"), latestNflverseInspectionSeason());
  const requestedWeek = url.searchParams.get("week");
  const explicitWeek = requestedWeek === null ? null : parsePositiveInt(requestedWeek, 0);

  const fetched: {
    receiving: NgsReceivingRow[];
    rushing: NgsRushingRow[];
    passing: NgsPassingRow[];
  } = { receiving: [], rushing: [], passing: [] };
  const assetErrors: string[] = [];

  for (const variant of NGS_VARIANTS) {
    try {
      const table = await fetchNflverse("ngs", season, variant);
      if (variant === "receiving") fetched.receiving = parseNgsReceiving(table);
      else if (variant === "rushing") fetched.rushing = parseNgsRushing(table);
      else fetched.passing = parseNgsPassing(table);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      assetErrors.push(`${variant}: ${message}`);
      captureError(error instanceof Error ? error : new Error(message), {
        tags: { route: "cron/ngs-ingest", variant },
      });
    }
  }

  const allRows = [...fetched.receiving, ...fetched.rushing, ...fetched.passing];
  const regRows = allRows.filter((r) => r.seasonType === "REG");
  const dataWeek = maxRegWeek(regRows, season);
  const week = explicitWeek ?? dataWeek;

  if (week <= 0) {
    return NextResponse.json(
      {
        ok: false,
        season,
        error: "NO_WEEKLY_ROWS",
        detail: `No REG weekly NGS rows found for season ${season}; nothing persisted.`,
        assetErrors,
      },
      { status: 200 },
    );
  }

  const payloads = projectNgsSignalRows({
    receiving: fetched.receiving.filter((r) => r.seasonType === "REG"),
    rushing: fetched.rushing.filter((r) => r.seasonType === "REG"),
    passing: fetched.passing.filter((r) => r.seasonType === "REG"),
    season,
    week,
  });

  let written = 0;
  const writeErrors: string[] = [];
  for (const p of payloads) {
    try {
      await db.signal.upsert({
        where: {
          entityType_entityId_key_season_week: {
            entityType: p.entityType,
            entityId: p.entityId,
            key: p.key,
            season: p.season,
            week: p.week,
          },
        },
        create: {
          entityType: p.entityType,
          entityId: p.entityId,
          key: p.key,
          category: p.category,
          valueRaw: p.valueRaw,
          value: p.value,
          weight: p.weight, // 0 = uncalibrated; update path never touches weight
          confidence: p.confidence,
          season: p.season,
          week: p.week,
          sourceId: p.sourceId,
          rightsSnapshot: p.rightsSnapshot,
          capturedAt: p.capturedAt,
          fetchedAt: p.fetchedAt,
        },
        update: {
          value: p.value,
          valueRaw: p.valueRaw,
          confidence: p.confidence,
          capturedAt: p.capturedAt,
          fetchedAt: p.fetchedAt,
          sourceId: p.sourceId,
          rightsSnapshot: p.rightsSnapshot,
        },
      });
      written += 1;
    } catch (error) {
      writeErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return NextResponse.json({
    ok: writeErrors.length === 0 && assetErrors.length < NGS_VARIANTS.length,
    season,
    week,
    weekSource: explicitWeek !== null ? "explicit-param" : "max-week-in-data",
    assetsFetched: NGS_VARIANTS.length - assetErrors.length,
    assetErrors,
    signalsProjected: payloads.length,
    signalsWritten: written,
    writeErrors: writeErrors.slice(0, 5),
    posture: "internal-only; weight=0 (uncalibrated, shadow-only); NGS weighting founder-gated",
  });
}
