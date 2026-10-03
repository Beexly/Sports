/**
 * Shared selection for the stale published PENDING picks: one where-builder,
 * one select shape, one row mapper, one table printer. Both
 * scripts/ops/list-stale-pending-picks.ts (read-only listing) and
 * scripts/ops/adjudicate-stale-picks.ts (owner's unpublish tool) import from
 * here so the two can never drift on which rows count as stale.
 *
 * Criteria (unchanged from the original list script): isPublished true,
 * isBootstrap false, result PENDING, game.commenceTime in the future, and not
 * refreshed within STALE_PENDING_PICK_MAX_AGE_DAYS
 * (apps/web/lib/board/stale-pick-policy.ts). An optional pickIds list narrows
 * the set further; it never widens it.
 *
 * This module holds no write call. The only write in this tool family is the
 * single updateMany in adjudicate-stale-picks.ts.
 */
import type { PrismaClient } from "@prisma/client";
import {
  STALE_PENDING_PICK_MAX_AGE_DAYS,
  stalePickWhere,
  type StalePickWhere,
} from "../../../apps/web/lib/board/stale-pick-policy";

export { STALE_PENDING_PICK_MAX_AGE_DAYS };

export type StalePendingPickWhere = {
  isPublished: true;
  isBootstrap: false;
  result: "PENDING";
  game: { commenceTime: { gt: Date } };
  id?: { in: string[] };
} & StalePickWhere;

/** Prisma `where` for the stale published PENDING picks on unstarted games. */
export function stalePendingPickWhere(now: Date, pickIds: readonly string[] = []): StalePendingPickWhere {
  const where: StalePendingPickWhere = {
    isPublished: true,
    isBootstrap: false,
    result: "PENDING",
    game: { commenceTime: { gt: now } },
    ...stalePickWhere(now),
  };
  if (pickIds.length > 0) where.id = { in: [...pickIds] };
  return where;
}

export const STALE_PENDING_PICK_SELECT = {
  id: true,
  pickType: true,
  selection: true,
  line: true,
  clvLockLine: true,
  clvLockPrice: true,
  modelVersion: true,
  confidence: true,
  tier: true,
  generatedAt: true,
  dataFreshnessAt: true,
  game: {
    select: {
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      sport: { select: { key: true } },
    },
  },
} as const;

export const STALE_PENDING_PICK_ORDER_BY = [{ game: { commenceTime: "asc" } }, { generatedAt: "asc" }] as const;

/** Structural shape of one selected row (matches STALE_PENDING_PICK_SELECT). */
export type StalePendingPickRow = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  clvLockLine: number | null;
  clvLockPrice: number | null;
  modelVersion: string;
  confidence: number;
  tier: string;
  generatedAt: Date;
  dataFreshnessAt: Date | null;
  game: {
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    sport: { key: string };
  };
};

export type StalePendingPickReport = {
  pickId: string;
  sport: string;
  matchup: string;
  kickoff: string;
  pickType: string;
  selection: string;
  line: number;
  gradingLine: number;
  clvLockPrice: number | null;
  modelVersion: string;
  confidence: number;
  tier: string;
  generatedAt: string;
  lastRefreshedAt: string;
  staleDays: number;
};

export function mapStalePendingPickRow(r: StalePendingPickRow, now: Date): StalePendingPickReport {
  const refreshedAt = r.dataFreshnessAt ?? r.generatedAt;
  return {
    pickId: r.id,
    sport: r.game.sport.key,
    matchup: `${r.game.awayTeamName} @ ${r.game.homeTeamName}`,
    kickoff: r.game.commenceTime.toISOString(),
    pickType: r.pickType,
    selection: r.selection,
    line: r.line,
    gradingLine: r.clvLockLine ?? r.line,
    clvLockPrice: r.clvLockPrice,
    modelVersion: r.modelVersion,
    confidence: r.confidence,
    tier: r.tier,
    generatedAt: r.generatedAt.toISOString(),
    lastRefreshedAt: refreshedAt.toISOString(),
    staleDays: Math.floor((now.getTime() - refreshedAt.getTime()) / 86_400_000),
  };
}

/** SELECT-only: runs the shared selection and maps the rows. */
export async function findStalePendingPicks(
  prisma: PrismaClient,
  now: Date,
  pickIds: readonly string[] = [],
): Promise<StalePendingPickReport[]> {
  const rows = await prisma.pick.findMany({
    where: stalePendingPickWhere(now, pickIds),
    select: STALE_PENDING_PICK_SELECT,
    orderBy: [...STALE_PENDING_PICK_ORDER_BY],
  });
  return rows.map((r) => mapStalePendingPickRow(r, now));
}

export type StalePendingPicksJson = {
  generatedAt: string;
  maxAgeDays: number;
  count: number;
  picks: StalePendingPickReport[];
};

/** The machine-readable payload shared by both scripts (the list script prints exactly this). */
export function stalePendingPicksJson(picks: StalePendingPickReport[], now: Date): StalePendingPicksJson {
  return { generatedAt: now.toISOString(), maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS, count: picks.length, picks };
}

function pad(value: unknown, width: number): string {
  return String(value ?? "").padEnd(width);
}

/** Human-readable table: count line, column header, one row per pick, modelVersion tally. */
export function printStalePendingPicksTable(out: StalePendingPickReport[], now: Date): void {
  console.log(
    `${out.length} published PENDING pick(s) on unstarted games not refreshed in ${STALE_PENDING_PICK_MAX_AGE_DAYS}d (as of ${now.toISOString()})`,
  );
  console.log(pad("kickoff", 21), pad("sport", 22), pad("matchup", 48), pad("type", 10), pad("selection", 34), pad("grade@", 8), pad("model", 8), pad("stale", 6), "pickId");
  for (const r of out) {
    console.log(
      pad(r.kickoff.slice(0, 16) + "Z", 21),
      pad(r.sport, 22),
      pad(r.matchup.slice(0, 47), 48),
      pad(r.pickType, 10),
      pad(r.selection.slice(0, 33), 34),
      pad(r.gradingLine, 8),
      pad(r.modelVersion, 8),
      pad(`${r.staleDays}d`, 6),
      r.pickId,
    );
  }
  const byVersion = new Map<string, number>();
  for (const r of out) byVersion.set(r.modelVersion, (byVersion.get(r.modelVersion) ?? 0) + 1);
  console.log("by modelVersion:", [...byVersion.entries()].map(([v, n]) => `${v}=${n}`).join(" "));
}
