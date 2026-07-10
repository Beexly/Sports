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
 * guard. Idempotent per day: a second run finds the date-slugged draft and skips.
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
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const slug = `daily-slate-brief-${isoDate}`;

  // Idempotent per calendar day: the date-slugged brief is created once.
  const existing = await db.contentDraft
    .findFirst({ where: { slug }, select: { id: true } })
    .catch(() => null);
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already generated today", slug });
  }

  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

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

  const createData = contentDraftToCreateData(record, now);

  // Structural match to Prisma's ContentDraftCreateInput (enum unions + nested
  // sources.create + Json metadata); the seed uses the same shape. Cast keeps
  // the pure mapper decoupled from the generated client.
  await db.contentDraft.create({
    data: createData as unknown as Parameters<typeof db.contentDraft.create>[0]["data"],
  });

  // Mondays additionally draft the weekly transparency recap — the honest
  // W/L/Push record of the prior 7 days, counted canonical-only exactly like
  // /api/performance. The builder itself holds the copy when the performance
  // gate is off, so this never fabricates a record. Failure here must not
  // void the daily brief above, hence the isolated catch.
  let weeklyRecap: { slug: string; created: boolean } | null = null;
  if (now.getUTCDay() === 1) {
    try {
      weeklyRecap = await generateWeeklyRecap(now, dayStart);
    } catch (err) {
      console.error(
        `[cron:generate-drafts] weekly recap failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    created: true,
    slug,
    status: "DRAFT",
    gameCount,
    publishedPickCount,
    weeklyRecap,
  });
}

async function generateWeeklyRecap(
  now: Date,
  dayStart: Date,
): Promise<{ slug: string; created: boolean }> {
  const isoDate = now.toISOString().slice(0, 10);
  const slug = `weekly-transparency-recap-${isoDate}`;

  const existing = await db.contentDraft
    .findFirst({ where: { slug }, select: { id: true } })
    .catch(() => null);
  if (existing) return { slug, created: false };

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

  const summary: WeeklyRecapSummary = {
    weekStart,
    weekEnd: dayStart,
    settledCount: winCount + lossCount + pushCount,
    winCount,
    lossCount,
    pushCount,
    bootstrapExcluded: true,
    performanceGateOn: getReadinessGates().canExposePerformanceStats,
  };

  const record = buildWeeklyRecapDraft({
    summary,
    generatedBy: "cron:generate-drafts",
    slug,
    sources: [
      {
        sourceType: "PERFORMANCE",
        sourceLabel: "Settled canonical picks (7-day window)",
        sourceUrl: null,
        sourceStatus: "FRESH",
        trustLevel: "PLATFORM",
        fetchedAt: now,
        notes: `W ${winCount} / L ${lossCount} / Push ${pushCount}, bootstrap + seed excluded.`,
      },
    ],
  });

  const createData = contentDraftToCreateData(record, now);
  await db.contentDraft.create({
    data: createData as unknown as Parameters<typeof db.contentDraft.create>[0]["data"],
  });

  return { slug, created: true };
}
