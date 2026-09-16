/**
 * Watchlist — the injury / depth-chart status-change caller (C-413).
 *
 * `dispatchWatchlistAlert` was already the send seam for graded picks
 * (settlement-hook.ts). This module is the SECOND production caller: when the
 * injury refresh cron (apps/web/app/api/cron/refresh-player-stats/route.ts)
 * ingests nflverse injuries + depth charts, any watched PLAYER whose published
 * report status or depth slot moved is fanned out through the SAME
 * `dispatchWatchlistAlert` — email and web push included, Elite gate included,
 * kill switch included. Nothing here re-derives those gates.
 *
 * DEDUP IS THE DIFF, NOT A LEDGER. Injuries and depth charts are replaced
 * wholesale per season on every ingest (`deleteMany` + `createMany`). The cron
 * snapshots the watched players BEFORE the ingest and AGAIN after; a re-run
 * against unchanged upstream data produces before === after, zero changes, and
 * therefore zero dispatches. One real status change produces exactly one
 * dispatch. There is no "already notified" table to drift, and no migration.
 *
 * FAIL-ISOLATED AT EVERY LAYER (mirrors settlement-hook.ts): the whole
 * function is wrapped in try/catch, each follower's notify attempt is
 * independently try/catch'd, and the cron additionally wraps its call — so a
 * broken alert path can never take down injury ingestion.
 *
 * Pure detection helpers (`diffPlayerStatus`) are separate from I/O so the
 * DoD pin — one status change → one dispatch, no duplicate on re-run — is
 * unit-testable without a database.
 */

import { getUserEntitlements } from "@/lib/entitlements";
import { dispatchWatchlistAlert } from "./alert-dispatch";
import type { StatusChangeEventInput } from "./alert-eligibility";

/** One watched player's current published status, as of a snapshot. */
export interface PlayerStatusSnapshot {
  readonly playerId: string;
  readonly playerName: string;
  /** Injury.reportStatus for the player's latest week in the season, or null
   *  when the player has no injury row (healthy / not on the report). */
  readonly injuryStatus: string | null;
  /** DepthChartEntry.depthRank for the player's latest week, or null when
   *  the player has no depth-chart row. */
  readonly depthRank: number | null;
}

/** A single field of a single watched player that moved between snapshots. */
export interface PlayerStatusChange {
  readonly playerId: string;
  readonly playerName: string;
  readonly statusKind: "injury" | "depth_chart";
  readonly previous: string | null;
  readonly current: string | null;
}

export interface StatusAlertDispatchRecord {
  readonly userId: string;
  readonly playerId: string;
  readonly sent: boolean;
  readonly outcome: string;
  readonly channels: ReadonlyArray<{
    readonly channel: string;
    readonly sent: boolean;
    readonly detail: string;
  }>;
}

export interface StatusAlertSummary {
  readonly changesDetected: number;
  readonly followersMatched: number;
  readonly dispatches: readonly StatusAlertDispatchRecord[];
}

/** Minimal Prisma-delegate-shaped surface this module depends on — same
 *  defensive `unknown`-cast doctrine as settlement-hook.ts and
 *  apps/web/lib/watchlist/db.ts. */
interface StatusAlertDb {
  watchlist: {
    findMany(args: {
      where: { entityType: string; entityId?: string };
    }): Promise<Array<{ id: string; userId: string; entityType: string; entityId: string }>>;
  };
  injury: {
    findMany(args: {
      where: { playerId: { in: string[] }; season: number };
      orderBy: { week: "desc" };
    }): Promise<
      Array<{ playerId: string | null; playerName: string; reportStatus: string | null; week: number }>
    >;
  };
  depthChartEntry: {
    findMany(args: {
      where: { playerId: { in: string[] }; season: number };
      orderBy: { week: "desc" };
    }): Promise<
      Array<{ playerId: string | null; playerName: string; depthRank: number | null; week: number }>
    >;
  };
  user: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; email: true; emailVerified: true };
    }): Promise<{ id: string; email: string | null; emailVerified: Date | null } | null>;
  };
}

function depthRankLabel(rank: number | null): string | null {
  return rank === null ? null : String(rank);
}

/**
 * Pure diff. Returns one entry per (player, field) whose published value
 * moved. Identical snapshots — the re-run case — return an empty array, which
 * is what makes "no duplicate on re-run" a property of the data rather than a
 * flag someone can forget to flip.
 */
