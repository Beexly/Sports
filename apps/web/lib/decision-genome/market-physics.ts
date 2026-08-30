/**
 * Market Physics Engine — model a betting market as physics, not just a number.
 *
 * From the research doctrine: "Do not merely show odds. Model markets as physics." Every
 * market has behaviour — temperature, pressure, gravity, viscosity, entropy, friction,
 * half-life, shock, inertia, toxicity. This module turns a set of book quotes (plus an
 * optional opening anchor and a designated sharp book) into those measurable terms, and a
 * single `toxicity` read of whether the number is safe to act on / publish.
 *
 * Pure, no I/O. All terms are normalized to [0,1] where higher = more of that property.
 */

export interface BookQuote {
  readonly book: string;
  /** The line/price to compare across books (e.g. the spread, or the devigged prob). */
  readonly value: number;
  /** The book's own last-update epoch ms (staleness signal). */
  readonly lastUpdate: number;
  /** Whether a real user can actually reach this book/number. */
  readonly reachable: boolean;
}

export interface MarketPhysicsInput {
  readonly quotes: readonly BookQuote[];
  /** Opening value, when known — gravity/shock reference. */
  readonly openingValue?: number;
  /** The sharp-anchor book key, when designated — gravity reference. */
  readonly sharpBook?: string;
  /** Now, epoch ms (passed in — module is clock-free for determinism). */
  readonly now: number;
}

export interface MarketPhysics {
  /** Line volatility / disagreement-driven instability. */
  readonly temperature: number;
  /** Consensus compression — how tightly books cluster. */
  readonly pressure: number;
  /** Pull of the consensus toward the sharp anchor. */
  readonly gravity: number;
  /** Staleness of the slowest books. */
  readonly viscosity: number;
  /** Disagreement across books. */
  readonly entropy: number;
  /** Share of the market a real user cannot reach. */
  readonly friction: number;
  /** Composite risk that the number is stale/bait/unplayable/unsafe. */
  readonly toxicity: number;
  /** Convenience verdict derived from toxicity. */
  readonly safeToActOn: boolean;
}

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

function stddev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m))));
}

const STALE_MS = 60 * 60 * 1000; // 1h — a book older than this is fully viscous

/**
 * Compute the market physics for a set of book quotes. Empty input is maximally toxic
 * (nothing to trust). Pure.
 */
export function computeMarketPhysics(input: MarketPhysicsInput): MarketPhysics {
  const { quotes, openingValue, sharpBook, now } = input;
  if (quotes.length === 0) {
    return { temperature: 0, pressure: 0, gravity: 0, viscosity: 1, entropy: 0, friction: 1, toxicity: 1, safeToActOn: false };
  }

  const values = quotes.map((q) => q.value);
  const sd = stddev(values);
  const avg = mean(values);
  const scale = Math.max(1e-9, Math.abs(avg));

  // Entropy: normalized dispersion across books.
  const entropy = clamp01(sd / scale);
  // Temperature: instability from disagreement + distance from the opening (a moving market).
  const move = openingValue == null ? 0 : Math.abs(avg - openingValue) / scale;
  const temperature = clamp01(entropy * 0.6 + move * 0.4);
  // Pressure: the inverse of dispersion — tight consensus = high pressure toward a number.
  const pressure = clamp01(1 - sd / scale);

  // Gravity: how close the consensus sits to the sharp anchor (1 = right on it).
  let gravity = 0;
  const anchor = sharpBook ? quotes.find((q) => q.book === sharpBook) : undefined;
  if (anchor) {
    gravity = clamp01(1 - Math.abs(avg - anchor.value) / scale);
  }

  // Viscosity: how stale the slowest reachable books are.
  const ages = quotes.map((q) => Math.max(0, now - q.lastUpdate));
  const viscosity = clamp01(Math.max(...ages) / STALE_MS);

  // Friction: share of the market a user cannot reach.
  const unreachable = quotes.filter((q) => !q.reachable).length;
  const friction = clamp01(unreachable / quotes.length);

  // Toxicity: stale + unreachable + chaotic markets are dangerous to act on/publish.
  const toxicity = clamp01(0.45 * viscosity + 0.35 * friction + 0.2 * temperature);

  return {
    temperature,
    pressure,
    gravity,
    viscosity,
    entropy,
    friction,
    toxicity,
    safeToActOn: toxicity < 0.5 && friction < 1,
  };
}
