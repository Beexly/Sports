/**
 * WP-28 batch loader: for every settled two-way MONEYLINE pick in the sample,
 * resolve its publish-time market probability from the append-only odds table
 * and build the synchronous resolver hook that live-calibration-p.ts accepts.
 *
 * C-301 (2026-09-09): a pick that carries a proof receipt or a factor-breakdown
 * market fair IS a candidate. Since C-298 the builder reads the odds table
 * FIRST and the receipt only as a fallback, and since C-300 the eligibility
 * cron scores nothing but odds-table prices; a candidate filter that skipped
 * receipted picks left every one of them unscored (57 rows on the 14:40 UTC
 * run, 44 of them the deployed version's own multi-book rows), which is the
 * opposite of what those two rows intended. The odds table decides, for every
 * pick, whether it can price the pick at generatedAt.
 *
 * OOM FIX (2026-09-19): the original implementation issued ONE findMany over
 * `gameId IN (all candidate games), market H2H, fetchedAt <= maxGeneratedAt`
 * with no lower bound and no take. The odds table appends a full snapshot every
 * refresh cycle, so that WHERE clause returned every H2H row ever fetched for
 * every candidate game. Measured against production on 2026-09-19: 1,641,812
 * rows for the then-current candidate set, which the Vercel function cannot
 * hold; the function was killed for memory on every call. That killed the
 * calibration-metrics cron, the autonomy cycle, and every truth-surface read
 * that had to seed the durable artifact — the external watchdog had not seen a
 * green run since 2026-09-13 16:53 UTC.
 *
 * The replacement issues the two queries the resolver's semantics actually
 * need. resolvePublishTimeMarketP consumes, per pick, at most the LATEST
 * eligible row per bookmaker at or before the pick's generatedAt
 * (latestH2hRowPerBookmaker). So:
 *
 *   Phase A (per chunk of distinct pick windows): groupBy(gameId, bookmaker)
 *   over rows inside the pick's window [generatedAt - STALE_WINDOW_HOURS,
 *   generatedAt], pre-filtered to exactly the eligibility the resolver applies
 *   in memory (market H2H, a real bookmaker key, both prices finite non-null
 *   non-zero), taking _max(fetchedAt). This is the latest usable quote per
 *   book within the window.
 *
 *   Phase B (same chunk): findMany of exactly those winning rows, keyed by
 *   (gameId, bookmaker, fetchedAt), with a hard take as a circuit breaker.
 *
 * The pre-filter mirrors isRealBookmakerKey/isQuotedPrice so the row Phase A
 * selects is the same row the in-memory scan would have selected; the resolver
 * still re-checks eligibility on everything Phase B returns, so the two-phase
 * shape cannot smuggle in a row the resolver would reject.
 *
 * The STALE_WINDOW_HOURS floor is the one behavior change, and it is a honesty
 * tightening, not a relaxation: a pick whose freshest pre-generation quote is
 * older than the window no longer resolves from that stale price (measured
 * 2026-09-19: p50 gap 0.00h, p90 0.09h, p99 288.8h — the affected tail is the
 * ~1% of picks that would have been "priced" from quotes days to months old).
 * Those picks fall through to the receipt/factor-breakdown fallback or are
 * excluded, and the floor is carried on the stats so the artifact shows it.
 *
 * Zero writes. Read-only against the append-only odds table. Fails soft: if
 * the odds table cannot be read, the resolver returns null for every pick and
 * `stats.note` says why, so the sample simply keeps counting those picks as
 * excluded. Nothing is invented.
 *
 * Candidates are decided on pre-outcome, structural attributes only: settled
 * WIN/LOSS, MONEYLINE, not a three-way moneyline sport (the engine's own
 * refusal rule). Whether a receipt exists is not read. A soccer moneyline is
 * never a candidate, so it is never resolved from the odds table.
 */

