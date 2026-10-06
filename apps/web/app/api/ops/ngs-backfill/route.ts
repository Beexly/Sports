/**
 * POST /api/ops/ngs-backfill — backfill weekly NGS history into `signals`.
 *
 * WHY. The weekly cron only ingests the current week. The NGS weighting plan
 * (docs/research/2026-10-01/ngs-weighting-design.md, Step 1) needs seasons of
 * weekly evidence to run the within-player fit: backfill 2016–present through
 * the existing projector.
 *
 * POSTURE — READ BEFORE TOUCHING:
 * - INTERNAL-ONLY (2026-09-28 NGS doctrine, HARD). Writes only to `signals`.
 * - weight = 0 on every row (uncalibrated). The update path never overwrites
 *   weight — same as the weekly cron. Nothing here can move a published number.
 * - Idempotent: upsert on (entityType, entityId, key, season, week). Re-running
 *   a season is a no-op for rows already present.
 * - Bounded: one season per call (3 nflverse fetches, ~1MB each; weeks looped
 *   in-process). Call once per season, 2016 → present.
 * - CRON_SECRET Bearer <redacted> (founder/ops only).
 * - nflverse is free, CC-BY-4.0 — no paid credits, no spend.
 * - DB BRANCH RULE: validate the first season on a throwaway Neon branch
 *   before running against production (Garrett, 2026-09-28, HARD).
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
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MIN_SEASON = 2016;
const MAX_WEEK = 22;

interface BackfillBody {
  season?: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = cronAuthError(request);
  if (authError) return authError;

  let body: BackfillBody = {};
  try {
    body = (await request.json()) as BackfillBody;
  } catch {
    return NextResponse.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }

  const season = Math.floor(body.season ?? 0);
  const nowYear = new Date().getUTCFullYear();
  if (!Number.isFinite(season) || season < MIN_SEASON || season > nowYear) {
    return NextResponse.json(
      { ok: false, error: `season must be an integer ${MIN_SEASON}–${nowYear}` },
      { status: 400 },
    );
  }

  // Fetch the three season assets (each carries all weeks for the season).
  const fetched: {
    receiving: NgsReceivingRow[];
    rushing: NgsRushingRow[];
    passing: NgsPassingRow[];
  } = { receiving: [], rushing: [], passing: [] };
  const assetErrors: string[] = [];
  try {
    fetched.receiving = parseNgsReceiving(await fetchNflverse("ngs", season, "receiving"));
  } catch (e) {
    assetErrors.push(`receiving: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    fetched.rushing = parseNgsRushing(await fetchNflverse("ngs", season, "rushing"));
  } catch (e) {
    assetErrors.push(`rushing: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    fetched.passing = parseNgsPassing(await fetchNflverse("ngs", season, "passing"));
  } catch (e) {
    assetErrors.push(`passing: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (assetErrors.length === 3) {
    return NextResponse.json(
      { ok: false, season, error: "ALL_ASSETS_FAILED", assetErrors },
      { status: 502 },
    );
  }

  const reg = {
    receiving: fetched.receiving.filter((r) => r.seasonType === "REG"),
    rushing: fetched.rushing.filter((r) => r.seasonType === "REG"),
    passing: fetched.passing.filter((r) => r.seasonType === "REG"),
  };
  const weeksPresent = new Set<number>();
  for (const r of [...reg.receiving, ...reg.rushing, ...reg.passing]) {
    if (r.season === season && r.week >= 1 && r.week <= MAX_WEEK) weeksPresent.add(r.week);
  }
  const weeks = [...weeksPresent].sort((a, b) => a - b);

  let rowsWritten = 0;
  let rowsSkipped = 0;
  const writeErrors: string[] = [];
  const perWeek: Array<{ week: number; projected: number; written: number }> = [];

  for (const week of weeks) {
    const payloads = projectNgsSignalRows({
      receiving: reg.receiving,
      rushing: reg.rushing,
      passing: reg.passing,
      season,
      week,
    });
    let written = 0;
    for (const p of payloads) {
      try {
        const res = await db.signal.upsert({
          where: {
            entityType_entityId_key_season_week: {
              entityType: p.entityType,
              entityId: p.entityId,
              key: p.key,
              season: p.season,
              week: p.week,
            },
          },
          // Update path: never touch weight (calibration's property).
          update: {
            valueRaw: p.valueRaw,
            value: p.value,
            confidence: p.confidence,
            rightsSnapshot: p.rightsSnapshot as never,
            capturedAt: p.capturedAt,
            fetchedAt: p.fetchedAt,
          },
          create: {
            entityType: p.entityType,
            entityId: p.entityId,
            key: p.key,
            category: p.category,
            valueRaw: p.valueRaw,
            value: p.value,
            weight: p.weight,
            confidence: p.confidence,
            season: p.season,
            week: p.week,
            sourceId: p.sourceId,
            rightsSnapshot: p.rightsSnapshot as never,
            capturedAt: p.capturedAt,
            fetchedAt: p.fetchedAt,
          },
          select: { id: true },
        });
        void res;
        written += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (writeErrors.length < 5) writeErrors.push(`w${week}: ${msg}`);
        captureError(e instanceof Error ? e : new Error(msg), {
          tags: { route: "ops/ngs-backfill", season: String(season), week: String(week) },
        });
      }
    }
    rowsWritten += written;
    rowsSkipped += payloads.length - written;
    perWeek.push({ week, projected: payloads.length, written });
  }

  return NextResponse.json({
    ok: true,
    season,
    weeksFound: weeks,
    rowsWritten,
    rowsSkipped,
    assetErrors,
    writeErrors,
    perWeek,
    note: "All rows weight=0 (uncalibrated). Re-running this season is idempotent.",
  });
}