export function diffPlayerStatus(
  before: readonly PlayerStatusSnapshot[],
  after: readonly PlayerStatusSnapshot[],
): PlayerStatusChange[] {
  const beforeById = new Map(before.map((s) => [s.playerId, s]));
  const changes: PlayerStatusChange[] = [];

  for (const next of after) {
    const prev = beforeById.get(next.playerId);
    // A player who was not in the before snapshot (newly watched, or newly
    // resolved onto the Player table) has no prior published value to
    // compare — first observation is not a change.
    if (!prev) continue;

    if (prev.injuryStatus !== next.injuryStatus) {
      changes.push({
        playerId: next.playerId,
        playerName: next.playerName || prev.playerName,
        statusKind: "injury",
        previous: prev.injuryStatus,
        current: next.injuryStatus,
      });
    }
    const prevRank = depthRankLabel(prev.depthRank);
    const nextRank = depthRankLabel(next.depthRank);
    if (prevRank !== nextRank) {
      changes.push({
        playerId: next.playerId,
        playerName: next.playerName || prev.playerName,
        statusKind: "depth_chart",
        previous: prevRank,
        current: nextRank,
      });
    }
  }

  // A player present in `before` but absent from `after` (unfollowed between
  // snapshots, or their Player row vanished) is intentionally not a change:
  // there is no current published value to announce.
  return changes;
}

function labelFor(change: PlayerStatusChange, value: string | null): string {
  if (value === null) {
    return change.statusKind === "injury" ? "not on the injury report" : "no depth-chart slot";
  }
  return value;
}

/** Plain-language, data-backed summary only (CLAUDE.md rule #2) — built
 *  entirely from the two published values, nothing invented. */
export function buildStatusChangeMessage(change: PlayerStatusChange): string {
  if (change.statusKind === "injury") {
    return (
      `${change.playerName}: injury status changed from ` +
      `${labelFor(change, change.previous)} to ${labelFor(change, change.current)}.`
    );
  }
  return (
    `${change.playerName}: depth-chart slot changed from ` +
    `${labelFor(change, change.previous)} to ${labelFor(change, change.current)}.`
  );
}

/**
 * Every distinct PLAYER entityId currently on any watchlist. Empty when the
 * table is missing or unreadable — the cron must keep ingesting either way.
 */
