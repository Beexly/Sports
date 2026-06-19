/**
 * Market & Line Intelligence LOADER (Wave A internal cockpit surface).
 *
 * WHAT THIS IS
 * The thin, never-throw server boundary between the live DB and the PURE
 * `buildMarketAnalysisReport` aggregator below. It reads the line-movement
 * history WE ALREADY STORE — the multi-snapshot Odds table rows, each carrying a
 * `fetchedAt` timestamp — for a recent window of games, groups the snapshots by
 * game + market, and calls the aggregator. The cockpit page
 * (`/cockpit/market-analysis`) renders the result.
 *
 * It exists to realize value from analytics/math libraries that are built and
 * tested but consumed by zero product surfaces: the line-movement classifier
 * (SHARP / STEAM / REVERSE detection), the line-movement analytics helpers
 * (key-number proximity, open→current delta, consensus median), and the
 * descriptive-statistics median used for bookmaker dispersion (median + MAD).
 *
 * WHY IT IS SAFE
 * - It REUSES the pure analytics/math libs; it re-implements no classification
 *   and no scoring math. The aggregator is a pure function: snapshots → report.
 * - It is READ-ONLY: it never writes, flips a gate, re-scores, or bumps a
 *   MODEL_VERSION.
 * - It NEVER touches the network. The Odds API is never called — this reads the
 *   Odds rows that ingestion already persisted. Calling the paid API here would
 *   burn quota for a read-only internal view; it is forbidden.
 * - It NEVER throws. Any DB error, stub mode, or unreachable database degrades to
 *   a labeled honest-empty report (`dataMode: "unavailable"`) — never a fabricated
 *   number.
 *
 * HONESTY (non-negotiable)
 * - A game with fewer than 2 snapshots in a market cannot have a movement
 *   classified — it is reported as INSUFFICIENT ("awaiting odds ingestion"), not
 *   as a STABLE/zero move dressed up as a signal.
 * - Consensus + dispersion are computed over the bookmakers present in the latest
 *   snapshot. Below 3 distinct books the consensus is flagged
 *   ("limited bookmaker consensus — <3 books") so a single book is never read as a
 *   market.
 * - Key-number proximity is an NFL-spread heuristic (3/7/10/14…); it is reported
 *   only for the SPREADS market and is labeled as a heuristic, not a guarantee.
 */

import { db, Prisma } from "@sports/db";

import {
  classifyLineMovement,
  type LineSnapshot,
  type LineMovementResult,
} from "@/lib/math/line-movement-classify";
import {
  keyNumberProximity,
  openingToCurrentMove,
} from "@/lib/analytics/line-movement";
import { median } from "@/lib/math/probability";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cap the read — this is a rollup, not a per-row export. */
const MARKET_ANALYSIS_ODDS_LIMIT = 8000;

/** Only look back this far for "recent" games (kickoff window). */
const RECENT_WINDOW_DAYS = 14;

/** Cap how many games render, newest kickoff first. */
const MAX_GAMES_RENDERED = 60;

/** Distinct-book floor below which consensus is flagged as thin. */
export const MARKET_ANALYSIS_MIN_BOOKS = 3;

/** Snapshot floor below which a movement cannot be classified. */
export const MARKET_ANALYSIS_MIN_SNAPSHOTS = 2;

// ---------------------------------------------------------------------------
// Read-only record shapes consumed by the pure aggregator
// ---------------------------------------------------------------------------

/** Coarse market space used by the report. */
export type MarketKind = "SPREADS" | "TOTALS" | "H2H";

/** One stored Odds snapshot, mapped to only the fields the aggregator reads. */
export interface OddsSnapshotRecord {
  /** Bookmaker key/name (the line source for this row). */
  readonly bookmaker: string;
  /** ISO timestamp this snapshot was fetched (the line-movement time axis). */
  readonly fetchedAtIso: string;
  /** Spread (home perspective), or null when this market has no spread. */
  readonly spread: number | null;
  /** Total points line, or null. */
  readonly total: number | null;
  /** Moneyline home (American), or null. */
  readonly homePrice: number | null;
  /** Moneyline away (American), or null. */
  readonly awayPrice: number | null;
}

