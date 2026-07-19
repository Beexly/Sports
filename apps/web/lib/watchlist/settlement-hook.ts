/**
 * Watchlist — the settlement-side caller.
 *
 * This is the piece that was missing before this module existed:
 * `dispatchWatchlistAlert` was fully built and gated but had ZERO
 * production call sites — nothing in the settlement/grading pipeline ever
 * invoked it, so even a fully-eligible alert with both real channels wired
 * could never fire. This module is that caller.
 *
 * `notifyWatchlistFollowersForGradedPick` is invoked by
 * `packages/ingestion-pipeline/src/settle-sport.ts`'s optional
 * `onPickGraded` hook, AFTER each pick's settlement write has already
 * committed (`db.pick.updateMany` succeeded) — never inside that write,
 * never able to affect it. It:
 *   1. Resolves the graded pick's TEAM entities (game.homeTeamId /
 *      awayTeamId — the only entity references a Pick/Game carries today;
 *      PLAYER-level watchlist entries have no matching production source
 *      yet, so they simply never match here, honestly, rather than being
 *      faked).
 *   2. Looks up active Watchlist entries following any of those entities.
 *   3. For each follower, resolves their tier + verified email and calls
 *      `dispatchWatchlistAlert` — which independently re-checks
 *      WATCHLIST_ALERTS_ENABLED, the graded-only doctrine, and
 *      canGetAlerts, so this module never needs to (and never should)
 *      duplicate that gating.
 *
 * FAIL-ISOLATED AT EVERY LAYER: the whole function is wrapped in a
 * try/catch, and each follower's notify attempt is independently
 * try/catch'd too, so one bad row (a deleted user, a DB hiccup, a channel
 * throwing) can never stop the rest of the fan-out, and this function can
 * never throw back into the settlement job that called it. The caller
 * (settle-sport.ts) ALSO wraps its call in try/catch as defense in depth —
 * belt and suspenders, not a substitute for this module's own isolation.
 */

import { getUserEntitlements } from "@/lib/entitlements";
import { dispatchWatchlistAlert } from "./alert-dispatch";
import type { WatchlistEntityType } from "./types";

export interface GradedPickTeamRef {
  readonly id: string | null;
  readonly name: string;
}

/** The graded-event data the settlement pipeline hands to this hook. Pure
 *  data — no db handle, no Prisma types — so packages/ingestion-pipeline
 *  (which must not depend on apps/web) can construct and pass this without
 *  importing anything from here. */
export interface GradedPickNotifyEvent {
  readonly pickId: string;
  readonly pickType: string;
  readonly selection: string;
  /** WIN | LOSS | PUSH — settlement's SettlementResult. VOID picks never
   *  reach this hook (settle-sport only calls it for a decisive grade). */
  readonly result: "WIN" | "LOSS" | "PUSH";
  readonly settledAt: Date;
  readonly sportKey: string;
  readonly homeTeam: GradedPickTeamRef;
  readonly awayTeam: GradedPickTeamRef;
}

interface WatchlistFollowerRow {
  readonly id: string;
  readonly userId: string;
  readonly entityType: string;
  readonly entityId: string;
}

interface UserContactRow {
  readonly id: string;
  readonly email: string | null;
  readonly emailVerified: Date | null;
}

/** Minimal Prisma-delegate-shaped surface this module depends on — same
 *  defensive `unknown`-cast doctrine as apps/web/lib/watchlist/db.ts and
 *  apps/web/lib/push/subscription-db.ts. */
interface WatchlistNotifyDb {
  watchlist: {
    findMany(args: {
      where: { entityType: string; entityId: { in: string[] } };
    }): Promise<WatchlistFollowerRow[]>;
  };
  user: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; email: true; emailVerified: true };
    }): Promise<UserContactRow | null>;
  };
}

function teamEntities(event: GradedPickNotifyEvent): Array<{ id: string; ref: GradedPickTeamRef }> {
  const out: Array<{ id: string; ref: GradedPickTeamRef }> = [];
  if (event.homeTeam.id) out.push({ id: event.homeTeam.id, ref: event.homeTeam });
  if (event.awayTeam.id) out.push({ id: event.awayTeam.id, ref: event.awayTeam });
  return out;
}

/** Plain-language, data-backed summary only (CLAUDE.md rule #2) — built
 *  entirely from the graded pick's own real fields, nothing invented. */
function buildAlertMessage(team: GradedPickTeamRef, event: GradedPickNotifyEvent): string {
  return `${team.name}: ${event.selection} graded ${event.result}.`;
}

/**
 * The settlement-side caller. Never throws. Returns void — the caller
 * (settle-sport.ts) doesn't need a result, only the guarantee that this
 * never blocks or fails settlement.
 */
export async function notifyWatchlistFollowersForGradedPick(
  dbArg: unknown,
  event: GradedPickNotifyEvent,
): Promise<void> {
  try {
    const entities = teamEntities(event);
    if (entities.length === 0) return; // no resolvable entity — nothing to notify

    const db = dbArg as WatchlistNotifyDb;
    const entityIds = entities.map((e) => e.id);
    const entityType: WatchlistEntityType = "TEAM";

    const followers = await db.watchlist.findMany({
      where: { entityType, entityId: { in: entityIds } },
    });
    if (followers.length === 0) return;

    const refById = new Map(entities.map((e) => [e.id, e.ref]));

    for (const follower of followers) {
      try {
        const teamRef = refById.get(follower.entityId);
        if (!teamRef) continue; // defensive — should be unreachable given the `in` filter above

        const user = await db.user.findUnique({
          where: { id: follower.userId },
          select: { id: true, email: true, emailVerified: true },
        });
        if (!user) continue; // stale row (user deleted) — nothing to notify

        const entitlements = await getUserEntitlements(follower.userId).catch(() => null);
        if (!entitlements) continue;

        await dispatchWatchlistAlert(
          dbArg,
          {
            userId: follower.userId,
            entityType,
            entityId: follower.entityId,
            event: { pickResult: event.result, settledAt: event.settledAt },
            message: buildAlertMessage(teamRef, event),
          },
          {
            canGetAlerts: entitlements.canGetAlerts,
            verifiedEmail: user.emailVerified ? user.email : null,
          },
        );
      } catch (perFollowerError) {
        console.warn(
          `[watchlist-alert] notify failed for watchlist entry ${follower.id}: ` +
            `${perFollowerError instanceof Error ? perFollowerError.message : perFollowerError}`,
        );
      }
    }
  } catch (error) {
    console.warn(
      `[watchlist-alert] settlement notify hook failed for pick ${event.pickId}: ` +
        `${error instanceof Error ? error.message : error}`,
    );
  }
}
