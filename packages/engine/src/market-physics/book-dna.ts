/**
 * GALILEO ENGINE — Book DNA / Lead-Lag Engine (Phase 3).
 *
 * Different books are different animals: some originate moves (sharp/low-limit price
 * discovery), some follow minutes later, some sit stale. This profiles each book from a
 * timestamped quote series: when the market moves to a new level, who got there FIRST
 * (leader) and who arrived late (follower, with a measured lag) or never (potential stale).
 *
 * The output is NOT a pick. It is a map of which books are likely stale in which market
 * types — the prerequisite for "can any book be consistently caught off-market before it
 * corrects." Pure + deterministic; timestamps are parsed from the provided ISO strings
 * (no clock read), so the same series always yields the same profile.
 */

export interface QuoteEvent {
  readonly book: string;
  readonly point: number;
  /** ISO-8601. */
  readonly timestamp: string;
}

export interface MoveRecord {
  /** The new market level reached. */
  readonly level: number;
  readonly leader: string;
  readonly leaderTimeMs: number;
  readonly followers: ReadonlyArray<{ book: string; lagMs: number }>;
  /** Books active in the series that never reached this level before the next move. */
  readonly nonFollowers: readonly string[];
}

const ms = (iso: string): number => Date.parse(iso);

/**
 * Classify the moves in a single (market, outcome) quote series. A "move" is the first
 * appearance of a new point level; the book that posts it first leads, books that later
 * post the same level follow (lag = their time − leader time), and books that never post it
 * are non-followers. Deterministic ordering by timestamp then book.
 */
export function classifyMoves(events: readonly QuoteEvent[]): MoveRecord[] {
  const sorted = [...events]
    .filter((e) => Number.isFinite(ms(e.timestamp)) && Number.isFinite(e.point))
    .sort((a, b) => ms(a.timestamp) - ms(b.timestamp) || (a.book < b.book ? -1 : 1));
  if (sorted.length === 0) return [];

  const allBooks = new Set(sorted.map((e) => e.book));
  // First time each book reaches each level.
  const levelOrder: number[] = [];
  const firstAtLevel = new Map<number, Array<{ book: string; t: number }>>();
  const seenBookLevel = new Set<string>();
  for (const e of sorted) {
    if (!firstAtLevel.has(e.point)) {
      firstAtLevel.set(e.point, []);
      levelOrder.push(e.point);
    }
    const bl = `${e.book}@${e.point}`;
    if (!seenBookLevel.has(bl)) {
      seenBookLevel.add(bl);
      firstAtLevel.get(e.point)!.push({ book: e.book, t: ms(e.timestamp) });
    }
  }

  const moves: MoveRecord[] = [];
  // Skip the very first level (the opening state is not a "move").
  for (let i = 1; i < levelOrder.length; i++) {
    const level = levelOrder[i]!;
    const arrivals = firstAtLevel.get(level)!.slice().sort((a, b) => a.t - b.t || (a.book < b.book ? -1 : 1));
    if (arrivals.length === 0) continue;
    const leader = arrivals[0]!;
    const followers = arrivals.slice(1).map((a) => ({ book: a.book, lagMs: a.t - leader.t }));
    const reached = new Set(arrivals.map((a) => a.book));
    const nonFollowers = [...allBooks].filter((b) => !reached.has(b)).sort();
    moves.push({ level, leader: leader.book, leaderTimeMs: leader.t, followers, nonFollowers });
  }
  return moves;
}

export interface BookLeadLagProfile {
  readonly book: string;
  readonly market: string;
  /** Moves in which this book participated (led or followed). */
  readonly samples: number;
  readonly leadFreq: number;
  readonly followFreq: number;
  /** Median follow lag in ms (0 when it never follows). */
  readonly medianLagMs: number;
  /** Fraction of moves the book missed entirely (never reached the new level). */
  readonly missRate: number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Aggregate a book's lead/lag behavior across the moves of one market. */
export function profileBook(book: string, market: string, moves: readonly MoveRecord[]): BookLeadLagProfile {
  let leads = 0;
  let follows = 0;
  let misses = 0;
  const lags: number[] = [];
  for (const mv of moves) {
    if (mv.leader === book) leads += 1;
    else if (mv.followers.some((f) => f.book === book)) {
      follows += 1;
      lags.push(mv.followers.find((f) => f.book === book)!.lagMs);
    } else if (mv.nonFollowers.includes(book)) misses += 1;
  }
  const totalMoves = moves.length || 1;
  const samples = leads + follows;
  return {
    book,
    market,
    samples,
    leadFreq: leads / totalMoves,
    followFreq: follows / totalMoves,
    medianLagMs: median(lags),
    missRate: misses / totalMoves,
  };
}

export interface BookStalenessScore {
  readonly book: string;
  readonly market: string;
  /** 0 (always leads, never stale) → 1 (always lags/misses with long delay). */
  readonly staleness: number;
}

/**
 * A composite staleness score: high when a book follows/misses rather than leads, and when
 * its follow lag is long. Normalized against `lagRefMs` (the lag treated as "fully stale").
 */
export function stalenessScore(profile: BookLeadLagProfile, lagRefMs = 5 * 60_000): BookStalenessScore {
  const followMiss = profile.followFreq + profile.missRate; // share of moves it didn't originate
  const lagComponent = Math.min(1, profile.medianLagMs / lagRefMs);
  // Weight: being a follower/misser dominates; lag sharpens it.
  const staleness = Math.min(1, 0.6 * followMiss + 0.4 * lagComponent * (followMiss > 0 ? 1 : 0));
  return { book: profile.book, market: profile.market, staleness };
}

/**
 * Compare a book's lag in two market types (e.g. props vs sides, or alt vs main) to expose
 * a differential — books are often current on sides but stale on props. Positive `lagDeltaMs`
 * means the book is SLOWER in market A than market B.
 */
export function compareMarketLag(
  a: BookLeadLagProfile,
  b: BookLeadLagProfile,
): { book: string; lagDeltaMs: number; missDelta: number } {
  return {
    book: a.book,
    lagDeltaMs: a.medianLagMs - b.medianLagMs,
    missDelta: a.missRate - b.missRate,
  };
}