/** A game's snapshots for one market, plus the opening line we stored on Game. */
export interface GameMarketRecord {
  readonly gameId: string;
  readonly sport: string | null;
  readonly matchup: string;
  /** Kickoff ISO (used for ordering newest-first), or null. */
  readonly commenceTimeIso: string | null;
  readonly market: MarketKind;
  /** Opening spread captured at first ingestion (Game.openingSpread), or null. */
  readonly openingSpread: number | null;
  /** Opening total captured at first ingestion (Game.openingTotal), or null. */
  readonly openingTotal: number | null;
  /** Every stored snapshot for this game+market, any order. */
  readonly snapshots: readonly OddsSnapshotRecord[];
}

// ---------------------------------------------------------------------------
// Report shapes
// ---------------------------------------------------------------------------

/** Bookmaker consensus + dispersion over the latest snapshot's books. */
export interface ConsensusBlock {
  /** Distinct bookmakers in the latest snapshot. */
  readonly bookCount: number;
  /** True when bookCount is below the consensus floor (thin market). */
  readonly thin: boolean;
  /** Median consensus value across books, or null when no value present. */
  readonly consensus: number | null;
  /** Median absolute deviation (book disagreement), or null when <2 books. */
  readonly mad: number | null;
  /** Min/max across books, or null when no value present. */
  readonly low: number | null;
  readonly high: number | null;
}

/** NFL-spread key-number proximity for the consensus spread (heuristic). */
export interface KeyNumberBlock {
  readonly nearKeyNumber: boolean;
  readonly keyNumber: number | null;
  readonly distanceFromKey: number;
}

/** Per-game, per-market analysis row. */
export interface GameMarketAnalysis {
  readonly gameId: string;
  readonly sport: string | null;
  readonly matchup: string;
  readonly commenceTimeIso: string | null;
  readonly market: MarketKind;
  /** Distinct snapshots (time points) found for this game+market. */
  readonly snapshotCount: number;
  /**
   * Why this row could not be classified, or null when it could. When set, the
   * classification/delta fields are null — an honest insufficient state.
   */
  readonly insufficientNote: string | null;
  /** Line-movement classification (SHARP/STEAM/REVERSE/…), or null. */
  readonly classification: LineMovementResult | null;
  /** Open→current spread delta (signed), or null when not derivable. */
  readonly openToCurrentSpread: number | null;
  /** Open→current total delta (signed), or null when not derivable. */
  readonly openToCurrentTotal: number | null;
  /** Consensus + dispersion across the latest snapshot's books. */
  readonly consensus: ConsensusBlock;
  /** Key-number proximity (SPREADS only), or null otherwise. */
  readonly keyNumber: KeyNumberBlock | null;
}

