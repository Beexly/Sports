/**
 * ⚠ SUPERSEDED PATH — READ THIS FIRST (audit signpost, nothing removed).
 *
 * `notifyWatchlistFollowersForGradedPick` has ZERO production callers. The
 * claim below that it "is invoked by the settlement OUTBOX WORKER" is NO
 * LONGER TRUE: apps/web/lib/settlement-outbox/worker.ts does its own
 * expansion and per-recipient delivery and never imports this module. The
 * only importer left is this file's own test.
 *
 * Live path: settle-sport.ts appends a PickSettlementEvent in the
 * settlement transaction → the deliver-settlement-alerts cron →
 * settlement-outbox/worker.ts. Read that for real behavior. Retained, not
 * resurrected (standing no-removals rule).
 *
 * ── original module doc follows ────────────────────────────────────────
 *
 * Watchlist — the settlement-side caller.
 *
 * This is the piece that was missing before this module existed:
 * `dispatchWatchlistAlert` was fully built and gated but had ZERO
 * production call sites — nothing in the settlement/grading pipeline ever
 * invoked it, so even a fully-eligible alert with both real channels wired
 * could never fire. This module is that caller.
 *
 * `notifyWatchlistFollowersForGradedPick` is invoked by the settlement
 * OUTBOX WORKER (apps/web/lib/settlement-outbox/worker.ts, driven by the
 * deliver-settlement-alerts cron), which drains the durable
 * PickSettlementEvent rows that settlement appended in the SAME
 * transaction as each pick's result update. Delivery therefore happens
 * strictly OUTSIDE the settlement transaction and strictly AFTER commit —
 * and, unlike the rejected in-loop hook design (PR #144), a crash between
 * settlement and notification cannot lose the alert (the outbox row
 * survives and is re-claimed) and a retry cannot duplicate the settlement
 * (the event is unique per pick). It:
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

import type { Prisma } from "@prisma/client";
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
    /**
     * BATCHED, not per-follower. This was `findUnique` called inside the
     * follower loop below — one round trip per follower (the N+1 that melts
     * Neon when a popular team settles). `id` is a scalar `String` column, so
     * the only valid multi-value filter is Prisma's `{ in: [...] }` — never a
     * bare array. Because the call site casts `dbArg as WatchlistNotifyDb`,
     * tsc validates against THIS declaration and not against Prisma's, so the
     * shape here must stay in Prisma's own filter form; the type-level
     * regression in settlement-hook.test.ts pins it.
     */
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; email: true; emailVerified: true };
    }): Promise<UserContactRow[]>;
  };
}

/**
 * TYPE-LEVEL REGRESSION — the only check that can catch this class of bug.
 *
 * Every query in this module is validated by tsc against the hand-written
 * `WatchlistNotifyDb` above, NOT against Prisma, because the entry point takes
 * `dbArg: unknown` and casts it. When such an interface drifts from the real
 * database, nothing goes red: the vi.fn() doubles in the tests agree with the
 * fiction, so interface, call site and tests stay mutually consistent while all
 * three disagree with Prisma. That is exactly how
 * packages/ingestion-pipeline/src/line-archive.ts shipped
 * `where: { market: string[] }` against a scalar `String` column — a
 * PrismaClientValidationError at runtime, thrown before the write, swallowed by
 * a try/catch, with a green CI.
 *
 * These two lines make tsc the enforcer: the interface's own where-clause types
 * must be assignable to Prisma's generated input types. Note this lives in the
 * MODULE and not in settlement-hook.test.ts on purpose —
 * apps/web/tsconfig.json excludes `**\/*.test.ts`, so a type assertion in a
 * test file under apps/web is never compiled and would silently prove nothing.
 */
type FollowerWhere = Parameters<WatchlistNotifyDb["watchlist"]["findMany"]>[0]["where"];
type ContactWhere = Parameters<WatchlistNotifyDb["user"]["findMany"]>[0]["where"];
type AssertAssignable<T, U> = T extends U ? true : never;
const _prismaShapeAssertions: [
  AssertAssignable<FollowerWhere, Prisma.WatchlistWhereInput>,
  AssertAssignable<ContactWhere, Prisma.UserWhereInput>,
] = [true, true];
void _prismaShapeAssertions;

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

/** One follower's dispatch attempt, recorded for the outbox event's
 *  per-channel outcome JSON. `channels` is dispatchWatchlistAlert's own
 *  per-channel detail (one entry per push subscription plus one for email). */
export interface WatchlistNotifyDispatchRecord {
  readonly userId: string;
  readonly entityId: string;
  readonly sent: boolean;
  readonly outcome: string;
  readonly channels: ReadonlyArray<{
    readonly channel: string;
    readonly sent: boolean;
    readonly detail: string;
  }>;
}

/** What the outbox worker persists onto the PickSettlementEvent after a
 *  delivery attempt — honest, per-follower, per-channel. */
export interface WatchlistNotifySummary {
  readonly followersMatched: number;
  readonly dispatches: readonly WatchlistNotifyDispatchRecord[];
}

/**
 * The settlement-side caller. Never throws. Returns a summary of every
 * follower dispatch attempted so the outbox worker can record per-channel
 * outcomes on the durable event row — a fan-out with zero followers (or no
 * resolvable team entity) returns an empty summary, which is a successful
 * delivery ("nobody to notify"), not a failure.
 */
export async function notifyWatchlistFollowersForGradedPick(
  dbArg: unknown,
  event: GradedPickNotifyEvent,
): Promise<WatchlistNotifySummary> {
  const dispatches: WatchlistNotifyDispatchRecord[] = [];
  let followersMatched = 0;
  try {
    const entities = teamEntities(event);
    if (entities.length === 0) return { followersMatched, dispatches }; // no resolvable entity

    const db = dbArg as WatchlistNotifyDb;
    const entityIds = entities.map((e) => e.id);
    const entityType: WatchlistEntityType = "TEAM";

    const followers = await db.watchlist.findMany({
      where: { entityType, entityId: { in: entityIds } },
    });
    followersMatched = followers.length;
    if (followers.length === 0) return { followersMatched, dispatches };

    const refById = new Map(entities.map((e) => [e.id, e.ref]));

    // One batched contact lookup for the whole follower set (was a
    // findUnique per follower). Deleted accounts simply do not come back and
    // are skipped below, exactly as the per-row null check did.
    const users = await db.user.findMany({
      where: { id: { in: [...new Set(followers.map((f) => f.userId))] } },
      select: { id: true, email: true, emailVerified: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    for (const follower of followers) {
      try {
        const teamRef = refById.get(follower.entityId);
        if (!teamRef) continue; // defensive — should be unreachable given the `in` filter above

        const user = userById.get(follower.userId);
        if (!user) continue; // stale row (user deleted) — nothing to notify

        const entitlements = await getUserEntitlements(follower.userId).catch(() => null);
        if (!entitlements) continue;

        const result = await dispatchWatchlistAlert(
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
        dispatches.push({
          userId: follower.userId,
          entityId: follower.entityId,
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
          `[watchlist-alert] notify failed for watchlist entry ${follower.id}: ` +
            `${perFollowerError instanceof Error ? perFollowerError.message : perFollowerError}`,
        );
        dispatches.push({
          userId: follower.userId,
          entityId: follower.entityId,
          sent: false,
          outcome: "hook_error",
          channels: [],
        });
      }
    }
    return { followersMatched, dispatches };
  } catch (error) {
    console.warn(
      `[watchlist-alert] settlement notify hook failed for pick ${event.pickId}: ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return { followersMatched, dispatches };
  }
}
