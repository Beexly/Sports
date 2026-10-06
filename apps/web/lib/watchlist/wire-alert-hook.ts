/**
 * Watchlist — the reporter-wire alert caller (C-417).
 *
 * Extends C-413's status-alert path: when the refresh-wire cron lands a
 * `wire.injury-out` / `wire.injury-return` / `wire.role-up` / `wire.role-down`
 * / `wire.depth-chart` / `wire.suspension` report for a WATCHED player, the
 * same `dispatchWatchlistAlert` seam sends email + web push (Elite gate,
 * kill switch, channels — all owned by dispatch, never re-derived here).
 *
 * DEDUP IS THE REPORT SET, NOT A LEDGER. The Signal unique key is one row
 * per (team, signal, season), so every distinct source lives in
 * `rightsSnapshot.reports`. `refreshWireFromRoster` returns only the reports
 * whose sourceId was NOT already on the slot; a cron re-run against unchanged
 * feeds therefore produces zero new reports and zero dispatches. One alert
 * per (player, signal, source): a second source on the same story is a new
 * alert; the same source re-posting is not.
 *
 * FAIL-ISOLATED AT EVERY LAYER (mirrors status-alert-hook.ts): the whole
 * function is wrapped in try/catch, each follower's notify is independently
 * try/catch'd, and the cron wraps its call — a broken alert path can never
 * take down wire ingestion.
 */

import { getUserEntitlements } from "@/lib/entitlements";
import { dispatchWatchlistAlert } from "./alert-dispatch";
import type { StatusChangeEventInput } from "./alert-eligibility";
import type { SignalType } from "@/lib/news/impact";
import { signalLabel } from "@/lib/news/impact";
import type { WireNewReport, WireReport } from "@/lib/news/wire-store";

/** Wire signal types that may alert a watched player (C-417). */
export const ALERTABLE_WIRE_SIGNALS: ReadonlySet<SignalType> = new Set<SignalType>([
  "injury-out",
  "injury-return",
  "role-up",
  "role-down",
  "depth-chart",
  "suspension",
]);

export function isAlertableWireSignal(signal: SignalType): boolean {
  return ALERTABLE_WIRE_SIGNALS.has(signal);
}

/** A watched player we can name-match against headlines. */
export interface WatchedPlayer {
  readonly playerId: string;
  readonly playerName: string;
}

/**
 * Conservative headline → watched-player match.
 *
 * Full-name containment, or a unique last name of 4+ characters. Never
 * guesses a player the headline does not name — an unmatched report is
 * dropped, not broadcast to every follower of the team.
 */
export function matchWatchedPlayersInHeadline(
  headline: string,
  players: readonly WatchedPlayer[],
): WatchedPlayer[] {
  const h = headline.toLowerCase();
  if (h.length === 0 || players.length === 0) return [];

  const lastNameCounts = new Map<string, number>();
  for (const p of players) {
    const parts = p.playerName.trim().split(/\s+/);
    const last = (parts[parts.length - 1] ?? "").toLowerCase();
    if (last.length >= 4) lastNameCounts.set(last, (lastNameCounts.get(last) ?? 0) + 1);
  }

  const matches: WatchedPlayer[] = [];
  for (const p of players) {
    const name = p.playerName.trim();
    if (name.length === 0) continue;
    if (h.includes(name.toLowerCase())) {
      matches.push(p);
      continue;
    }
    const parts = name.split(/\s+/);
    const last = (parts[parts.length - 1] ?? "").toLowerCase();
    if (last.length >= 4 && lastNameCounts.get(last) === 1 && h.includes(last)) {
      matches.push(p);
    }
  }
  return matches;
}

/** Plain-language message built only from the stored report (rule #2). */
export function buildWireReportMessage(
  player: WatchedPlayer,
  signal: SignalType,
  report: WireReport,
): string {
  const label = signalLabel(signal).toLowerCase();
  const source = report.sourceName;
  return `${player.playerName}: ${source} reports ${label} — "${report.headline}".`;
}

export interface WireAlertDispatchRecord {
  readonly userId: string;
  readonly playerId: string;
  readonly signal: SignalType;
  readonly sourceId: string;
  readonly sent: boolean;
  readonly outcome: string;
}

export interface WireAlertSummary {
  readonly newReports: number;
  readonly matchedReports: number;
  readonly followersMatched: number;
  readonly dispatches: readonly WireAlertDispatchRecord[];
}

interface WireAlertDb {
  watchlist: {
    findMany(args: {
      where: { entityType: string; entityId?: string };
    }): Promise<Array<{ id: string; userId: string; entityType: string; entityId: string }>>;
  };
  player: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; fullName: true };
    }): Promise<Array<{ id: string; fullName: string }>>;
  };
  user: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; email: true; emailVerified: true };
    }): Promise<{ id: string; email: string | null; emailVerified: Date | null } | null>;
  };
}

