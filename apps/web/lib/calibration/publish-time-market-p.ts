/**
 * WP-28: publish-time market probability recomputed from the append-only odds
 * table, for a settled MONEYLINE pick that carries no proof receipt and no
 * factor-breakdown market fair. Pure, deterministic, zero writes.
 *
 * What it reproduces. The receipt's marketFairProb is minted by the engine as
 * the arithmetic mean of each book's implied probability per side across the
 * H2H books in the snapshot, then a proportional (multiplicative) two-way
 * de-vig (scoring.ts scoreMoneylinePick: americanToImpliedProbability per
 * book, mean per side, removeVig). This module uses the SAME two primitives
 * from @sports/prediction-engine so a probability that comes from here is the
 * same number the receipt would have carried, never a second method scored on
 * the same curve. consensusNoVig (Shin per book, median across books) is not
 * used here: no receipt carries it (market-read.ts is not imported by
 * scoring.ts; the receipt is minted from ScoredPick.marketFairProb in
 * ingestion-pipeline process-sport.ts).
 *
 * Snapshot rule. For each real bookmaker, the latest H2H row for the pick's
 * game with fetchedAt at or before the pick's generatedAt. Odds rows share one
 * run-level fetchedAt (data-ingestion normalizer.ts), so this is normally the
 * run that produced the pick; a book absent from that run contributes its own
 * latest earlier row, and the result reports the oldest row used so a reader
 * can see the spread. Rows after generatedAt are never read: the probability
 * is fixed at publish time, not recomputed toward the close.
 *
 * Book count. Distinct bookmaker keys, each quoting BOTH sides. Distinct means
 * distinct keys, exactly as the engine counts bookmakerCount (h2hOdds.length).
 * At least MIN_BOOKMAKERS (the engine's own constant, never a literal) tags
 * the result `market_p_from_odds_table`, the same book floor publishing needs.
 * C-110 (WP-28b, decision delegated 2026-09-06): a game whose only stored
 * book at or before generatedAt is ONE real bookmaker is resolved too, with
 * the same de-vig on that one book's latest snapshot, and tagged with the
 * DISTINCT source `market_p_single_book` so the sample reports the two
 * populations separately. This is measurement only: MIN_BOOKMAKERS is not
 * read differently anywhere and publishing still needs two books.
 * Known limit, documented rather than hidden: `espn_public` is ESPN's routed
 * DraftKings line (espn-odds-client.ts header), and the odds row does not say
 * which provider ESPN routed, so `espn_public` and `draftkings` in one snapshot
 * count as two keys here as they did in the engine.
 *
 * Non-book keys. Every odds row is written by process-sport.ts from an
 * OddsApiEvent bookmaker key: The Odds API book keys (fanduel, draftkings,
 * betmgm, ...), `espn_public` (one real book), and TheRundown affiliates mapped
 * to book names (bovada, pinnacle, ...; RUNDOWN_AFFILIATE_BOOK_KEYS). The
 * signal slate writes no odds rows. The one key with no book identity is
 * `rundown_default`: TheRundown's affiliate-less lines array form
 * (rundown-client.ts lineBlobToBookmaker with key "default"), where several
 * unrelated lines share one key. It cannot be counted as a distinct book, so
 * it is excluded. Unknown Rundown affiliates keep `rundown_<id>` and are real,
 * distinct books whose name we never invented.
 *
 * Side. The pick's side is the canonical, boundary-aware selectionIsHomeSide
 * from the engine (the same resolver settlement and CLV use), evaluated for
 * both teams so a selection that names neither team, or both equally, returns
 * null instead of a guessed side.
 *
 * Precision. Rounded to 6 decimals, the receipt's own precision
 * (pick-proof-receipt.ts).
 */

import {
  MIN_BOOKMAKERS,
  americanToImpliedProbability,
  removeVig,
  selectionIsHomeSide,
} from "@sports/prediction-engine";

/** One append-only odds row (packages/db Odds model; only the H2H columns are read). */
export type OddsRowForMarketP = {
  readonly gameId: string;
  readonly bookmaker: string;
  /** OddsMarket; rows that are not "H2H" are ignored. Optional so a loader that already filtered may omit it. */
  readonly market?: string | null;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly fetchedAt: Date;
};

