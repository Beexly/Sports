/**
 * Batch loader: mint-time consensus book set for public claim surfaces.
 *
 * Reconstructs the exact priced book set at Pick.generatedAt from the
 * append-only odds table + ODDS_EVENTS source snapshot — same inputs the
 * /api/picks route uses. Fail-closed: missing snapshot, odds, or reconstruct
 * mismatch → null for that pick (caller withholds the claim).
 */
import { db } from "@sports/db";
import { reconstructConsensusBookSet } from "@/lib/claims/publish-time-consensus-evidence";
import type { ConsensusBookSetEvidence } from "@/lib/claims/public-consensus-claim";

export type PublishTimeConsensusPick = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: "SPREAD" | "MONEYLINE" | "TOTAL";
  readonly generatedAt: Date;
  readonly bookmakerCount: number;
  readonly ingestionRunId: string | null | undefined;
};

export type PublishTimeConsensusResolved = ConsensusBookSetEvidence & {
  readonly bookSetId: string;
};

type SourceSnap = {
  readonly provider: string;
  readonly sourceId: string;
  readonly capturedAt: Date;
};

/**
 * Resolve mint-time book-set evidence for each pick id.
 * Returns a Map keyed by pick.id; missing/failed entries are null.
 */
export async function loadPublishTimeConsensusByPickId(
  picks: readonly PublishTimeConsensusPick[],
): Promise<Map<string, PublishTimeConsensusResolved | null>> {
  const out = new Map<string, PublishTimeConsensusResolved | null>();
  if (picks.length === 0) return out;

  for (const pick of picks) out.set(pick.id, null);

  const runIds = [
    ...new Set(
      picks
        .map((p) => p.ingestionRunId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const sourceByRun = new Map<string, SourceSnap>();
  if (runIds.length > 0 && typeof db.ingestionRun?.findMany === "function") {
    const runs = await db.ingestionRun
      .findMany({
        where: { id: { in: runIds } },
        select: {
          id: true,
          sourceSnapshots: {
            where: { sourceKind: "ODDS_EVENTS" },
            orderBy: { fetchedAt: "desc" },
            take: 1,
            select: { id: true, provider: true, fetchedAt: true },
          },
        },
      })
      .catch(() => []);
    for (const run of runs) {
      const snap = run.sourceSnapshots[0];
      if (snap?.provider) {
        sourceByRun.set(run.id, {
          provider: snap.provider,
          sourceId: snap.id,
          capturedAt: snap.fetchedAt,
        });
      }
    }
  }

  const gameIds = [...new Set(picks.map((p) => p.gameId))];
  const latestAsOf = picks.reduce(
    (latest, pick) => (pick.generatedAt > latest ? pick.generatedAt : latest),
    new Date(0),
  );

  let oddsRows: Parameters<typeof reconstructConsensusBookSet>[1] = [];
  if (gameIds.length > 0 && typeof db.odds?.findMany === "function") {
    oddsRows = await db.odds
      .findMany({
        where: { gameId: { in: gameIds }, fetchedAt: { lte: latestAsOf } },
        select: {
          gameId: true,
          bookmaker: true,
          market: true,
          homePrice: true,
          awayPrice: true,
          homeSpreadPrice: true,
          awaySpreadPrice: true,
          spread: true,
          total: true,
          overPrice: true,
          underPrice: true,
          fetchedAt: true,
        },
      })
      .catch(() => []);
  }

  for (const pick of picks) {
    const source = pick.ingestionRunId
      ? sourceByRun.get(pick.ingestionRunId) ?? null
      : null;
    if (!source) {
      out.set(pick.id, null);
      continue;
    }
    const bookSet = reconstructConsensusBookSet(
      {
        id: pick.id,
        gameId: pick.gameId,
        pickType: pick.pickType,
        generatedAt: pick.generatedAt,
        bookmakerCount: pick.bookmakerCount,
      },
      oddsRows,
      source,
    );
    if (!bookSet) {
      out.set(pick.id, null);
      continue;
    }
    out.set(pick.id, {
      books: bookSet.books,
      sourceId: bookSet.sourceId,
      provider: source.provider,
      capturedAt: bookSet.capturedAt,
      bookSetId: bookSet.bookSetId,
    });
  }

  return out;
}

/** Build the binder slice fields from a resolved mint-time book set. */
export function consensusSliceFromResolved(
  resolved: PublishTimeConsensusResolved | null,
  base: {
    readonly consensusPct?: number | null;
    readonly bookmakerCount?: number | null;
    readonly dataFreshnessAt?: Date | string | null;
  },
) {
  if (!resolved) {
    // Fail-closed: no mint-time book set → withhold consensusPct too (T-1 / #901 IMPROVE).
    return {
      consensusPct: null as number | null,
      bookmakerCount: base.bookmakerCount,
      dataFreshnessAt: base.dataFreshnessAt,
      consensusProvider: null as string | null,
      consensusSourceId: null as string | null,
      consensusBooks: null as readonly string[] | null,
      consensusBookSetId: null as string | null,
      consensusCapturedAt: null as Date | string | null,
      consensusBookSet: null,
    };
  }
  return {
    consensusPct: base.consensusPct,
    bookmakerCount: base.bookmakerCount,
    dataFreshnessAt: base.dataFreshnessAt,
    consensusProvider: resolved.provider,
    consensusSourceId: resolved.sourceId,
    consensusBooks: resolved.books,
    consensusBookSetId: resolved.bookSetId,
    consensusCapturedAt: resolved.capturedAt,
    consensusBookSet: {
      books: resolved.books,
      sourceId: resolved.sourceId,
      provider: resolved.provider,
      capturedAt: resolved.capturedAt,
    },
  };
}
