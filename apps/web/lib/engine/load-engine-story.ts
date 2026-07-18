import { db } from "@sports/db";

/**
 * The Sealed Engine loader — today's decision story as TELEMETRY AND
 * COMMITMENTS, never method.
 *
 * Standing founder constraint: outcomes and proofs are public; the recipe is
 * not. This loader is structurally method-opaque — it does not SELECT
 * factorBreakdown, reasoning, confidence, edge values, gate reasons, or any
 * threshold. What it returns is countable fact: how much the engine swept,
 * how often it declined, what it sealed, and where the proofs live. A
 * competitor can read every byte of this payload and learn nothing about how
 * the numbers are made.
 *
 * States doctrine: outage is not a verdict (unreachable flag), absence is not
 * an outage (quiet day renders as deliberate restraint, not brokenness).
 * Every count is real or the section goes dark — no fabrication, ever.
 */

export interface EngineStory {
  /** ISO — when this story was assembled (freshness stamp). */
  readonly generatedAt: string;
  /** True when the database could not be reached — outage, not verdict. */
  readonly unreachable: boolean;
  /** Today's sweep telemetry (UTC day). */
  readonly sweep: {
    readonly sportsSwept: number;
    readonly gamesUpserted: number;
    readonly oddsRowsRead: number;
    /** ISO of the most recent successful run with real odds, if any. */
    readonly lastSuccessAt: string | null;
  };
  /** Today's gate ledger — the countable shape of restraint. */
  readonly gate: {
    readonly evaluated: number;
    readonly published: number;
    readonly declined: number;
  };
  /** Today's sealed receipts. */
  readonly seals: {
    readonly receiptsFrozenToday: number;
    /** Latest frozen receipt (hash + timestamp only — payload stays sealed). */
    readonly latest: { readonly contentHash: string; readonly frozenAt: string } | null;
    /** Slate commitments whose key is today's UTC day. */
    readonly slates: readonly {
      readonly slateKey: string;
      readonly root: string;
      readonly count: number;
      readonly committedAt: string;
    }[];
  };
  /** The settled record, all-time — the door into /proof and /performance. */
  readonly record: {
    readonly totalSettled: number;
  };
}

const EMPTY_STORY: Omit<EngineStory, "generatedAt" | "unreachable"> = {
  sweep: { sportsSwept: 0, gamesUpserted: 0, oddsRowsRead: 0, lastSuccessAt: null },
  gate: { evaluated: 0, published: 0, declined: 0 },
  seals: { receiptsFrozenToday: 0, latest: null, slates: [] },
  record: { totalSettled: 0 },
};

/**
 * A receipt only counts as a public seal when its pick is part of the
 * official record: published, live-engine (never bootstrap), never seed
 * data. The freezer mints receipts during warm-up too, and presenting those
 * as today's commitments would let the warm-up era inflate the sealed count
 * that the adjacent gate/record numbers deliberately exclude.
 */
const OFFICIAL_PICK_FILTER = {
  isPublished: true,
  isBootstrap: false,
  NOT: { modelVersion: "v5.0.0-seed" },
} as const;

/** [start, end) of the UTC calendar day containing `now`. */
function utcDayBounds(now: Date): { start: Date; end: Date; key: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, key: start.toISOString().slice(0, 10) };
}

export async function loadEngineStory(now = new Date()): Promise<EngineStory> {
  const generatedAt = now.toISOString();
  const { start, end, key } = utcDayBounds(now);

  try {
    const [runs, lastSuccess, gateRows, receiptsToday, latestReceipt, slates, totalSettled] =
      await Promise.all([
        db.ingestionRun.findMany({
          where: { startedAt: { gte: start, lt: end } },
          select: { sport: true, status: true, gamesUpserted: true, oddsInserted: true },
        }),
        db.ingestionRun.findFirst({
          where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
          orderBy: { completedAt: "desc" },
          select: { completedAt: true },
        }),
        // Counts only. reason/reasonCode/edgeIndex are deliberately NOT
        // selected: the fact of a decline is public; the logic behind it is not.
        db.gateDecision.groupBy({
          by: ["status"],
          where: { evaluatedAt: { gte: start, lt: end }, isBootstrap: false },
          _count: { _all: true },
        }),
        db.pickProofReceipt.count({
          where: { frozenAt: { gte: start, lt: end }, pick: OFFICIAL_PICK_FILTER },
        }),
        db.pickProofReceipt.findFirst({
          where: { pick: OFFICIAL_PICK_FILTER },
          orderBy: { frozenAt: "desc" },
          select: { contentHash: true, frozenAt: true },
        }),
        db.slateCommitment.findMany({
          where: { slateKey: { endsWith: key } },
          select: { slateKey: true, root: true, count: true, committedAt: true },
          orderBy: { slateKey: "asc" },
        }),
        db.pick.count({
          where: {
            // GRADED results only — VOID is no action (cancelled game), not a
            // settled record entry. The M-F9 sweep (PR #86) made VOID reachable
            // in volume; counting voids here would inflate the public
            // "settled" number with bets that never happened.
            result: { in: ["WIN", "LOSS", "PUSH"] },
            ...OFFICIAL_PICK_FILTER,
          },
        }),
      ]);

    const byStatus = new Map(gateRows.map((g) => [g.status, g._count._all]));
    const published = byStatus.get("PUBLISHED") ?? 0;
    const declined = byStatus.get("GATED") ?? 0;

    return {
      generatedAt,
      unreachable: false,
      sweep: {
        sportsSwept: new Set(runs.map((r) => r.sport).filter(Boolean)).size,
        gamesUpserted: runs.reduce((s, r) => s + r.gamesUpserted, 0),
        oddsRowsRead: runs.reduce((s, r) => s + r.oddsInserted, 0),
        lastSuccessAt: lastSuccess?.completedAt?.toISOString() ?? null,
      },
      gate: { evaluated: published + declined, published, declined },
      seals: {
        receiptsFrozenToday: receiptsToday,
        latest: latestReceipt
          ? {
              contentHash: latestReceipt.contentHash,
              frozenAt: latestReceipt.frozenAt.toISOString(),
            }
          : null,
        slates: slates.map((s) => ({
          slateKey: s.slateKey,
          root: s.root,
          count: s.count,
          committedAt: s.committedAt.toISOString(),
        })),
      },
      record: { totalSettled },
    };
  } catch {
    return { generatedAt, unreachable: true, ...EMPTY_STORY };
  }
}
