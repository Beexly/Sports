/**
 * LineSnapshot — the plain, pure shape both TruthMetrics libraries consume.
 *
 * This mirrors `OddsLineSnapshot` from packages/db/prisma/schema.prisma (lines
 * 453-470) but is a standalone TypeScript interface with no Prisma dependency,
 * so the library can run against synthetic fixture rows in unit tests and
 * against real DB rows in production by mapping one field-for-field.
 *
 * Field semantics (verbatim from the schema comment at schema.prisma:440):
 *   - phase: "OPEN" (first ever snapshot for game+market) | "INTERIM" | "CLOSE"
 *   - market: "SPREAD" | "MONEYLINE" | "TOTAL"
 *   - price: native odds format (decimal for moneyline, american for spread/total
 *     in this codebase's convention — see devig.ts comments)
 *   - line: points line for SPREAD/TOTAL; null for MONEYLINE
 *   - side: the outcome this snapshot covers (e.g. "Chiefs -3.5", "OVER 48.5")
 *
 * NOT a DB model — this is a contract interface. Loaders that hydrate it from
 * Prisma, JSON, or synthetic fixtures all produce the same shape, so the
 * metric libraries never know or care about the source.
 */

/** When in the capture cycle a snapshot was taken. */
export type SnapshotPhase = "OPEN" | "INTERIM" | "CLOSE";

/** Market family. Matches OddsMarket enum in schema.prisma. */
export type MarketType = "SPREAD" | "MONEYLINE" | "TOTAL";

/**
 * One (game, market, book, side) price+line capture. Timestamps are ISO-8601
 * UTC strings (same convention as ledger-chain.ts's decisionAt/kickoffAt).
 */
export interface LineSnapshot {
  /** ISO-8601 UTC — when this snapshot was captured. */
  readonly capturedAt: string;
  /** OPEN | INTERIM | CLOSE — stamped at write time, not computed. */
  readonly phase: SnapshotPhase;
  /** Book identifier (e.g. "pinnacle", "draftkings"). */
  readonly book: string;
  /** SPREAD | MONEYLINE | TOTAL. */
  readonly market: MarketType;
  /** Which side/outcome (e.g. "Chiefs -3.5", "OVER 48.5", "Chiefs ML"). */
  readonly side: string;
  /** Price at capture in the source's native odds format. */
  readonly price: number;
  /** Points line at capture (spread/total); null for moneyline. */
  readonly line: number | null;
  /** Source identifier (e.g. "the-odds-api"). */
  readonly source: string;
}

/** A snapshot plus the game it belongs to and its kickoff. */
export interface GameSnapshots {
  /** The game identifier (externalId from The Odds API, or synthetic). */
  readonly gameId: string;
  /** ISO-8601 UTC — kickoff time, used to compute time-to-kickoff. */
  readonly kickoffAt: string;
  /** The snapshots for this game, any order; libraries sort internally. */
  readonly snapshots: readonly LineSnapshot[];
}

/**
 * Result of analysing one game's line path. Both Consensus Clock and Line DNA
 * feed into the same honest-empty contract: when there is not enough data to
 * produce a substantive number, every metric is null and the consumer renders
 * "collecting" rather than a fabricated value.
 */
export interface TruthMetricsResult {
  /** gameId this result belongs to. */
  readonly gameId: string;
  /** Whether enough snapshots exist to produce a substantive result. */
  readonly hasEnoughData: boolean;
  /** Human-readable reason for the empty state, when applicable. */
  readonly emptyReason: string | null;
}
