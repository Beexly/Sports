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
 * Invariants (all enforced by the pure planner, planSlateCommitment):
 *   - one commitment per slateKey, ever (immutable once frozen)
 *   - only committed while the WHOLE slate is still pre-result
 *     (now < earliest kickoff) — otherwise it would be a fake pre-registration
 *   - an empty slate is never committed (commits to nothing)
 *
 * Operational rules (mirroring the receipt-minting pattern in
 * process-sport.ts):
 *   - EVERY sport iteration is wrapped in try/catch — a freeze failure is
 *     logged and must NEVER fail the ingestion cycle
 *   - persistence uses `create` (NOT upsert): the slateKey @unique constraint
 *     is the backstop against a concurrent double-commit; a unique violation
 *     is caught and logged as a warning (the other writer won — same root)
 *   - after a successful commit, the covered receipts are backfilled with the
 *     slateKey so each receipt points at the commitment that pre-registered it
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

/** [start, end) of the UTC calendar day containing `now`. */
function utcDayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
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
 * Attempt to freeze one slate commitment per sport for today's (UTC) games.
 *
 * @param sportKeys keys of the sports processed this cycle (e.g. "americanfootball_nfl")
 * @param now       wall-clock time of the freeze attempt (also the committedAt on COMMIT)
 * @param hash      production HashFn — pass node:crypto SHA-256 hex (a weak hash voids the guarantee)
 * @param logPrefix log tag, e.g. "[cron:refresh-odds]"
 *
 * Never throws — every per-sport failure is caught, logged, and reported as a
 * SKIP so the ingestion cycle's success can never hinge on the freeze pass.
 */
export async function freezeSlateCommitments(
  sportKeys: readonly string[],
  now: Date,
  hash: HashFn,
  logPrefix = "[slate-commitment]",
): Promise<SlateFreezeResult[]> {
  const results: SlateFreezeResult[] = [];
  const { start, end } = utcDayBounds(now);
  const nowIso = now.toISOString();

  for (const sportKey of sportKeys) {
    // One commitment per sport + UTC day (e.g. "AMERICANFOOTBALL_NFL:2026-07-02").
    // Derived from `now`, which shares the UTC day with every game selected below.
    const slateKey = dailySlateKey(sportKey, nowIso);

    try {
      const games = await db.game.findMany({
        where: {
          sport: { key: sportKey },
          commenceTime: { gte: start, lt: end },
        },
        select: { id: true, commenceTime: true },
      });

      if (games.length === 0) {
        results.push({ slateKey, action: "SKIP", reason: "no games on today's slate" });
        continue;
      }

      const earliestKickoff = games.reduce(
        (min, g) => (g.commenceTime < min ? g.commenceTime : min),
        games[0]!.commenceTime,
      );

      // Freeze-once: a commitment is immutable, so an existing row means SKIP.
      const existing = await db.slateCommitment.findUnique({
        where: { slateKey },
        select: { id: true },
      });

      // The slate's leaves — exactly the { pickId, payload } shape the Merkle
      // commitment hashes (SlateLeaf). Ordered deterministically: inclusion
      // proofs reference an index, so the leaf order must be reproducible.
      const receipts = await db.pickProofReceipt.findMany({
        where: { pick: { gameId: { in: games.map((g) => g.id) } } },
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

      // create, NOT upsert — the slateKey @unique constraint is the backstop
      // against a concurrent double-commit. If another writer won the race we
      // log and stand down; the frozen root is theirs (and identical inputs
      // produce an identical root anyway).
      try {
        await db.slateCommitment.create({
          data: {
            slateKey: plan.commitment.slateId,
            root: plan.commitment.root,
            count: plan.commitment.count,
            committedAt: new Date(plan.commitment.committedAt),
          },
        });
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

      // Backfill the slateKey onto exactly the receipts the commitment covers,
      // so every receipt points at the commitment that pre-registered it.
      await db.pickProofReceipt.updateMany({
        where: { pickId: { in: receipts.map((r) => r.pickId) } },
        data: { slateKey },
      });

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

  return results;
}
