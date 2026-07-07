/**
 * freezeSlateCommitments — wires the commit-reveal slate commitment
 * (packages/prediction-engine/src/slate-commitment.ts) into the daily
 * ingestion cycle.
 *
 * After every odds-refresh cycle, this pass tries to freeze ONE immutable
 * Merkle commitment per (sport, UTC game-day): a single published root over
 * every pick-proof receipt on that day's slate, plus the pre-registered
 * population COUNT. Published BEFORE the first kickoff, it makes
 * cherry-picking impossible — you cannot later add a winner or drop a loser
 * without changing the root.
 *
 * DAY-BOUNDARY DESIGN (hostile-review fix): each run attempts today's slate and
 * CONDITIONALLY tomorrow's. US evening games land past 00:00 UTC — an NBA game
 * at 7pm PT is 03:00 UTC "tomorrow", and NFL primetime (SNF/MNF) crosses the
 * same line — so the UTC day containing those kickoffs has an earliest kickoff
 * BEFORE its own day's daily cron fires. Those slates must be frozen a day
 * early or they SKIP forever, silently.
 *
 * But freezing EVERY tomorrow-slate a day early shrinks the pre-registered
 * population (receipts first minted on the slate's own day land outside the
 * root). So tomorrow's slate is only frozen early when it MUST be — when its
 * earliest kickoff precedes the next daily run's reach (nextRunUtcHour +
 * margin). Slates that can safely wait capture their full same-day population
 * on their own day's run. Receipts minted after a slate froze carry slateKey
 * NULL by design (a frozen root is immutable — late picks are honestly outside
 * the pre-registration).
 *
 * Invariants (all enforced by the pure planner, planSlateCommitment):
 *   - one commitment per slateKey, ever (immutable once frozen)
 *   - only committed while the WHOLE slate is still pre-result
 *     (now < earliest kickoff) — otherwise it would be a fake pre-registration
 *   - an empty slate is never committed (commits to nothing)
 *
 * Operational rules (mirroring the receipt-minting pattern in
 * process-sport.ts):
 *   - EVERY slate attempt is wrapped in try/catch — a freeze failure is
 *     logged and must NEVER fail the ingestion cycle
 *   - the commitment row + the receipt backfill are ONE $transaction
 *     (hostile-review fix: a crash between them would otherwise leave a
 *     committed count whose receipt index never heals — publicly
 *     indistinguishable from tampering on /verify/slate)
 *   - persistence uses `create` (NOT upsert): the slateKey @unique constraint
 *     is the backstop against a concurrent double-commit; a unique violation
 *     rolls back the whole transaction and is logged as a stand-down
 *   - ONE RECEIPT, ONE SLATE (hostile-review fix): only receipts with
 *     slateKey NULL are eligible as leaves or backfill targets, so a
 *     postponed game moved to a new day cannot be re-committed into a second
 *     root or have its original pre-registration overwritten
 */

import { db } from "@sports/db";
import {
  dailySlateKey,
  planSlateCommitment,
  type HashFn,
} from "@sports/prediction-engine";

export interface SlateFreezeResult {
  readonly slateKey: string;
  readonly action: "COMMIT" | "SKIP";
  /** Present on SKIP — why nothing was frozen (or why the attempt failed). */
  readonly reason?: string;
  /** Present on COMMIT — the pre-registered population size. */
  readonly count?: number;
}

/** [start, end) of the UTC calendar day `offsetDays` after the one containing `now`. */
function utcDayBounds(now: Date, offsetDays: number): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Prisma unique-constraint violation (P2002) — the @unique race backstop firing. */
function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === "object" && (err as { code?: unknown }).code === "P2002") {
    return true;
  }
  return err instanceof Error && /unique constraint/i.test(err.message);
}

/**
 * Attempt to freeze slate commitments for each sport, for BOTH today's and
 * tomorrow's UTC game-days (see the day-boundary design note above).
 *
 * @param sportKeys keys of the sports processed this cycle (e.g. "americanfootball_nfl")
 * @param now       wall-clock time of the freeze attempt (also the committedAt on COMMIT)
 * @param hash      production HashFn — pass node:crypto SHA-256 hex (a weak hash voids the guarantee)
 * @param logPrefix log tag, e.g. "[cron:refresh-odds]"
 *
 * Never throws — every per-slate failure is caught, logged, and reported as a
 * SKIP so the ingestion cycle's success can never hinge on the freeze pass.
 */
/**
 * Hour of day (UTC) at which the NEXT daily freeze run reaches a slate — the
 * refresh-odds cron fires at 10:00 UTC. A tomorrow-slate whose earliest
 * kickoff precedes tomorrow's run (+ margin) can ONLY be caught by today's
 * run, so it is frozen early; one whose games all start later is left to
 * capture its full same-day population.
 */
const NEXT_RUN_UTC_HOUR = 10;
/** Safety margin (h) before the nominal run hour — covers cron jitter/retries. */
const NEXT_RUN_MARGIN_HOURS = 2;