import {
  NULL_MARKET_PROBABILITY_RESOLVER,
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
import { NON_BOOK_BOOKMAKER_KEYS } from "@sports/prediction-engine";

/**
 * How far back before a pick's generatedAt the loader will look for quotes.
 * The odds table snapshots every refresh cycle; a quote older than this is not
 * a publish-time market price by any honest reading (measured 2026-09-19: 99%
 * of resolvable picks sit within minutes-to-hours of their quotes). The value
 * is carried on the stats so the metrics artifact states its own window.
 */
export const MARKET_P_STALE_WINDOW_HOURS = 48;

/** Distinct pick windows per odds-table query pair. Bounds the WHERE clause and every reply. */
const WINDOWS_PER_QUERY = 25;

/** Circuit breaker on Phase B: a reply larger than this is truncated and reported, never held. */
const MAX_ROWS_PER_FETCH = 10_000;

/** One distinct (gameId, generatedAt) resolution window. */
type PickWindow = { readonly gameId: string; readonly at: Date };

/** Phase A reply shape: the latest eligible quote time per (game, book) in a window. */
type LatestQuoteRow = {
  readonly gameId: string;
  readonly bookmaker: string;
  readonly _max: { readonly fetchedAt: Date | null };
};

/** The slice of the Prisma client this loader reads (structural, mockable). */
export type OddsTableDb = {
  readonly odds: {
    groupBy: (args: {
      by: ["gameId", "bookmaker"];
      where: {
        OR: Array<{
          gameId: string;
          market: "H2H";
          bookmaker: { notIn: readonly string[] };
          homePrice: { not: number };
          awayPrice: { not: number };
          fetchedAt: { gte: Date; lte: Date };
        }>;
      };
      _max: { fetchedAt: true };
    }) => Promise<readonly LatestQuoteRow[]>;
    findMany: (args: {
      where: {
        OR: Array<{
          gameId: string;
          bookmaker: string;
          market: "H2H";
          fetchedAt: { gte: Date; lte: Date };
        }>;
      };
      select: {
        gameId: true;
        bookmaker: true;
        homePrice: true;
        awayPrice: true;
        fetchedAt: true;
      };
      take: number;
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
  /** Settled two-way MONEYLINE picks sent to the odds table (receipted or not, C-301). */
  readonly candidates: number;
  readonly gamesQueried: number;
  /**
   * Number of odds-table queries issued: 0 when there were no candidates, else
   * two per window chunk (Phase A groupBy + Phase B exact-row fetch).
   */
  readonly queries: number;
  readonly oddsRows: number;
  /** Every resolved candidate, whichever book count. */
  readonly resolved: number;
  /** C-110: the part of `resolved` that came from exactly one real book (market_p_single_book). */
  readonly resolvedSingleBook: number;
  readonly unresolved: OddsTableUnresolvedCounts;
  /** Set only when the odds table could not be read; the sample then excludes every candidate. */
  readonly note: string | null;
  /** OOM fix (2026-09-19): the stale-window floor in hours, present on new artifacts. */
  readonly staleWindowHours?: number;
  /** OOM fix: rows Phase B actually returned — the reduced, resolver-relevant set. */
  readonly rowsAfterReduction?: number;
  /** OOM fix: true only if the Phase B circuit breaker truncated a reply. */
  readonly rowsCapped?: boolean;
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
 * not settled WIN/LOSS, not MONEYLINE, a three-way moneyline sport, or missing
 * an identity field (id, gameId, generatedAt, selection, team names). A receipt
 * or factor-breakdown probability does not disqualify a pick (C-301): the odds
 * table is read first for every pick.
 */
export function oddsTableCandidate(pick: PickForLiveCal): PickForMarketP | null {
  if (pick.result !== "WIN" && pick.result !== "LOSS") return null;
  if (!isMoneylinePickType(pick.pickType)) return null;
  if (threeWayMoneylineExclusion({ pickType: pick.pickType, sportKey: pick.sportKey })) return null;
  const { id, gameId, generatedAt, selection, homeTeamName, awayTeamName } = pick;
  if (!id || !gameId || !selection || !homeTeamName || !awayTeamName) return null;
  if (!(generatedAt instanceof Date) || !Number.isFinite(generatedAt.getTime())) return null;
  return { id, gameId, generatedAt, selection, homeTeamName, awayTeamName };
}

function distinctWindows(candidates: readonly PickForMarketP[]): PickWindow[] {
  const seen = new Map<string, PickWindow>();
  for (const c of candidates) {
    const key = `${c.gameId}\u0000${c.generatedAt.getTime()}`;
    if (!seen.has(key)) seen.set(key, { gameId: c.gameId, at: c.generatedAt });
  }
  return [...seen.values()].sort((a, b) =>
    a.gameId === b.gameId
      ? a.at.getTime() - b.at.getTime()
      : a.gameId.localeCompare(b.gameId),
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Phase A WHERE arm for one window: the eligibility the in-memory resolver
 * applies, expressed in SQL so the "latest quote per book" is the same row the
 * resolver would have picked from an unbounded fetch. Prices: finite non-null
 * non-zero in JS; `not: 0` excludes NULL and 0 in SQL. Bookmaker: not a
 * non-book key. Window: at or before the pick's generatedAt, no older than the
 * stale window.
 */
function windowArm(w: PickWindow, windowMs: number) {
  const at = w.at.getTime();
  return {
    gameId: w.gameId,
    market: "H2H" as const,
    bookmaker: { notIn: [...NON_BOOK_BOOKMAKER_KEYS] },
    homePrice: { not: 0 },
    awayPrice: { not: 0 },
    fetchedAt: { gte: new Date(at - windowMs), lte: new Date(at) },
  };
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

  const windows = distinctWindows(candidates);
  const gameIds = [...new Set(candidates.map((c) => c.gameId))].sort();
  const windowMs = MARKET_P_STALE_WINDOW_HOURS * 3_600_000;

  let rows: OddsRowForMarketP[] = [];
  let queries = 0;
  let rowsCapped = false;
  try {
    for (const group of chunk(windows, WINDOWS_PER_QUERY)) {
      // Phase A: latest eligible quote per (game, book) within each window.
      queries += 1;
      const latest = await db.odds.groupBy({
        by: ["gameId", "bookmaker"],
        where: { OR: group.map((w) => windowArm(w, windowMs)) },
        _max: { fetchedAt: true },
      });
      const winners = latest.filter(
        (r): r is LatestQuoteRow & { _max: { fetchedAt: Date } } => r._max.fetchedAt != null,
      );
      if (winners.length === 0) continue;

      // Phase B: fetch exactly the winning rows, deduped across overlapping windows.
      const armKeys = new Set<string>();
      const arms: Array<{
        gameId: string;
        bookmaker: string;
        market: "H2H";
        fetchedAt: { gte: Date; lte: Date };
      }> = [];
      for (const w of winners) {
        const key = `${w.gameId}\u0000${w.bookmaker}\u0000${w._max.fetchedAt.getTime()}`;
        if (armKeys.has(key)) continue;
        armKeys.add(key);
        arms.push({
          gameId: w.gameId,
          bookmaker: w.bookmaker,
          market: "H2H",
          fetchedAt: { gte: w._max.fetchedAt, lte: w._max.fetchedAt },
        });
      }
      queries += 1;
      const fetched = await db.odds.findMany({
        where: { OR: arms },
        select: {
          gameId: true,
          bookmaker: true,
          homePrice: true,
          awayPrice: true,
          fetchedAt: true,
        },
        take: MAX_ROWS_PER_FETCH,
      });
      if (fetched.length >= MAX_ROWS_PER_FETCH) rowsCapped = true;
      rows = rows.concat(fetched as OddsRowForMarketP[]);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      resolveMarketP: NULL_MARKET_PROBABILITY_RESOLVER,
      stats: {
        candidates: candidates.length,
        gamesQueried: gameIds.length,
        queries,
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
      queries,
      oddsRows: rows.length,
      resolved: byPickId.size,
      resolvedSingleBook,
      unresolved,
      note: null,
      staleWindowHours: MARKET_P_STALE_WINDOW_HOURS,
      rowsAfterReduction: rows.length,
      rowsCapped,
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
  const reduction =
    stats.staleWindowHours != null
      ? ` Bounded recompute: ${stats.staleWindowHours}h window, ${stats.rowsAfterReduction ?? stats.oddsRows} rows after reduction${stats.rowsCapped ? ", REPLY TRUNCATED (rowsCapped)" : ""};`
      : "";
  return (
    `Odds-table recompute (WP-28, single book since C-110): candidates ${stats.candidates}, games ${stats.gamesQueried}, ` +
    `queries ${stats.queries}, rows ${stats.oddsRows}, resolved ${stats.resolved} (single book ${stats.resolvedSingleBook});` +
    `${reduction}` +
    ` unresolved no_rows ${u.no_rows}, no_usable_book ${u.no_usable_book}, insufficient_books ${u.insufficient_books}, no_side ${u.no_side}.${tail}`
  );
}