export async function getWatchedPlayerIds(dbArg: unknown): Promise<string[]> {
  try {
    const db = dbArg as StatusAlertDb;
    const rows = await db.watchlist.findMany({ where: { entityType: "PLAYER" } });
    return Array.from(new Set((Array.isArray(rows) ? rows : []).map((r) => r.entityId)));
  } catch (error) {
    console.warn(
      `[status-alert] could not list watched players: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return [];
  }
}

/**
 * Current published injury status + depth slot for an explicit player-id
 * list. Latest week per player wins (nflverse injuries accumulate across the
 * season; 2025+ depth charts stamp week 0). Never throws — a failed read
 * resolves to an empty snapshot, which diffs to zero changes.
 */
export async function snapshotWatchedPlayerStatus(
  dbArg: unknown,
  playerIds: readonly string[],
  season: number,
): Promise<PlayerStatusSnapshot[]> {
  if (playerIds.length === 0) return [];
  try {
    const db = dbArg as StatusAlertDb;
    const ids = [...playerIds];
    const [injuries, depths] = await Promise.all([
      db.injury.findMany({
        where: { playerId: { in: ids }, season },
        orderBy: { week: "desc" },
      }),
      db.depthChartEntry.findMany({
        where: { playerId: { in: ids }, season },
        orderBy: { week: "desc" },
      }),
    ]);

    const injuryByPlayer = new Map<string, { playerName: string; reportStatus: string | null }>();
    for (const row of Array.isArray(injuries) ? injuries : []) {
      if (!row.playerId || injuryByPlayer.has(row.playerId)) continue;
      injuryByPlayer.set(row.playerId, {
        playerName: row.playerName,
        reportStatus: row.reportStatus,
      });
    }
    const depthByPlayer = new Map<string, { playerName: string; depthRank: number | null }>();
    for (const row of Array.isArray(depths) ? depths : []) {
      if (!row.playerId || depthByPlayer.has(row.playerId)) continue;
      depthByPlayer.set(row.playerId, {
        playerName: row.playerName,
        depthRank: row.depthRank,
      });
    }

    return ids.map((playerId) => {
      const injury = injuryByPlayer.get(playerId);
      const depth = depthByPlayer.get(playerId);
      return {
        playerId,
        playerName: injury?.playerName ?? depth?.playerName ?? "",
        injuryStatus: injury?.reportStatus ?? null,
        depthRank: depth?.depthRank ?? null,
      };
    });
  } catch (error) {
    console.warn(
      `[status-alert] snapshot failed for season ${season}: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return [];
  }
}

/**
 * Fan-out for a list of already-diffed status changes. Never throws. Each
 * change is delivered independently: one follower's dispatch throwing does
 * not stop the next. `dispatchWatchlistAlert` owns WATCHLIST_ALERTS_ENABLED,
 * the Elite `canGetAlerts` gate, and both channels — this module never
 * re-derives them.
 */
export async function notifyWatchlistFollowersForStatusChanges(
  dbArg: unknown,
  changes: readonly PlayerStatusChange[],
  changedAt: Date,
): Promise<StatusAlertSummary> {
  const dispatches: StatusAlertDispatchRecord[] = [];
  let followersMatched = 0;
  if (changes.length === 0) {
    return { changesDetected: 0, followersMatched: 0, dispatches };
  }

  try {
    const db = dbArg as StatusAlertDb;

    for (const change of changes) {
      try {
        const followers = await db.watchlist.findMany({
          where: { entityType: "PLAYER", entityId: change.playerId },
        });
        if (!Array.isArray(followers) || followers.length === 0) continue;
        followersMatched += followers.length;

        const event: StatusChangeEventInput = {
          kind: "status_change",
          statusKind: change.statusKind,
          playerName: change.playerName,
          previous: change.previous,
          current: change.current,
          changedAt,
        };
        const message = buildStatusChangeMessage(change);

        for (const follower of followers) {
          try {
            const user = await db.user.findUnique({
              where: { id: follower.userId },
              select: { id: true, email: true, emailVerified: true },
            });
            if (!user) continue; // stale row (user deleted) — nothing to notify

            const entitlements = await getUserEntitlements(follower.userId).catch(() => null);
            if (!entitlements) continue;

            const result = await dispatchWatchlistAlert(
              dbArg,
              {
                userId: follower.userId,
                entityType: "PLAYER",
                entityId: change.playerId,
                event,
                message,
              },
              {
                canGetAlerts: entitlements.canGetAlerts,
                verifiedEmail: user.emailVerified ? user.email : null,
              },
            );
            dispatches.push({
              userId: follower.userId,
              playerId: change.playerId,
              sent: result.sent,
              outcome: result.outcome,
              channels: result.channels.map((c) => ({
                channel: c.channel,
                sent: c.sent,
                detail: c.detail,
              })),
            });
          } catch (perFollowerError) {
            console.warn(
              `[status-alert] notify failed for user ${follower.userId} / player ${change.playerId}: ` +
                `${perFollowerError instanceof Error ? perFollowerError.message : perFollowerError}`,
            );
            dispatches.push({
              userId: follower.userId,
              playerId: change.playerId,
              sent: false,
              outcome: "hook_error",
              channels: [],
            });
          }
        }
      } catch (perChangeError) {
        console.warn(
          `[status-alert] fan-out failed for player ${change.playerId}: ` +
            `${perChangeError instanceof Error ? perChangeError.message : perChangeError}`,
        );
      }
    }

    return { changesDetected: changes.length, followersMatched, dispatches };
  } catch (error) {
    console.warn(
      `[status-alert] status-change notify hook failed: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return { changesDetected: changes.length, followersMatched, dispatches };
  }
}

/**
 * The cron-facing entry point. `ingest` is the injury + depth-chart refresh
 * the caller is about to run (or just ran — the snapshot is taken around it).
 * Returns a summary the cron can surface in its JSON body. Never throws:
 * any failure inside the alert path degrades to an empty summary so the
 * ingestion result the operator actually cares about is never lost.
 *
 * Call pattern from refresh-player-stats:
 *   const statusBefore = await loadStatusSnapshot(db, season);
 *   await ingestInjuries(season); await ingestDepthCharts(season);
 *   const summary = await dispatchStatusChangeAlerts(db, statusBefore, season);
 */
export async function loadStatusSnapshot(
  dbArg: unknown,
  season: number,
): Promise<{ playerIds: string[]; snapshot: PlayerStatusSnapshot[] }> {
  const playerIds = await getWatchedPlayerIds(dbArg);
  const snapshot = await snapshotWatchedPlayerStatus(dbArg, playerIds, season);
  return { playerIds, snapshot };
}

export async function dispatchStatusChangeAlerts(
  dbArg: unknown,
  before: readonly PlayerStatusSnapshot[],
  season: number,
  changedAt: Date = new Date(),
): Promise<StatusAlertSummary> {
  try {
    const playerIds = Array.from(new Set(before.map((s) => s.playerId)));
    const after = await snapshotWatchedPlayerStatus(dbArg, playerIds, season);
    const changes = diffPlayerStatus(before, after);
    return await notifyWatchlistFollowersForStatusChanges(dbArg, changes, changedAt);
  } catch (error) {
    console.warn(
      `[status-alert] dispatchStatusChangeAlerts failed for season ${season}: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return { changesDetected: 0, followersMatched: 0, dispatches: [] };
  }
}