export type PickForMarketP = {
  readonly id: string;
  readonly gameId: string;
  readonly generatedAt: Date;
  /** Scoring emits MONEYLINE selections as "<team> ML (<price>)". */
  readonly selection: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
};

export const PUBLISH_TIME_MARKET_P_METHOD = "mean_implied_proportional_devig" as const;

/**
 * Bookmaker keys with no book identity. Evidence in the module header; grows
 * only with evidence of a new non-book writer, never to change a count.
 */
export const NON_BOOK_BOOKMAKER_KEYS: ReadonlySet<string> = new Set(["rundown_default"]);

export function isRealBookmakerKey(key: string | null | undefined): key is string {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;
  return !NON_BOOK_BOOKMAKER_KEYS.has(trimmed);
}

export type PickedSide = "home" | "away";

/**
 * Which side the selection is on, or null when it names neither team or both
 * equally. Uses the engine's boundary-aware, most-specific-match resolver in
 * both directions instead of a prefix heuristic.
 */
export function pickedSide(pick: {
  readonly selection: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
}): PickedSide | null {
  const selection = pick.selection.trim();
  const home = pick.homeTeamName.trim();
  const away = pick.awayTeamName.trim();
  if (selection.length === 0 || home.length === 0 || away.length === 0) return null;
  const isHome = selectionIsHomeSide(selection, home, away);
  const isAway = selectionIsHomeSide(selection, away, home);
  if (isHome && !isAway) return "home";
  if (isAway && !isHome) return "away";
  return null;
}

function isQuotedPrice(price: number | null): price is number {
  return typeof price === "number" && Number.isFinite(price) && price !== 0;
}

/**
 * Latest two-sided H2H row per real bookmaker for `gameId`, with fetchedAt at
 * or before `asOf`. Deterministic: rows are ordered by fetchedAt desc, then
 * bookmaker, then prices, before the first row per key is taken. Output is
 * sorted by bookmaker key.
 */
