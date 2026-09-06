/**
 * WP-28 batch loader: for the settled MONEYLINE picks the market-anchored
 * sample would otherwise exclude as `no_market_probability` (no receipt, no
 * factor-breakdown market fair), fetch their games' H2H odds rows in ONE query
 * and build the synchronous resolver hook that live-calibration-p.ts accepts.
 *
 * Zero writes. Read-only against the append-only odds table. The query is
 * bounded by the candidates' gameIds and by the latest generatedAt among them;
 * the per-pick "at or before its own generatedAt" cut is applied by the pure
 * resolver (publish-time-market-p.ts). Fails soft: if the odds table cannot be
 * read, the resolver returns null for every pick and `stats.note` says why, so
 * the sample simply keeps counting those picks as excluded. Nothing is invented.
 *
 * Candidates are decided on pre-outcome, structural attributes only: settled
 * WIN/LOSS, MONEYLINE, not a three-way moneyline sport (the engine's own
 * refusal rule), and no market probability already present. A soccer moneyline
 * is never a candidate, so it is never resolved from the odds table.
 */

import {
  NULL_MARKET_PROBABILITY_RESOLVER,
  resolveMarketAnchoredCalibrationP,
  type MarketAnchoredResolverSource,
  type MarketProbabilityResolver,
  type PickForLiveCal,
  type ResolvedMarketP,
} from "@/lib/calibration/live-calibration-p";
import {
  isMoneylinePickType,
  threeWayMoneylineExclusion,
} from "@/lib/calibration/proven-path-rows";
import {
  resolvePublishTimeMarketP,
  type OddsRowForMarketP,
  type PickForMarketP,
  type PublishTimeMarketPSource,
  type PublishTimeMarketPUnresolvedReason,
} from "@/lib/calibration/publish-time-market-p";

/** The slice of the Prisma client this loader reads (structural, mockable). */
export type OddsTableDb = {
  readonly odds: {
    findMany: (args: {
      where: {
        gameId: { in: string[] };
        market: "H2H";
        fetchedAt: { lte: Date };
      };
      select: {
        gameId: true;
        bookmaker: true;
        homePrice: true;
        awayPrice: true;
        fetchedAt: true;
      };
    }) => Promise<readonly OddsRowForMarketP[]>;
  };
};

/**
 * Unresolved candidates by reason. `insufficient_books` is retired by C-110 (a
 * lone real book now resolves as market_p_single_book) and is always 0; the key
 * stays so readers of persisted artifacts see a number, never `undefined`.
 */
export type OddsTableUnresolvedCounts = Readonly<
  Record<PublishTimeMarketPUnresolvedReason, number> & { readonly insufficient_books: number }
>;

/** Coverage report for the odds-table recompute; carried on the metrics artifact. */
export type OddsTableMarketPStats = {
  /** Settled MONEYLINE picks with no receipt and no factor-breakdown market fair (two-way sports only). */
  readonly candidates: number;
  readonly gamesQueried: number;
  /** Number of odds-table queries issued: 0 when there were no candidates, else 1. */
  readonly queries: number;
  readonly oddsRows: number;
  /** Every resolved candidate, whichever book count. */
  readonly resolved: number;
  /** C-110: the part of `resolved` that came from exactly one real book (market_p_single_book). */
  readonly resolvedSingleBook: number;
  readonly unresolved: OddsTableUnresolvedCounts;
  /** Set only when the odds table could not be read; the sample then excludes every candidate. */
  readonly note: string | null;
};

export type PublishTimeMarketPResolverLoad = {
  readonly resolveMarketP: MarketProbabilityResolver;
  readonly stats: OddsTableMarketPStats;
};

function emptyUnresolved(): Record<PublishTimeMarketPUnresolvedReason, number> & { insufficient_books: number } {
  return { no_rows: 0, no_usable_book: 0, insufficient_books: 0, no_side: 0 };
}

/** Stats for "the loader did not run" (no candidates, or the pick load itself failed). */
export function emptyOddsTableMarketPStats(): OddsTableMarketPStats {
  return {
    candidates: 0,
    gamesQueried: 0,
    queries: 0,
    oddsRows: 0,
    resolved: 0,
    resolvedSingleBook: 0,
    unresolved: emptyUnresolved(),
    note: null,
  };
}

/** The pure resolver's provenance tag as the sample builder's bySource key. */
export function resolverSourceForPSource(pSource: PublishTimeMarketPSource): MarketAnchoredResolverSource {
  return pSource === "market_p_single_book" ? "resolver_single_book" : "resolver";
}

/**
 * The pick as the pure resolver needs it, or null when it is not a candidate:
 * not settled WIN/LOSS, not MONEYLINE, a three-way moneyline sport, already
 * market-anchored, or missing an identity field (id, gameId, generatedAt,
 * selection, team names).
 */
