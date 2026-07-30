/**
 * Vercel cron — generate content DRAFTS from the live slate.
 *
 * Turns the day's real games + published picks into a Daily Slate Brief draft
 * and persists it with status DRAFT. It NEVER publishes: `publishedAt` stays
 * null and no status is ever PUBLISHED — publishing is a human action through
 * the cockpit review flow (/api/cockpit/content/[id]/review). (The Daily Slate
 * Brief template is PUBLIC-visibility by design — meant for eventual publication
 * after review — so the draft-only guarantee rides on status/publishedAt, not
 * visibility.) The draft-only CI guardrail (scripts/guardrails/draft-only.mjs)
 * enforces this mechanically.
 *
 * The body is built by the pure, non-fabricating builder in
 * `content-engine/build-draft.ts` — every number in the brief comes from a real
 * DB count (game count, published pick count), so there is no ungrounded stat to
 * guard. Idempotent per day: a second run finds the date-slugged draft and skips,
 * and a create that races another invocation is caught (unique-slug) and treated
 * as already generated rather than throwing.
 *
 * The daily brief and the Monday weekly recap are INDEPENDENT: the weekly recap
 * is attempted every Monday regardless of whether the daily brief already exists
 * (so a retry where the daily landed but the weekly failed still gets its recap).
 *
 * Auth mirrors the other crons: Vercel calls with `Authorization: Bearer
 * <CRON_SECRET>` (see apps/web/app/api/cron/refresh-odds/route.ts).
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { cronAuthError } from "@/lib/cron/authorize";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  buildDailyBriefDraft,
  buildWeeklyRecapDraft,
  type SlateSummary,
  type WeeklyRecapSummary,
} from "@/lib/content-engine/build-draft";
import { contentDraftToCreateData } from "@/lib/content-engine/persist-draft";
import type { ContentSourceRecord } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type DraftOutcome = { slug: string; created: boolean; skipped?: boolean; reason?: string };

/**
 * True for Prisma's P2002 unique-constraint violation. Under stub mode (no
 * DATABASE_URL) writes are no-ops, so this only fires against a real DB — a
 * concurrent invocation that inserted the same date-slug between our findFirst
 * and create. Checked structurally so the pure route stays decoupled from the
 * generated Prisma error class.
 */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Persist a draft, treating a raced unique-slug create as "already generated"
 * rather than an error — so overlapping cron/manual invocations both return the
 * documented skipped shape instead of one throwing a 500.
 */
