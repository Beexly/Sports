/**
 * GALILEO ENGINE — Market Surface (Phase 1).
 *
 * The instrument's retina. It turns a flat list of per-book quotes for one game into a
 * structured market GRAPH: every market instance (spread, total, moneyline, team total,
 * each player prop) with its outcomes, the cross-book consensus, the no-vig (fair)
 * probabilities, the best available number, the book dispersion, and per-book detail
 * retained for staleness / lead-lag analysis downstream.
 *
 * This is NOT a model and NOT a pick. It is measurement: it makes visible what a single
 * book's screen does not — where books disagree, what the fair price is, who is off-market.
 *
 * Pure + deterministic: no I/O, no clock, no RNG. Built from a normalized `Quote[]` so it
 * is fed identically by fixtures (tests) and by a real adapter (later). Sign conventions:
 *   - Spreads are stored per outcome as that SIDE's own handicap (HOME outcome carries the
 *     home number, AWAY the away number = −home), so "a higher own-point is better" holds
 *     for both sides uniformly.
 *   - Totals/player lines: OVER prefers a LOWER number, UNDER a HIGHER number.
 *   - Prices are American odds; implied/no-vig are probabilities in [0,1].
 */

export type MarketKind =
  | "spread"
  | "total"
  | "moneyline"
  | "team_total"
  | "player_pass_yds"
  | "player_rush_yds"
  | "player_reception_yds"
  | "player_receptions"
  | "player_completions"
  | "player_attempts"
  | "anytime_td"
  | "alternate_spread"
  | "alternate_total"
  | "alternate_player";

/** A single observation: one book, one market, one outcome, at one time. */
export interface Quote {
  readonly book: string;
  readonly market: MarketKind;
  /** Canonical outcome label: "OVER"/"UNDER", "HOME"/"AWAY", or "YES" (anytime TD). */
  readonly outcome: string;
  /** Player name for player props; omitted otherwise. */
  readonly player?: string;
  /** Team for team-scoped markets (team_total); omitted otherwise. */
  readonly team?: string;
  /** Line/handicap/total for this side; omitted for moneyline / anytime_td. */
  readonly point?: number;
  /** American odds. */
  readonly price: number;
  /** ISO-8601 observation time. */
  readonly timestamp: string;
}

export interface BookQuote {
  readonly book: string;
  readonly point: number | null;
  readonly price: number;
  readonly implied: number;
  readonly timestamp: string;
}

export interface OutcomeConsensus {
  readonly outcome: string;
  readonly nBooks: number;
  /** Median point across books (null for moneyline / anytime_td). */
  readonly consensusPoint: number | null;
  /** Median American price across books. */
  readonly consensusPrice: number;
  /** Implied probability of the median price (with vig). */
  readonly consensusImplied: number;
  /** Most bettor-favorable point given the outcome's direction (null if no point). */
  readonly bestPoint: number | null;
  /** Most bettor-favorable American price (highest payout). */
  readonly bestPrice: number;
  /** Spread of points across books (max − min); 0 if ≤1 book or no point. */
  readonly pointDispersion: number;
  /** Spread of implied probabilities across books (max − min). */
  readonly impliedDispersion: number;
  readonly latestTimestamp: string;
  readonly byBook: readonly BookQuote[];
}

export interface MarketInstance {
  /** Stable grouping key, e.g. "spread", "team_total:KC", "player_rush_yds:Bijan Robinson". */
  readonly key: string;
  readonly market: MarketKind;
  readonly player?: string;
  readonly team?: string;
  readonly outcomes: readonly OutcomeConsensus[];
  /** outcome → no-vig probability for two-way markets; empty when not de-viggable. */
  readonly noVig: Readonly<Record<string, number>>;
  readonly latestTimestamp: string;
}

export interface MarketSurface {
  readonly gameId: string;
  readonly books: readonly string[];
  readonly instances: readonly MarketInstance[];
  readonly quoteCount: number;
}

// ── price math ───────────────────────────────────────────────────────────────────