export function oddsTableCandidate(pick: PickForLiveCal): PickForMarketP | null {
  if (pick.result !== "WIN" && pick.result !== "LOSS") return null;
  if (!isMoneylinePickType(pick.pickType)) return null;
  if (threeWayMoneylineExclusion({ pickType: pick.pickType, sportKey: pick.sportKey })) return null;
  if (resolveMarketAnchoredCalibrationP(pick, NULL_MARKET_PROBABILITY_RESOLVER) != null) return null;
  const { id, gameId, generatedAt, selection, homeTeamName, awayTeamName } = pick;
  if (!id || !gameId || !selection || !homeTeamName || !awayTeamName) return null;
  if (!(generatedAt instanceof Date) || !Number.isFinite(generatedAt.getTime())) return null;
  return { id, gameId, generatedAt, selection, homeTeamName, awayTeamName };
}

export async function loadPublishTimeMarketPResolver(
  db: OddsTableDb,
  picks: readonly PickForLiveCal[],
): Promise<PublishTimeMarketPResolverLoad> {
  const candidates = picks
    .map(oddsTableCandidate)
    .filter((c): c is PickForMarketP => c != null);
  const unresolved = emptyUnresolved();

  if (candidates.length === 0) {
    return { resolveMarketP: NULL_MARKET_PROBABILITY_RESOLVER, stats: emptyOddsTableMarketPStats() };
  }

  const gameIds = [...new Set(candidates.map((c) => c.gameId))].sort();
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const c of candidates) latestMs = Math.max(latestMs, c.generatedAt.getTime());
  const latestGeneratedAt = new Date(latestMs);

  let rows: readonly OddsRowForMarketP[];
  try {
    rows = await db.odds.findMany({
      where: {
        gameId: { in: gameIds },
        market: "H2H",
        fetchedAt: { lte: latestGeneratedAt },
      },
      select: {
        gameId: true,
        bookmaker: true,
        homePrice: true,
        awayPrice: true,
        fetchedAt: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      resolveMarketP: NULL_MARKET_PROBABILITY_RESOLVER,
      stats: {
        candidates: candidates.length,
        gamesQueried: gameIds.length,
        queries: 1,
        oddsRows: 0,
        resolved: 0,
        resolvedSingleBook: 0,
        unresolved,
        note: `odds table unavailable: ${msg}`,
      },
    };
  }

  const rowsByGame = new Map<string, OddsRowForMarketP[]>();
  for (const row of rows) {
    const bucket = rowsByGame.get(row.gameId);
    if (bucket) bucket.push(row);
    else rowsByGame.set(row.gameId, [row]);
  }

  const byPickId = new Map<string, ResolvedMarketP>();
  let resolvedSingleBook = 0;
  for (const c of candidates) {
    const res = resolvePublishTimeMarketP(c, rowsByGame.get(c.gameId) ?? []);
    if (res.status === "resolved") {
      byPickId.set(c.id, { p: res.p, source: resolverSourceForPSource(res.pSource) });
      if (res.pSource === "market_p_single_book") resolvedSingleBook += 1;
    } else {
      unresolved[res.reason] += 1;
    }
  }

  const resolveMarketP: MarketProbabilityResolver = (pick) =>
    pick.id ? (byPickId.get(pick.id) ?? null) : null;

  return {
    resolveMarketP,
    stats: {
      candidates: candidates.length,
      gamesQueried: gameIds.length,
      queries: 1,
      oddsRows: rows.length,
      resolved: byPickId.size,
      resolvedSingleBook,
      unresolved,
      note: null,
    },
  };
}

/**
 * Where each scored probability came from. proof_receipt is the publish-time
 * value and the primary source (every receipted pick lands here);
 * factor_breakdown counts only rows with no receipt (last-refresh value, rows
 * that predate receipts); market_p_from_odds_table is the WP-28 recompute on
 * at least MIN_BOOKMAKERS real books; market_p_single_book is the C-110
 * recompute on exactly one real book (same de-vig, reported apart).
 */
export type MarketPSources = {
  readonly factor_breakdown: number;
  readonly proof_receipt: number;
  readonly market_p_from_odds_table: number;
  readonly market_p_single_book: number;
};

/**
 * Map the sample builder's bySource to the coverage report. In every
 * production wiring the only injected resolver is this loader, so the
 * builder's "resolver" source is market_p_from_odds_table and its
 * "resolver_single_book" source is market_p_single_book.
 */
export function marketPSourcesFromBySource(
  bySource: Readonly<Record<string, number>>,
): MarketPSources {
  return {
    factor_breakdown: bySource["factor_breakdown"] ?? 0,
    proof_receipt: bySource["proof_receipt"] ?? 0,
    market_p_from_odds_table: bySource["resolver"] ?? 0,
    market_p_single_book: bySource["resolver_single_book"] ?? 0,
  };
}

export function oddsTableStatsNote(stats: OddsTableMarketPStats): string {
  const u = stats.unresolved;
  const tail = stats.note ? ` ${stats.note}.` : "";
  return (
    `Odds-table recompute (WP-28, single book since C-110): candidates ${stats.candidates}, games ${stats.gamesQueried}, ` +
    `queries ${stats.queries}, rows ${stats.oddsRows}, resolved ${stats.resolved} (single book ${stats.resolvedSingleBook}); ` +
    `unresolved no_rows ${u.no_rows}, no_usable_book ${u.no_usable_book}, insufficient_books ${u.insufficient_books}, no_side ${u.no_side}.${tail}`
  );
}
