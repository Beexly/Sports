/**
 * Settlement outbox worker — drains PickSettlementEvent rows and delivers
 * watchlist notifications through the real channels (Phase 1E).
 *
 * WHY THIS LIVES IN apps/web AND NOT packages/ingestion-pipeline: the
 * channel senders (lib/watchlist/channels/{web-push,email}-channel.ts),
 * the follower matching (lib/watchlist/settlement-hook.ts), the push
 * subscription store (lib/push/subscription-db.ts) and the tier gate
 * (lib/entitlements.ts, which pulls in auth/Stripe context) are all
 * web-app modules, and the workspace dependency edge only points
 * apps/web → packages/* — a pipeline package must never import the Next
 * app. So the pipeline owns the DURABLE half (appending the outbox row in
 * the same transaction as the pick settlement) and this worker owns the
 * DELIVERY half, invoked by the deliver-settlement-alerts cron route.
 *
 * Delivery contract (all outside any settlement transaction):
 *   - CLAIM is atomic: updateMany scoped to the row's current status —
 *     two concurrent drains cannot both claim the same event (the loser's
 *     count === 0 and it skips). attemptCount increments on claim, so
 *     every attempt is counted even if the worker dies mid-send.
 *   - CRASH RECOVERY: a worker that dies after claiming leaves the row
 *     CLAIMED. Rows CLAIMED longer than STALE_CLAIM_MINUTES are reclaimed
 *     to PENDING at the start of every drain — no event is ever stranded.
 *   - RETRY: FAILED rows with attemptCount < OUTBOX_MAX_ATTEMPTS are
 *     re-claimable; at the cap they stay FAILED as an honest dead-letter
 *     record (never deleted).
 *   - DUPLICATE SAFETY: the channels themselves are at-least-once (a crash
 *     between send and DELIVERED re-sends on reclaim) — acceptable for a
 *     notification; the SETTLEMENT is exactly-once (unique pickId, written
 *     transactionally by the pipeline) and this worker never touches picks.
 *   - Per-channel outcomes are persisted onto the event row (channelOutcomes
 *     JSON), so every delivery attempt leaves a durable, inspectable trace.
 */

import type {
  GradedPickNotifyEvent,
  WatchlistNotifySummary,
} from "@/lib/watchlist/settlement-hook";

export const OUTBOX_MAX_ATTEMPTS = 5;
export const STALE_CLAIM_MINUTES = 10;
export const OUTBOX_BATCH_SIZE = 25;

export interface OutboxEventRow {
  readonly id: string;
  readonly pickId: string;
  readonly gameId: string;
  readonly result: string;
  readonly settledAt: Date;
  readonly status: string;
  readonly attemptCount: number;
}

interface OutboxPickRow {
  readonly id: string;
  readonly pickType: string;
  readonly selection: string;
  readonly game: {
    readonly id: string;
    readonly homeTeamId: string | null;
    readonly awayTeamId: string | null;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly sport: { readonly key: string } | null;
  } | null;
}

/** Minimal Prisma-delegate-shaped surface — same defensive-cast doctrine as
 *  apps/web/lib/watchlist/db.ts and apps/web/lib/push/subscription-db.ts. */
export interface SettlementOutboxDb {
  pickSettlementEvent: {
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy: { createdAt: "asc" };
      take: number;
    }): Promise<OutboxEventRow[]>;
  };
  pick: {
    findUnique(args: {
      where: { id: string };
      select: Record<string, unknown>;
    }): Promise<OutboxPickRow | null>;
  };
}

/** The notify seam — production passes notifyWatchlistFollowersForGradedPick;
 *  tests pass a mock. Kept injectable so the worker's claim/state machine is
 *  testable without the channel stack. */
export type OutboxNotifyFn = (
  db: unknown,
  event: GradedPickNotifyEvent,
) => Promise<WatchlistNotifySummary>;