/**
 * Every distinct PLAYER on any watchlist, with the name we can match against
 * a headline. Empty when either table is unreadable — the cron keeps ingesting.
 */
export async function loadWatchedPlayersWithNames(dbArg: unknown): Promise<WatchedPlayer[]> {
  try {
    const db = dbArg as WireAlertDb;
    const rows = await db.watchlist.findMany({ where: { entityType: "PLAYER" } });
    const ids = Array.from(
      new Set((Array.isArray(rows) ? rows : []).map((r) => r.entityId)),
    );
    if (ids.length === 0) return [];
    const players = await db.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
    return (Array.isArray(players) ? players : [])
      .filter((p) => typeof p.fullName === "string" && p.fullName.trim().length > 0)
      .map((p) => ({ playerId: p.id, playerName: p.fullName.trim() }));
  } catch (error) {
    console.warn(
      `[wire-alert] could not list watched players: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return [];
  }
}

/**
 * Fan out alerts for the reports this cycle actually ADDED to the store.
 * Never throws. `dispatchWatchlistAlert` owns WATCHLIST_ALERTS_ENABLED, the
 * Elite `canGetAlerts` gate, and both channels.
 */
export async function dispatchWireReportAlerts(
  dbArg: unknown,
  newReports: readonly WireNewReport[],
  changedAt: Date = new Date(),
): Promise<WireAlertSummary> {
  const dispatches: WireAlertDispatchRecord[] = [];
  let followersMatched = 0;
  let matchedReports = 0;
  if (newReports.length === 0) {
    return { newReports: 0, matchedReports: 0, followersMatched: 0, dispatches };
  }

  try {
    const db = dbArg as WireAlertDb;
    const alertable = newReports.filter((r) => isAlertableWireSignal(r.signal));
    if (alertable.length === 0) {
      return {
        newReports: newReports.length,
        matchedReports: 0,
        followersMatched: 0,
        dispatches,
      };
    }

    const watched = await loadWatchedPlayersWithNames(dbArg);

    for (const entry of alertable) {
      try {
        const players = matchWatchedPlayersInHeadline(entry.report.headline, watched);
        if (players.length === 0) continue;
        matchedReports += 1;

        for (const player of players) {
          try {
            const followers = await db.watchlist.findMany({
              where: { entityType: "PLAYER", entityId: player.playerId },
            });
            if (!Array.isArray(followers) || followers.length === 0) continue;
            followersMatched += followers.length;

            const event: StatusChangeEventInput = {
              kind: "status_change",
              statusKind: "wire_report",
              playerName: player.playerName,
              previous: null,
              current: entry.report.headline,
              changedAt,
              signalType: entry.signal,
              sourceName: entry.report.sourceName,
            };
            const message = buildWireReportMessage(player, entry.signal, entry.report);

            for (const follower of followers) {
              try {
                const user = await db.user.findUnique({
                  where: { id: follower.userId },
                  select: { id: true, email: true, emailVerified: true },
                });
                if (!user) continue;

                const entitlements = await getUserEntitlements(follower.userId).catch(() => null);
                if (!entitlements) continue;

                const result = await dispatchWatchlistAlert(
                  dbArg,
                  {
                    userId: follower.userId,
                    entityType: "PLAYER",
                    entityId: player.playerId,
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
                  playerId: player.playerId,
                  signal: entry.signal,
                  sourceId: entry.report.sourceId,
                  sent: result.sent,
                  outcome: result.outcome,
                });
              } catch (perFollowerError) {
                console.warn(
                  `[wire-alert] notify failed for user ${follower.userId} / player ${player.playerId}: ` +
                    `${perFollowerError instanceof Error ? perFollowerError.message : perFollowerError}`,
                );
                dispatches.push({
                  userId: follower.userId,
                  playerId: player.playerId,
                  signal: entry.signal,
                  sourceId: entry.report.sourceId,
                  sent: false,
                  outcome: "hook_error",
                });
              }
            }
          } catch (perPlayerError) {
            console.warn(
              `[wire-alert] fan-out failed for player ${player.playerId}: ` +
                `${perPlayerError instanceof Error ? perPlayerError.message : perPlayerError}`,
            );
          }
        }
      } catch (perReportError) {
        console.warn(
          `[wire-alert] report handling failed for ${entry.key}/${entry.team}: ` +
            `${perReportError instanceof Error ? perReportError.message : perReportError}`,
        );
      }
    }

    return {
      newReports: newReports.length,
      matchedReports,
      followersMatched,
      dispatches,
    };
  } catch (error) {
    console.warn(
      `[wire-alert] wire-report notify hook failed: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return {
      newReports: newReports.length,
      matchedReports,
      followersMatched,
      dispatches,
    };
  }
}