export interface MarketAnalysisReport {
  /** Games (each with ≥1 market row) that carried any stored snapshots. */
  readonly games: readonly GameMarketAnalysis[];
  /** Total game+market rows examined. */
  readonly totalRows: number;
  /** Rows with a usable (≥2 snapshot) movement classification. */
  readonly classifiedRows: number;
  /** Rows flagged STEAM by the classifier. */
  readonly steamRows: number;
  /** Rows flagged SHARP by the classifier. */
  readonly sharpRows: number;
  /** Rows flagged with reverse-line-movement. */
  readonly reverseRows: number;
  /** Rows whose consensus is below the distinct-book floor. */
  readonly thinConsensusRows: number;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Distinct bookmaker values that carry a numeric line for the given selector,
 * keyed by bookmaker (latest wins) so one book's repeated rows are not counted
 * as a consensus.
 */
function latestPerBook(
  snapshots: readonly OddsSnapshotRecord[],
  value: (s: OddsSnapshotRecord) => number | null,
): number[] {
  const byBook = new Map<string, { iso: string; v: number }>();
  for (const s of snapshots) {
    const v = value(s);
    if (v === null || !Number.isFinite(v)) continue;
    const prev = byBook.get(s.bookmaker);
    if (prev === undefined || s.fetchedAtIso > prev.iso) {
      byBook.set(s.bookmaker, { iso: s.fetchedAtIso, v });
    }
  }
  return [...byBook.values()].map((e) => e.v);
}

/**
 * Median absolute deviation about the median — a robust dispersion measure that
 * is not skewed by a single off-book. Returns null for fewer than 2 values.
 */
function medianAbsoluteDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const med = median([...values]);
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

/** Build the consensus + dispersion block for one market selector. */
function buildConsensus(
  snapshots: readonly OddsSnapshotRecord[],
  value: (s: OddsSnapshotRecord) => number | null,
): ConsensusBlock {
  const values = latestPerBook(snapshots, value);
  const bookCount = values.length;
  if (bookCount === 0) {
    return { bookCount: 0, thin: true, consensus: null, mad: null, low: null, high: null };
  }
  const consensus = median([...values]);
  const mad = medianAbsoluteDeviation(values);
  let low = values[0] as number;
  let high = values[0] as number;
  for (const v of values) {
    if (v < low) low = v;
    if (v > high) high = v;
  }
  return {
    bookCount,
    thin: bookCount < MARKET_ANALYSIS_MIN_BOOKS,
    consensus,
    mad,
    low,
    high,
  };
}

/** The market's primary line per snapshot, for the classifier time series. */
function primaryValueOf(market: MarketKind, s: OddsSnapshotRecord): number | null {
  switch (market) {
    case "SPREADS":
      return s.spread;
    case "TOTALS":
      return s.total;
    case "H2H":
      return s.homePrice;
    default:
      return null;
  }
}

/**
 * Collapse the snapshots to one consensus value per distinct time point, ordered
 * chronologically, so the classifier sees the market's line over time (not the
 * interleaving of multiple books at the same instant). Distinct book count at
 * each time point feeds the classifier's steam detector.
 */
function toLineSeries(
  snapshots: readonly OddsSnapshotRecord[],
  value: (s: OddsSnapshotRecord) => number | null,
): LineSnapshot[] {
  const byTime = new Map<string, { values: number[]; books: Set<string> }>();
  for (const s of snapshots) {
    const v = value(s);
    if (v === null || !Number.isFinite(v)) continue;
    const bucket = byTime.get(s.fetchedAtIso);
    if (bucket) {
      bucket.values.push(v);
      bucket.books.add(s.bookmaker);
    } else {
      byTime.set(s.fetchedAtIso, { values: [v], books: new Set([s.bookmaker]) });
    }
  }
  return [...byTime.entries()]
    .map(([iso, bucket]) => ({
      timestampMs: Date.parse(iso),
      value: median([...bucket.values]),
      bookCount: bucket.books.size,
    }))
    .filter((p) => Number.isFinite(p.timestampMs))
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

// ---------------------------------------------------------------------------
// Pure aggregator — records → report. No I/O, no DB, fully testable.
// ---------------------------------------------------------------------------

/**
 * Analyze one game+market record into a `GameMarketAnalysis`. PURE.
 *
 * Degrades to an honest insufficient state when the snapshot count is below the
 * floor: a movement cannot be classified from a single observation, so the row
 * is reported as "awaiting odds ingestion" rather than a fabricated STABLE move.
 */
export function analyzeGameMarket(record: GameMarketRecord): GameMarketAnalysis {
  const { market, snapshots } = record;

  // Build the classifier time series from the market's primary line.
  const series = toLineSeries(snapshots, (s) => primaryValueOf(market, s));
  const snapshotCount = series.length;

  // Consensus is over the books present (latest per book) — independent of
  // whether the movement itself is classifiable.
  const consensusSpread = buildConsensus(snapshots, (s) => s.spread);
  const consensusTotal = buildConsensus(snapshots, (s) => s.total);
  const consensus = market === "TOTALS" ? consensusTotal : consensusSpread;

  // Key-number proximity is an NFL-spread heuristic; only meaningful for SPREADS
  // with a derivable consensus spread.
  let keyNumber: KeyNumberBlock | null = null;
  if (market === "SPREADS" && consensusSpread.consensus !== null) {
    keyNumber = keyNumberProximity(consensusSpread.consensus);
  }

  if (snapshotCount < MARKET_ANALYSIS_MIN_SNAPSHOTS) {
    return {
      gameId: record.gameId,
      sport: record.sport,
      matchup: record.matchup,
      commenceTimeIso: record.commenceTimeIso,
      market,
      snapshotCount,
      insufficientNote:
        snapshotCount === 0
          ? "Awaiting odds ingestion — no stored snapshots for this market."
          : "Awaiting odds ingestion — a single snapshot cannot show movement (need ≥2 over time).",
      classification: null,
      openToCurrentSpread: null,
      openToCurrentTotal: null,
      consensus,
      keyNumber,
    };
  }

  // Classify the movement from the consensus line series.
  const classification = classifyLineMovement(series);

  // Open→current delta from the stored opening line (Game.openingSpread/Total)
  // versus the CURRENT consensus — the median across the latest snapshot's books
  // (computed above). Uses the analytics helper so the sign convention matches
  // the rest of the platform.
  let openToCurrentSpread: number | null = null;
  let openToCurrentTotal: number | null = null;
  if (record.openingSpread !== null && consensusSpread.consensus !== null) {
    const delta = openingToCurrentMove(
      { timestamp: 0, spread: record.openingSpread },
      { timestamp: 1, spread: consensusSpread.consensus },
    );
    openToCurrentSpread = delta.spreadChange;
  }
  if (record.openingTotal !== null && consensusTotal.consensus !== null) {
    const delta = openingToCurrentMove(
      { timestamp: 0, total: record.openingTotal },
      { timestamp: 1, total: consensusTotal.consensus },
    );
    openToCurrentTotal = delta.totalChange;
  }

  return {
    gameId: record.gameId,
    sport: record.sport,
    matchup: record.matchup,
    commenceTimeIso: record.commenceTimeIso,
    market,
    snapshotCount,
    insufficientNote: null,
    classification,
    openToCurrentSpread,
    openToCurrentTotal,
    consensus,
    keyNumber,
  };
}

/**
 * Build the full market-analysis report from a set of game+market records.
 * PURE: no DB, no side effects, deterministic.
 *
 * Empty input yields an honest-empty report (no rows). Each row degrades to its
 * own insufficient state independently rather than dropping the game.
 */
export function buildMarketAnalysisReport(
  records: readonly GameMarketRecord[],
): MarketAnalysisReport {
  const games = records.map(analyzeGameMarket);

  let classifiedRows = 0;
  let steamRows = 0;
  let sharpRows = 0;
  let reverseRows = 0;
  let thinConsensusRows = 0;

  for (const g of games) {
    if (g.classification !== null) {
      classifiedRows++;
      if (g.classification.type === "STEAM") steamRows++;
      if (g.classification.type === "SHARP") sharpRows++;
      if (g.classification.isReverse) reverseRows++;
    }
    if (g.consensus.thin) thinConsensusRows++;
  }

  // Stable display order: newest kickoff first (nulls last), then matchup, then
  // market — so the operator scans the most actionable slate at the top.
  const ordered = [...games].sort((a, b) => {
    const ax = a.commenceTimeIso ?? "";
    const bx = b.commenceTimeIso ?? "";
    if (ax !== bx) {
      if (ax === "") return 1;
      if (bx === "") return -1;
      return ax < bx ? 1 : -1; // desc (newest first)
    }
    if (a.matchup !== b.matchup) return a.matchup.localeCompare(b.matchup);
    return a.market.localeCompare(b.market);
  });

  return {
    games: ordered,
    totalRows: games.length,
    classifiedRows,
    steamRows,
    sharpRows,
    reverseRows,
    thinConsensusRows,
  };
}

// ---------------------------------------------------------------------------
// DB boundary — never-throw loader
// ---------------------------------------------------------------------------

/**
 * Whether the report was computed from a reachable DB (`live`) or degraded to the
 * honest-empty report because the DB was unreachable / in stub mode (`unavailable`).
 */
export type MarketAnalysisDataMode = "live" | "unavailable";

export interface MarketAnalysisLoadResult {
  readonly dataMode: MarketAnalysisDataMode;
  /** ISO timestamp the report was loaded (for the cockpit "generated" stamp). */
  readonly loadedAtIso: string;
  /** Plain-language note explaining the data mode (esp. why it is unavailable). */
  readonly note: string;
  readonly report: MarketAnalysisReport;
}

/**
 * Field selection for the Odds read — only the columns the aggregator consumes,
 * plus the joined Game opening-line + matchup context. NO network: these are the
 * Odds rows ingestion already persisted, never a fresh Odds API call.
 */
const oddsSelect = Prisma.validator<Prisma.OddsSelect>()({
  gameId: true,
  bookmaker: true,
  market: true,
  spread: true,
  total: true,
  homePrice: true,
  awayPrice: true,
  fetchedAt: true,
  game: {
    select: {
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      openingSpread: true,
      openingTotal: true,
      sport: { select: { key: true, name: true } },
    },
  },
});

type OddsRow = Prisma.OddsGetPayload<{ select: typeof oddsSelect }>;

/** Map a Prisma OddsMarket enum to the report's market kind. */
function marketKindOf(market: OddsRow["market"]): MarketKind {
  switch (market) {
    case "SPREADS":
      return "SPREADS";
    case "TOTALS":
      return "TOTALS";
    case "H2H":
      return "H2H";
    default:
      return "H2H";
  }
}

/**
 * Group raw Odds rows into one `GameMarketRecord` per game+market, carrying the
 * Game opening line + matchup context. PURE shaping (no I/O).
 */
export function groupOddsRows(rows: readonly OddsRow[]): GameMarketRecord[] {
  const byKey = new Map<string, GameMarketRecord & { mutable: OddsSnapshotRecord[] }>();

  for (const row of rows) {
    const market = marketKindOf(row.market);
    const key = `${row.gameId}::${market}`;
    const snapshot: OddsSnapshotRecord = {
      bookmaker: row.bookmaker,
      fetchedAtIso: row.fetchedAt.toISOString(),
      spread: typeof row.spread === "number" ? row.spread : null,
      total: typeof row.total === "number" ? row.total : null,
      homePrice: typeof row.homePrice === "number" ? row.homePrice : null,
      awayPrice: typeof row.awayPrice === "number" ? row.awayPrice : null,
    };

    const existing = byKey.get(key);
    if (existing) {
      existing.mutable.push(snapshot);
    } else {
      byKey.set(key, {
        gameId: row.gameId,
        sport: row.game.sport.key || row.game.sport.name || null,
        matchup: `${row.game.awayTeamName} @ ${row.game.homeTeamName}`,
        commenceTimeIso: row.game.commenceTime ? row.game.commenceTime.toISOString() : null,
        market,
        openingSpread: typeof row.game.openingSpread === "number" ? row.game.openingSpread : null,
        openingTotal: typeof row.game.openingTotal === "number" ? row.game.openingTotal : null,
        snapshots: [],
        mutable: [snapshot],
      });
    }
  }

  return [...byKey.values()].map((g) => ({
    gameId: g.gameId,
    sport: g.sport,
    matchup: g.matchup,
    commenceTimeIso: g.commenceTimeIso,
    market: g.market,
    openingSpread: g.openingSpread,
    openingTotal: g.openingTotal,
    snapshots: g.mutable,
  }));
}

/**
 * Read the recent stored Odds snapshots. Reads ONLY the persisted Odds table —
 * never the Odds API. Returns null on ANY DB error so the caller degrades to
 * honest-empty.
 */
async function readRecentOdds(now: Date): Promise<OddsRow[] | null> {
  const since = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  try {
    return await db.odds.findMany({
      where: {
        game: { commenceTime: { gte: since } },
      },
      orderBy: { fetchedAt: "asc" },
      take: MARKET_ANALYSIS_ODDS_LIMIT,
      select: oddsSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Load the market-analysis report from the live DB.
 *
 * NEVER THROWS. On any DB error / stub mode it returns a labeled honest-empty
 * report (`dataMode: "unavailable"`) so the surface degrades to truthful empty
 * states instead of crashing or fabricating numbers. It NEVER calls the Odds API
 * or any network — every figure traces to stored Odds rows or to an honest empty
 * state.
 */
export async function loadMarketAnalysis(
  now: Date = new Date(),
): Promise<MarketAnalysisLoadResult> {
  const loadedAtIso = now.toISOString();

  let rows: OddsRow[] | null;
  try {
    rows = await readRecentOdds(now);
  } catch {
    rows = null;
  }

  if (rows === null) {
    return {
      dataMode: "unavailable",
      loadedAtIso,
      note:
        "The database was unreachable (or running in stub mode), so market analysis could not be " +
        "computed. This is an honest-empty report — no Odds snapshots were read (and the paid Odds " +
        "API is never called from this surface). Restore the database connection to populate it.",
      report: buildMarketAnalysisReport([]),
    };
  }

  const grouped = groupOddsRows(rows);
  const report = buildMarketAnalysisReport(grouped);
  // Cap the rendered slate; the report stays honest, just bounded.
  const games = report.games.slice(0, MAX_GAMES_RENDERED);
  const boundedReport: MarketAnalysisReport = { ...report, games };

  return {
    dataMode: "live",
    loadedAtIso,
    note:
      rows.length === 0
        ? "The database is reachable but holds no recent Odds snapshots yet. We are building the " +
          "record; the figures below are honest reads over a real (empty) Odds history."
        : `Computed from ${rows.length} stored Odds snapshots across ${report.totalRows} game+market ` +
          `rows, read live from the database (no Odds API call).`,
    report: boundedReport,
  };
}