export function latestH2hRowPerBookmaker(
  rows: readonly OddsRowForMarketP[],
  gameId: string,
  asOf: Date,
): OddsRowForMarketP[] {
  const asOfMs = asOf.getTime();
  if (!Number.isFinite(asOfMs)) return [];
  const eligible = rows.filter((row) => {
    if (row.gameId !== gameId) return false;
    if (row.market != null && row.market.toUpperCase() !== "H2H") return false;
    if (!isRealBookmakerKey(row.bookmaker)) return false;
    if (!isQuotedPrice(row.homePrice) || !isQuotedPrice(row.awayPrice)) return false;
    const t = row.fetchedAt.getTime();
    return Number.isFinite(t) && t <= asOfMs;
  });
  eligible.sort((a, b) => {
    const dt = b.fetchedAt.getTime() - a.fetchedAt.getTime();
    if (dt !== 0) return dt;
    const dk = a.bookmaker.localeCompare(b.bookmaker);
    if (dk !== 0) return dk;
    const dh = (a.homePrice ?? 0) - (b.homePrice ?? 0);
    if (dh !== 0) return dh;
    return (a.awayPrice ?? 0) - (b.awayPrice ?? 0);
  });
  const latest = new Map<string, OddsRowForMarketP>();
  for (const row of eligible) {
    const key = row.bookmaker.trim();
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

/**
 * Why a candidate could not be resolved. `no_rows`: no H2H row for the game at
 * or before generatedAt. `no_usable_book`: rows exist but none comes from a
 * real bookmaker quoting both sides (C-110; before it, both cases were
 * `no_rows` and a lone real book was `insufficient_books`). `no_side`: the
 * selection names neither team or both. `insufficient_books` is no longer
 * produced (a single real book resolves as market_p_single_book); the loader
 * keeps the key at 0 for readers of persisted artifacts.
 */
export type PublishTimeMarketPUnresolvedReason = "no_rows" | "no_usable_book" | "no_side";

/**
 * Provenance tag of a resolved probability. `market_p_from_odds_table`: at
 * least MIN_BOOKMAKERS real books in the snapshot (the receipt's own book
 * floor). `market_p_single_book`: exactly one real book quoted the game at or
 * before generatedAt (C-110); same de-vig, reported separately.
 */
export type PublishTimeMarketPSource = "market_p_from_odds_table" | "market_p_single_book";

export function publishTimeMarketPSource(bookCount: number): PublishTimeMarketPSource {
  return bookCount >= MIN_BOOKMAKERS ? "market_p_from_odds_table" : "market_p_single_book";
}

export type PublishTimeMarketPResolved = {
  readonly status: "resolved";
  /** Picked side's de-vigged probability, 6 dp (receipt precision). */
  readonly p: number;
  readonly side: PickedSide;
  readonly bookCount: number;
  /** Two-or-more books versus a single book; see PublishTimeMarketPSource. */
  readonly pSource: PublishTimeMarketPSource;
  readonly bookmakers: readonly string[];
  /** Latest fetchedAt among the rows used: the snapshot this read reflects. */
  readonly snapshotAt: Date;
  /** Oldest fetchedAt among the rows used; equals snapshotAt when every book came from one run. */
  readonly oldestBookAt: Date;
  readonly method: typeof PUBLISH_TIME_MARKET_P_METHOD;
};

export type PublishTimeMarketPUnresolved = {
  readonly status: "unresolved";
  readonly reason: PublishTimeMarketPUnresolvedReason;
  readonly bookCount: number;
};

export type PublishTimeMarketPResult = PublishTimeMarketPResolved | PublishTimeMarketPUnresolved;

function round6(x: number): number {
  return Number(x.toFixed(6));
}

/**
 * Full result with provenance. `rows` may hold rows for many games; only the
 * pick's game is read.
 */
export function resolvePublishTimeMarketP(
  pick: PickForMarketP,
  rows: readonly OddsRowForMarketP[],
): PublishTimeMarketPResult {
  const side = pickedSide(pick);
  const books = latestH2hRowPerBookmaker(rows, pick.gameId, pick.generatedAt);
  if (books.length === 0) {
    // Distinguish "nothing stored" from "stored, but no real two-sided book".
    const asOfMs = pick.generatedAt.getTime();
    const anyH2hRow = rows.some(
      (row) =>
        row.gameId === pick.gameId &&
        (row.market == null || row.market.toUpperCase() === "H2H") &&
        row.fetchedAt.getTime() <= asOfMs,
    );
    return { status: "unresolved", reason: anyH2hRow ? "no_usable_book" : "no_rows", bookCount: 0 };
  }
  if (side == null) return { status: "unresolved", reason: "no_side", bookCount: books.length };

  // Same arithmetic as the engine's moneyline scorer: mean implied per side
  // across books, then proportional two-way de-vig. With one book (C-110) the
  // mean is that book's implied pair and the de-vig is identical.
  let homeSum = 0;
  let awaySum = 0;
  let newest = Number.NEGATIVE_INFINITY;
  let oldest = Number.POSITIVE_INFINITY;
  for (const row of books) {
    homeSum += americanToImpliedProbability(row.homePrice as number);
    awaySum += americanToImpliedProbability(row.awayPrice as number);
    const t = row.fetchedAt.getTime();
    newest = Math.max(newest, t);
    oldest = Math.min(oldest, t);
  }
  const fair = removeVig(homeSum / books.length, awaySum / books.length);
  const p = round6(side === "home" ? fair.home : fair.away);

  return {
    status: "resolved",
    p,
    side,
    bookCount: books.length,
    pSource: publishTimeMarketPSource(books.length),
    bookmakers: books.map((row) => row.bookmaker.trim()),
    snapshotAt: new Date(newest),
    oldestBookAt: new Date(oldest),
    method: PUBLISH_TIME_MARKET_P_METHOD,
  };
}

/**
 * Hook-shaped form: the picked side's publish-time probability, or null when
 * the side cannot be determined or no real book quoted both sides at or
 * before generatedAt.
 */
export function publishTimeMarketP(
  pick: PickForMarketP,
  rows: readonly OddsRowForMarketP[],
): number | null {
  const result = resolvePublishTimeMarketP(pick, rows);
  return result.status === "resolved" ? result.p : null;
}