async function createDraftIdempotent(
  createData: unknown,
  slug: string,
  onCreated: DraftOutcome,
): Promise<DraftOutcome> {
  try {
    await db.contentDraft.create({
      data: createData as Parameters<typeof db.contentDraft.create>[0]["data"],
    });
    return onCreated;
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { slug, created: false, skipped: true, reason: "already generated today (raced)" };
    }
    throw err;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const daily = await generateDailyBrief(now, dayStart, dayEnd);

  // Mondays: the weekly transparency recap runs INDEPENDENTLY of the daily
  // result. A retry where the daily already exists but the weekly failed (the
  // catch below), a manual daily backfill, or a concurrent duplicate must still
  // get the recap attempted. Isolated catch: a recap failure never fails the
  // route or the daily brief.
  let weeklyRecap: DraftOutcome | null = null;
  if (now.getUTCDay() === 1) {
    try {
      weeklyRecap = await generateWeeklyRecap(now, dayStart);
    } catch (err) {
      console.error(
        `[cron:generate-drafts] weekly recap failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return NextResponse.json({ ok: true, daily, weeklyRecap });
}

async function generateDailyBrief(
  now: Date,
  dayStart: Date,
  dayEnd: Date,
): Promise<DraftOutcome> {
  const isoDate = now.toISOString().slice(0, 10);
  const slug = `daily-slate-brief-${isoDate}`;

  const existing = await db.contentDraft
    .findFirst({ where: { slug }, select: { id: true } })
    .catch(() => null);
  if (existing) {
    return { slug, created: false, skipped: true, reason: "already generated today" };
  }

  const [gameCount, publishedPickCount] = await Promise.all([
    db.game.count({ where: { commenceTime: { gte: dayStart, lte: dayEnd } } }),
    db.pick.count({
      where: {
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
        generatedAt: { gte: dayStart, lte: dayEnd },
      },
    }),
  ]);

  const slate: SlateSummary = {
    briefDate: now,
    gameCount,
    publishedPickCount,
    dataQualityWarnings: [],
    lineMovementNotes: [],
  };

  const sources: ContentSourceRecord[] = [
    {
      sourceType: "ODDS",
      sourceLabel: "Live odds (Game / Odds tables)",
      sourceUrl: null,
      sourceStatus: "FRESH",
      trustLevel: "PLATFORM",
      fetchedAt: now,
      notes: `Composed from ${gameCount} games scheduled for ${isoDate}.`,
    },
    {
      sourceType: "DAILY_BRIEF",
      sourceLabel: "Published pick slate (today)",
      sourceUrl: null,
      sourceStatus: "FRESH",
      trustLevel: "PLATFORM",
      fetchedAt: now,
      notes: null,
    },
  ];

  const record = buildDailyBriefDraft({
    slate,
    generatedBy: "cron:generate-drafts",
    slug,
    sources,
  });

  return createDraftIdempotent(contentDraftToCreateData(record, now), slug, {
    slug,
    created: true,
    reason: "DRAFT",
  });
}

async function generateWeeklyRecap(now: Date, dayStart: Date): Promise<DraftOutcome> {
  const isoDate = now.toISOString().slice(0, 10);
  const slug = `weekly-transparency-recap-${isoDate}`;

  const existing = await db.contentDraft
    .findFirst({ where: { slug }, select: { id: true } })
    .catch(() => null);
  if (existing) return { slug, created: false, skipped: true, reason: "already generated" };

  const weekStart = subDays(dayStart, 7);
  const canonicalSettledWhere = {
    isPublished: true,
    isBootstrap: false,
    NOT: { modelVersion: "v5.0.0-seed" },
    settledAt: { gte: weekStart, lt: dayStart },
  } as const;

  const [winCount, lossCount, pushCount] = await Promise.all([
    db.pick.count({ where: { ...canonicalSettledWhere, result: "WIN" } }),
    db.pick.count({ where: { ...canonicalSettledWhere, result: "LOSS" } }),
    db.pick.count({ where: { ...canonicalSettledWhere, result: "PUSH" } }),
  ]);
  const settledCount = winCount + lossCount + pushCount;

  const summary: WeeklyRecapSummary = {
    weekStart,
    weekEnd: dayStart,
    settledCount,
    winCount,
    lossCount,
    pushCount,
    bootstrapExcluded: true,
    performanceGateOn: getReadinessGates().canExposePerformanceStats,
  };

  // WEEKLY_RECAP requires BOTH a PERFORMANCE and a PICK source
  // (source-coverage.ts: WEEKLY_RECAP: ["PERFORMANCE", "PICK"]). Attaching only
  // PERFORMANCE left every recap stuck at NEEDS_SOURCE, un-approvable without a
  // manual patch. Both are the same real settled-pick window, sourced honestly.
  const sources: ContentSourceRecord[] = [
    {
      sourceType: "PERFORMANCE",
      sourceLabel: "Settled canonical record (7-day window)",
      sourceUrl: null,
      sourceStatus: "FRESH",
      trustLevel: "PLATFORM",
      fetchedAt: now,
      notes: `W ${winCount} / L ${lossCount} / Push ${pushCount}, bootstrap + seed excluded.`,
    },
    {
      sourceType: "PICK",
      sourceLabel: "Settled canonical picks (7-day window)",
      sourceUrl: null,
      sourceStatus: "FRESH",
      trustLevel: "PLATFORM",
      fetchedAt: now,
      notes: `${settledCount} settled canonical picks graded in the window.`,
    },
  ];

  const record = buildWeeklyRecapDraft({
    summary,
    generatedBy: "cron:generate-drafts",
    slug,
    sources,
  });

  return createDraftIdempotent(contentDraftToCreateData(record, now), slug, {
    slug,
    created: true,
    reason: "DRAFT",
  });
}