export interface OutboxDrainSummary {
  reclaimed: number;
  claimed: number;
  delivered: number;
  failed: number;
  /** Candidates lost to a concurrent drain's claim (updateMany count 0). */
  skippedRace: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * One drain pass: reclaim stale claims, claim up to OUTBOX_BATCH_SIZE
 * deliverable events, deliver each, and record the outcome. Never throws —
 * a broken event is marked FAILED (with the error recorded) and the drain
 * moves on; a broken drain-level step returns the partial summary.
 */
export async function drainSettlementOutbox(
  dbArg: unknown,
  notify: OutboxNotifyFn,
  now: Date = new Date(),
): Promise<OutboxDrainSummary> {
  const db = dbArg as SettlementOutboxDb;
  const summary: OutboxDrainSummary = {
    reclaimed: 0,
    claimed: 0,
    delivered: 0,
    failed: 0,
    skippedRace: 0,
  };

  try {
    // 1. Crash recovery: CLAIMED rows older than the stale window go back
    // to PENDING. (attemptCount already counted the dead attempt at claim
    // time, so a crash-looping event still runs out of attempts.)
    const staleCutoff = new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000);
    const reclaimed = await db.pickSettlementEvent.updateMany({
      where: { status: "CLAIMED", claimedAt: { lt: staleCutoff } },
      data: { status: "PENDING", claimedAt: null },
    });
    summary.reclaimed = reclaimed.count;

    // 2. Candidates: fresh PENDING rows plus FAILED rows with attempts left.
    const candidates = await db.pickSettlementEvent.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "FAILED", attemptCount: { lt: OUTBOX_MAX_ATTEMPTS } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: OUTBOX_BATCH_SIZE,
    });

    for (const candidate of candidates) {
      // 3. Atomic claim — scoped to the status we read, so a concurrent
      // drain that already claimed (or delivered) this row makes this a
      // count-0 no-op and we skip it.
      const claim = await db.pickSettlementEvent.updateMany({
        where: { id: candidate.id, status: candidate.status },
        data: {
          status: "CLAIMED",
          claimedAt: now,
          attemptCount: { increment: 1 },
        },
      });
      if (claim.count === 0) {
        summary.skippedRace++;
        continue;
      }
      summary.claimed++;

      try {
        const outcome = await deliverOne(db, candidate, notify);
        await db.pickSettlementEvent.update({
          where: { id: candidate.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            channelOutcomes: outcome,
          },
        });
        summary.delivered++;
      } catch (deliverErr) {
        summary.failed++;
        try {
          await db.pickSettlementEvent.update({
            where: { id: candidate.id },
            data: {
              status: "FAILED",
              channelOutcomes: { error: errorMessage(deliverErr) },
            },
          });
        } catch (markErr) {
          // Row stays CLAIMED; the stale-claim reclaim recovers it.
          console.warn(
            `[settlement-outbox] could not mark event ${candidate.id} FAILED: ` +
              errorMessage(markErr),
          );
        }
      }
    }
  } catch (drainErr) {
    console.warn(`[settlement-outbox] drain pass failed: ${errorMessage(drainErr)}`);
  }

  return summary;
}

/** Delivers one claimed event. Throws on infrastructure failure (missing
 *  pick/game, notify blowing up) — the caller records FAILED. */
async function deliverOne(
  db: SettlementOutboxDb,
  event: OutboxEventRow,
  notify: OutboxNotifyFn,
): Promise<Record<string, unknown>> {
  // VOID settlements are receipts, not alerts — the GRADED-only doctrine
  // (alert-eligibility.ts) only alerts decisive outcomes. Mark delivered
  // with an honest skip note instead of pretending a send happened.
  if (event.result !== "WIN" && event.result !== "LOSS" && event.result !== "PUSH") {
    return { skipped: "non_decisive_result", result: event.result };
  }

  const pick = await db.pick.findUnique({
    where: { id: event.pickId },
    select: {
      id: true,
      pickType: true,
      selection: true,
      game: {
        select: {
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          homeTeamName: true,
          awayTeamName: true,
          sport: { select: { key: true } },
        },
      },
    },
  });
  if (!pick || !pick.game) {
    throw new Error(`pick ${event.pickId} (or its game) no longer exists`);
  }

  const notifySummary = await notify(db, {
    pickId: event.pickId,
    pickType: pick.pickType,
    selection: pick.selection,
    result: event.result,
    settledAt: event.settledAt,
    sportKey: pick.game.sport?.key ?? "unknown",
    homeTeam: { id: pick.game.homeTeamId, name: pick.game.homeTeamName },
    awayTeam: { id: pick.game.awayTeamId, name: pick.game.awayTeamName },
  });

  return {
    followersMatched: notifySummary.followersMatched,
    dispatches: notifySummary.dispatches,
  };
}