export async function freezeSlateCommitments(
  sportKeys: readonly string[],
  now: Date,
  hash: HashFn,
  logPrefix = "[slate-commitment]",
): Promise<SlateFreezeResult[]> {
  const results: SlateFreezeResult[] = [];
  const nowIso = now.toISOString();

  for (const sportKey of sportKeys) {
    // Today (offset 0) may already be poisoned by an early-UTC kickoff — the
    // planner will SKIP it honestly. Tomorrow (offset 1) is frozen early ONLY
    // when it must be (an early-UTC kickoff its own day's run can't beat);
    // otherwise it waits for its own day, capturing its full population.
    for (const offsetDays of [0, 1]) {
      const { start, end } = utcDayBounds(now, offsetDays);
      // One commitment per sport + UTC day; the key is derived from the
      // slate's own day (start), not from `now`, so tomorrow's slate gets
      // tomorrow's key.
      const slateKey = dailySlateKey(sportKey, start.toISOString());

      try {
        const games = await db.game.findMany({
          where: {
            sport: { key: sportKey },
            commenceTime: { gte: start, lt: end },
          },
          select: { id: true, commenceTime: true },
        });

        if (games.length === 0) {
          results.push({ slateKey, action: "SKIP", reason: "no games on this slate" });
          continue;
        }

        const earliestKickoff = games.reduce(
          (min, g) => (g.commenceTime < min ? g.commenceTime : min),
          games[0]!.commenceTime,
        );

        // CONDITIONAL early freeze (F2): a tomorrow-slate that its own day's
        // run could still safely freeze (earliest kickoff after that run's
        // reach) is left to wait — freezing it now would only shrink its
        // pre-registered population. Today's slate (offset 0) always proceeds.
        if (offsetDays > 0) {
          const ownRunReach = new Date(start.getTime() + (NEXT_RUN_UTC_HOUR + NEXT_RUN_MARGIN_HOURS) * 3600_000);
          if (earliestKickoff >= ownRunReach) {
            results.push({ slateKey, action: "SKIP", reason: "deferred: own-day run can still freeze it" });
            continue;
          }
        }

        // Freeze-once: a commitment is immutable, so an existing row means SKIP.
        const existing = await db.slateCommitment.findUnique({
          where: { slateKey },
          select: { id: true },
        });

        // The slate's leaves — exactly the { pickId, payload } shape the Merkle
        // commitment hashes (SlateLeaf). Ordered deterministically: inclusion
        // proofs reference an index, so the leaf order must be reproducible.
        // slateKey:null = one-receipt-one-slate (postponement guard).
        const receipts = await db.pickProofReceipt.findMany({
          where: {
            pick: { gameId: { in: games.map((g) => g.id) } },
            slateKey: null,
          },
          select: { pickId: true, payload: true },
          orderBy: { pickId: "asc" },
        });

        const plan = planSlateCommitment(
          {
            slateKey,
            receipts,
            earliestKickoff: earliestKickoff.toISOString(),
            now: nowIso,
            alreadyCommitted: existing != null,
          },
          hash,
        );

        if (plan.action === "SKIP") {
          results.push({ slateKey, action: "SKIP", reason: plan.reason });
          continue;
        }

        // ATOMIC create + backfill (one transaction): either the commitment
        // row exists AND every covered receipt points at it, or neither —
        // a crash window between them would otherwise leave a public
        // count-vs-receipt-index mismatch that never heals (the planner's
        // freeze-once SKIP would block any retry). create, NOT upsert — the
        // slateKey @unique constraint is the concurrent-double-commit
        // backstop; a P2002 rolls the whole transaction back and we stand
        // down (the other writer's identical-input root won).
        try {
          await db.$transaction([
            db.slateCommitment.create({
              data: {
                slateKey: plan.commitment.slateId,
                root: plan.commitment.root,
                count: plan.commitment.count,
                committedAt: new Date(plan.commitment.committedAt),
              },
            }),
            db.pickProofReceipt.updateMany({
              // slateKey:null again: never restamp a receipt already owned by
              // an earlier commitment (postponement guard, belt-and-suspenders
              // with the leaf query above).
              where: { pickId: { in: receipts.map((r) => r.pickId) }, slateKey: null },
              data: { slateKey },
            }),
          ]);
        } catch (createErr) {
          if (isUniqueViolation(createErr)) {
            console.warn(
              `${logPrefix} slate ${slateKey} was frozen concurrently — standing down (unique constraint)`,
            );
            results.push({
              slateKey,
              action: "SKIP",
              reason: "already frozen by a concurrent commit",
            });
            continue;
          }
          throw createErr;
        }

        console.log(
          `${logPrefix} slate ${slateKey} frozen: root=${plan.commitment.root} count=${plan.commitment.count}`,
        );
        results.push({ slateKey, action: "COMMIT", count: plan.commitment.count });
      } catch (err) {
        // Non-fatal by contract: a freeze failure must never fail the ingestion
        // cycle (mirrors the receipt-minting pattern in process-sport.ts).
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`${logPrefix} slate freeze failed for ${slateKey}: ${message}`);
        results.push({ slateKey, action: "SKIP", reason: `freeze failed: ${message}` });
      }
    }
  }

  return results;
}