/** American odds → implied probability (with vig), in (0,1). */
export function americanToImpliedProb(price: number): number {
  if (!Number.isFinite(price) || price === 0) return NaN;
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

export function median(values: readonly number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 === 1 ? xs[m]! : (xs[m - 1]! + xs[m]!) / 2;
}

function range(values: readonly number[]): number {
  const xs = values.filter(Number.isFinite);
  if (xs.length <= 1) return 0;
  return Math.max(...xs) - Math.min(...xs);
}

/**
 * Remove the vig from a two-outcome market by normalizing the implied probabilities to
 * sum to 1 (the standard "multiplicative" method). Returns the no-vig probabilities in
 * the same order. For >2 mutually-exclusive outcomes the same normalization applies.
 */
export function devig(impliedByOutcome: Readonly<Record<string, number>>): Record<string, number> {
  const entries = Object.entries(impliedByOutcome).filter(([, v]) => Number.isFinite(v) && v > 0);
  const overround = entries.reduce((s, [, v]) => s + v, 0);
  const out: Record<string, number> = {};
  if (overround <= 0) return out;
  for (const [k, v] of entries) out[k] = v / overround;
  return out;
}

// ── instance grouping + direction ─────────────────────────────────────────────────

/** The grouping key that gathers the complementary outcomes of one market instance. */
export function marketInstanceKey(q: Quote): string {
  if (q.player) return `${q.market}:${q.player}`;
  if (q.team) return `${q.market}:${q.team}`;
  return q.market;
}

/** Which point direction is better for the bettor on this outcome. */
export function pointDirection(outcome: string): "higher" | "lower" | "none" {
  const o = outcome.toUpperCase();
  if (o.startsWith("OVER")) return "lower"; // buy the over at a lower number
  if (o.startsWith("UNDER")) return "higher";
  // Spread/handicap sides carry their OWN number → more points is always better.
  if (o === "HOME" || o === "AWAY") return "higher";
  return "none";
}

// ── builder ────────────────────────────────────────────────────────────────────────

function buildOutcome(outcome: string, quotes: readonly Quote[]): OutcomeConsensus {
  const byBook: BookQuote[] = quotes.map((q) => ({
    book: q.book,
    point: q.point ?? null,
    price: q.price,
    implied: americanToImpliedProb(q.price),
    timestamp: q.timestamp,
  }));
  const points = byBook.map((b) => b.point).filter((p): p is number => p != null);
  const prices = byBook.map((b) => b.price);
  const implieds = byBook.map((b) => b.implied);
  const dir = pointDirection(outcome);
  const bestPoint =
    points.length === 0 ? null : dir === "lower" ? Math.min(...points) : dir === "higher" ? Math.max(...points) : null;
  const consensusPrice = median(prices) ?? prices[0]!;
  return {
    outcome,
    nBooks: byBook.length,
    consensusPoint: median(points),
    consensusPrice,
    consensusImplied: americanToImpliedProb(consensusPrice),
    bestPoint,
    bestPrice: Math.max(...prices),
    pointDispersion: range(points),
    impliedDispersion: range(implieds),
    latestTimestamp: byBook.map((b) => b.timestamp).sort().at(-1)!,
    byBook,
  };
}

/**
 * Build the full market surface for one game from a flat list of quotes. Quotes are
 * grouped into market instances; each instance's outcomes are reduced to a cross-book
 * consensus and de-vigged into fair probabilities.
 */
export function buildMarketSurface(gameId: string, quotes: readonly Quote[]): MarketSurface {
  const byInstance = new Map<string, Quote[]>();
  const books = new Set<string>();
  for (const q of quotes) {
    books.add(q.book);
    const key = marketInstanceKey(q);
    (byInstance.get(key) ?? byInstance.set(key, []).get(key)!).push(q);
  }

  const instances: MarketInstance[] = [];
  for (const [key, qs] of byInstance) {
    const byOutcome = new Map<string, Quote[]>();
    for (const q of qs) (byOutcome.get(q.outcome) ?? byOutcome.set(q.outcome, []).get(q.outcome)!).push(q);

    const outcomes = [...byOutcome.entries()]
      .map(([outcome, oq]) => buildOutcome(outcome, oq))
      .sort((a, b) => (a.outcome < b.outcome ? -1 : 1));

    const impliedByOutcome: Record<string, number> = {};
    for (const o of outcomes) impliedByOutcome[o.outcome] = o.consensusImplied;
    // Only de-vig genuine complementary markets (≥2 outcomes); skip one-sided (anytime_td YES).
    const noVig = outcomes.length >= 2 ? devig(impliedByOutcome) : {};

    const first = qs[0]!;
    instances.push({
      key,
      market: first.market,
      ...(first.player ? { player: first.player } : {}),
      ...(first.team ? { team: first.team } : {}),
      outcomes,
      noVig,
      latestTimestamp: outcomes.map((o) => o.latestTimestamp).sort().at(-1)!,
    });
  }

  return {
    gameId,
    books: [...books].sort(),
    instances: instances.sort((a, b) => (a.key < b.key ? -1 : 1)),
    quoteCount: quotes.length,
  };
}

// ── query helpers (used by coherence/book-dna/shock layers) ─────────────────────────

export function getInstance(surface: MarketSurface, key: string): MarketInstance | undefined {
  return surface.instances.find((i) => i.key === key);
}

export function outcomeOf(instance: MarketInstance | undefined, outcome: string): OutcomeConsensus | undefined {
  return instance?.outcomes.find((o) => o.outcome.toUpperCase() === outcome.toUpperCase());
}

/**
 * Flag books whose implied probability on an outcome deviates from the consensus by more
 * than `threshold` (probability points). This is a STATIC outlier flag (cross-sectional),
 * not a temporal-staleness verdict — proving a book is stale requires the time series and
 * lives in book-dna (Phase 3). Returned books are candidates only.
 */
export function bookOutlierFlags(
  outcome: OutcomeConsensus,
  threshold = 0.04,
): Array<{ book: string; deltaImplied: number }> {
  return outcome.byBook
    .map((b) => ({ book: b.book, deltaImplied: b.implied - outcome.consensusImplied }))
    .filter((b) => Math.abs(b.deltaImplied) > threshold)
    .sort((a, b) => Math.abs(b.deltaImplied) - Math.abs(a.deltaImplied));
}
