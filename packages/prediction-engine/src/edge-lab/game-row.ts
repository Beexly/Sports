/**
 * GameRow — the sport-agnostic game shape every edge-lab consumer reads.
 *
 * Per the edge-lab handoff (§6): the scoring / backtest engine itself is
 * sport-agnostic — only the per-sport LOADERS differ, each mapping its
 * native source schema onto this one shape. Downstream edge-lab code
 * (asof-store, walk-forward, placebo, etc.) should depend on `GameRow`
 * only, never on a sport's raw source columns.
 *
 * Pure types + one pure helper. No I/O here — loaders live in ./loaders/.
 */

export interface GameRow {
  readonly sport: "nfl" | "mlb";
  /** Stable natural key for the game (sport-namespaced where the source key isn't already unique across sports). */
  readonly gameId: string;
  readonly season: number;
  /** Week number for sports that have one (NFL); null for sports that don't (MLB) — never 0. */
  readonly week: number | null;
  /** ISO 8601 UTC timestamp — the decision cutoff anchor (kickoff / first pitch). */
  readonly startTime: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** null until the game is final. */
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  /** Closing market at (or nearest to) kickoff. Every field null when unknown — never fabricated. */
  readonly closing: {
    /** Home handicap, standard American spread-display convention: negative = home favored. */
    readonly spreadHome: number | null;
    readonly total: number | null;
    readonly moneylineHomeDecimal: number | null;
    readonly moneylineAwayDecimal: number | null;
  };
}

/**
 * Convert American odds to decimal odds.
 *
 *   +150 -> 1 + 150/100        = 2.5
 *   -110 -> 1 + 100/abs(-110)  = 1.909090... (~1.9091)
 *
 * Guards the values that are not valid American odds and returns `null`
 * rather than a misleading number:
 *   - `0`            — not a real price.
 *   - any `|american| < 100` — American odds are only ever quoted at a
 *     magnitude of 100 or more (there is no "+50" or "-40" American price);
 *     a value under that threshold signals a bad/blank upstream field.
 *   - non-finite input (`NaN`, `Infinity`).
 *
 * `american === 100` and `american === -100` are both valid (decimal 2.0,
 * a break-even / pick'em price) and are NOT guarded out.
 */
export function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || Math.abs(american) < 100) {
    return null;
  }
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}
