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
 * The SAME population rule protects today's slate from a pre-mint freeze
 * pass (the 07:00 UTC settle-picks retry shot): the 10:00 refresh-odds run
 * MINTS the day's picks before it freezes, so a 07:00 freeze of today's
 * slate would commit yesterday's population and freeze-once would lock the
 * 10:00 mint out of the root forever. A pre-mint-hour run therefore defers
 * offset 0 to the mint run unless a kickoff precedes the mint run's reach
 * (early kickoffs are sealed immediately — a pre-kickoff root over the
 * smaller existing population beats no pre-kickoff root at all).
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

import { randomBytes } from "node:crypto";
import { db } from "@sports/db";
import {
  dailySlateKey,
  planSlateCommitment,
  type HashFn,
} from "@sports/prediction-engine";
import { commitLedger, encodeFixedPoint, CURVE_ORDER } from "@sports/crypto";

/** Uniform-enough blinding scalar in [0, n): 48 CSPRNG bytes mod n (bias ~2^-128). */
function randomBlinding(): bigint {
  return BigInt("0x" + randomBytes(48).toString("hex")) % CURVE_ORDER;
}

/**
 * Pedersen aggregate over the slate's published edge scores (ZK roadmap Phase
 * 0.5 — an additive layer on the Merkle root; the public hex commits to the
 * slate's TOTAL claimed edge before kickoff, openable after). Pure-fail-open:
 * any invalid input (missing/out-of-range edgeScore) or crypto failure returns
 * nulls so the Merkle commitment is NEVER blocked by this layer. Blindings are
 * CSPRNG-minted here (the crypto core never mints randomness); the summed
 * blinding is the SECRET opener — persisted server-side, never on a public route.
 */
export function mintSlatePedersenAggregate(
  edgeScores: readonly (number | null | undefined)[],
): { hex: string; value: string; blindingSum: string } | null {
  if (edgeScores.length === 0) return null;
  const values: bigint[] = [];
  for (const e of edgeScores) {
    // Published edge scores live on the 0–100 scale (receipt column contract).
    const enc = typeof e === "number" ? encodeFixedPoint(e, 0, 100) : null;
    if (enc === null) return null; // fail open — an unencodable slate mints nothing
    values.push(enc);
  }
  const blindings = values.map(() => randomBlinding());
  const ledger = commitLedger(values, blindings);
  if (ledger === null || ledger.aggregateCommitment === null) return null;
  return {
    hex: ledger.aggregateCommitment,
    value: ledger.aggregateValue.toString(),
    blindingSum: ledger.aggregateBlinding.toString(),
  };
}

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

        // MINT-RUN DEFERRAL — freeze from the run that sees the FULLEST
        // pre-kickoff population. `runReach` = when the slate's own day's
        // mint run (NEXT_RUN_UTC_HOUR refresh-odds, which mints picks BEFORE
        // freezing) has reached it, plus jitter margin.
        //
        // offset 1 (tomorrow, F2): its own day's run can still freeze it
        // unless an early-UTC kickoff precedes that run's reach (the
        // primetime fix) — freezing early would only shrink the population.
        //
        // offset 0 (today, M-F2): a freeze pass running BEFORE the mint hour
        // (the 07:00 settle-picks shot) must not front-run the 10:00 mint —
        // freeze-once would seal today's slate with yesterday's population
        // and every pick minted at 10:00 would carry slateKey null forever,
        // outside the pre-registration. Defer to the mint run UNLESS a
        // kickoff precedes its reach (then seal now: pre-kickoff sealing
        // beats population completeness). The guard is `now` BEFORE the mint
        // hour — never `now < runReach` — because at the 10:00 run itself
        // that comparison is still true (10:00 < 12:00) and offset 0 would
        // defer forever; at/after the mint hour this run IS the mint run and
        // must always freeze.
        const runReach = new Date(
          start.getTime() + (NEXT_RUN_UTC_HOUR + NEXT_RUN_MARGIN_HOURS) * 3600_000,
        );
        if (offsetDays > 0) {
          if (earliestKickoff >= runReach) {
            results.push({ slateKey, action: "SKIP", reason: "deferred: own-day run can still freeze it" });
            continue;
          }
        } else if (now.getUTCHours() < NEXT_RUN_UTC_HOUR && earliestKickoff >= runReach) {
          results.push({
            slateKey,
            action: "SKIP",
            reason: "deferred: today's mint run will freeze the full population",
          });
          continue;
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
