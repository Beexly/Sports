/**
 * Galaxy Lab — No-Vig Fair Odds & Hold Calculator engine.
 *
 * Surfaces the previously-dormant odds/devig math (`winProbabilityFromOdds`
 * from `@/lib/math/probability-distributions`, the `toAmericanOdds` decimal→
 * American helper from `@/lib/utils/validation-utils`, and `median` from
 * `@/lib/math/statistics`) through a validated, user-driven tool. This is an
 * INTERACTIVE MARKET EXPLORER: the user enters one or more books' American
 * prices for a single market (two-way or n-way), and the tool returns each
 * side's raw implied probability, the book's total overround and hold/vig %,
 * the vig-free fair probabilities (normalized to sum to 1), and the fair
 * (no-vig) American odds per side. Across multiple books it returns a consensus
 * fair probability (median) per side and the implied fair line.
 *
 * Honesty / responsible-gaming posture: every number is computed strictly from
 * the prices YOU enter. The "fair" probability is the book's own margin removed
 * by proportional normalization — it is NOT an independent estimate of the true
 * outcome probability, and the tool makes no published-pick claim. The
 * disclaimer travels with the result. Pure compute, deterministic (closed-form),
 * no DB, no secrets, no network, no side effects.
 */

import { winProbabilityFromOdds } from "@/lib/math/probability-distributions";
import { toAmericanOdds } from "@/lib/utils/validation-utils";
import { median } from "@/lib/math/statistics";

// ── Public types ─────────────────────────────────────────────────────────────

/** One book's American prices for the market's sides, in side order. */
export interface BookInput {
  /** Optional label for the book (e.g. "DraftKings"). */
  name: string;
  /** American odds for each side, in the same order as the side labels. */
  americanOdds: number[];
}

export interface NoVigInput {
  /**
   * Labels for the market's sides, in a fixed order (e.g. ["Home", "Away"] or
   * ["Win", "Draw", "Lose"]). Length is the market's "way" count (>= 2).
   */
  sideLabels: string[];
  /** One or more books, each quoting an American price for every side. */
  books: BookInput[];
}

/** Per-side breakdown for a single book. */
export interface SideResult {
  label: string;
  /** The American price the user entered for this side at this book. */
  americanOdds: number;
  /** Raw implied probability from the price (includes the book's margin). */
  impliedProbability: number;
  /** Vig-free fair probability (proportional normalization, sums to 1). */
  fairProbability: number;
  /** Fair (no-vig) American odds implied by the fair probability. */
  fairAmericanOdds: number;
}

/** Per-book devig breakdown. */
export interface BookResult {
  name: string;
  sides: SideResult[];
  /** Sum of raw implied probabilities (the booked total > 1 when vig present). */
  overround: number;
  /**
   * The book's hold (vig) as a fraction of the booked total:
   * (overround − 1) / overround, i.e. margin / booked total. Multiply by 100
   * for a percentage.
   */
  hold: number;
}

/** Consensus fair line across the books, per side. */
export interface ConsensusSide {
  label: string;
  /** Median of the per-book fair probabilities for this side (then renormalized). */
  fairProbability: number;
  /** Fair (no-vig) American odds implied by the consensus fair probability. */
  fairAmericanOdds: number;
}

export interface NoVigOutput {
  sideLabels: string[];
  books: BookResult[];
  /**
   * Consensus fair line — the median fair probability per side across the
   * books, renormalized to sum to 1, with the implied fair odds. Present only
   * when more than one book was supplied (a single book IS its own consensus).
   */
  consensus: ConsensusSide[] | null;
  /** Average hold across the supplied books (fraction; multiply by 100 for %). */
  averageHold: number;
  /** Short plain-language notes explaining the breakdown. */
  notes: string[];
  disclaimer: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const NOVIG_MIN_SIDES = 2;
export const NOVIG_MAX_SIDES = 12;
export const NOVIG_MAX_BOOKS = 20;
/**
 * American odds outside this band are nonsensical for a real market. ±100 is a
 * true coin-flip price; values in (-100, 100) exclusive are invalid in American
 * notation, so we reject the open interval below.
 */
export const NOVIG_MAX_ABS_ODDS = 100_000;

export const NO_VIG_DISCLAIMER =
  "Educational calculator that runs purely on the prices YOU enter — not a " +
  "published pick, prediction, or performance claim. The fair probability is " +
  "simply the book's own margin removed by proportional normalization; it is " +
  "NOT an independent read of the true outcome probability. Gambling involves " +
  "risk — never wager more than you can afford to lose. (1-800-GAMBLER)";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round to a sensible number of decimals without trailing-float noise. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Convert a fair probability into fair American odds.
 *
 * No standalone, reusable probability→American helper is exported in the
 * codebase (the existing ones are nested closures inside
 * `number-utils.removeVig` / `spread-math`). We instead route the probability
 * through decimal odds (decimal = 1/p) and reuse the existing, tested
 * `toAmericanOdds` decimal→American converter so the conversion + rounding
 * logic is shared rather than duplicated.
 */
function fairProbToAmerican(p: number): number {
  // Clamp away from the degenerate 0/1 endpoints so the decimal conversion is
  // finite. A fair prob is always in (0,1) for valid inputs; this is a guard.
  const safe = Math.min(0.999999, Math.max(1e-6, p));
  const decimal = 1 / safe;
  return toAmericanOdds(decimal);
}

function isValidAmerican(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const abs = Math.abs(value);
  // American odds are |odds| >= 100 (and conventionally an integer magnitude).
  return abs >= 100 && abs <= NOVIG_MAX_ABS_ODDS;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim().slice(0, 48);
  }
  return fallback;
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate and normalize an untrusted request body into a NoVigInput.
 * Returns `{ error }` on a fatal validation problem.
 *
 * Accepted shapes:
 *   { sideLabels?: string[], books: [{ name?, americanOdds: number[] }, ...] }
 * `americanOdds` entries may be numbers or numeric strings. When `sideLabels`
 * is omitted we synthesize "Side 1", "Side 2", … from the first book's length.
 */
export function validateNoVigInput(raw: unknown): NoVigInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const rawBooks = src["books"];
  if (!Array.isArray(rawBooks) || rawBooks.length === 0) {
    return { error: "books is required and must be a non-empty array." };
  }
  if (rawBooks.length > NOVIG_MAX_BOOKS) {
    return { error: `books supports at most ${NOVIG_MAX_BOOKS} entries.` };
  }

  // Parse books first so we can derive / validate the side count from them.
  const books: BookInput[] = [];
  for (let i = 0; i < rawBooks.length; i++) {
    const rawBook = rawBooks[i];
    if (typeof rawBook !== "object" || rawBook === null) {
      return { error: `books[${i}] must be an object.` };
    }
    const b = rawBook as Record<string, unknown>;
    const rawOdds = b["americanOdds"];
    if (!Array.isArray(rawOdds)) {
      return { error: `books[${i}].americanOdds must be an array of prices.` };
    }
    if (rawOdds.length < NOVIG_MIN_SIDES) {
      return {
        error: `books[${i}].americanOdds needs at least ${NOVIG_MIN_SIDES} prices (a two-way market).`,
      };
    }
    if (rawOdds.length > NOVIG_MAX_SIDES) {
      return {
        error: `books[${i}].americanOdds supports at most ${NOVIG_MAX_SIDES} prices.`,
      };
    }
    const americanOdds: number[] = [];
    for (let j = 0; j < rawOdds.length; j++) {
      const price = readNumber(rawOdds[j]);
      if (price === null) {
        return { error: `books[${i}].americanOdds[${j}] must be a number.` };
      }
      if (!isValidAmerican(price)) {
        return {
          error: `books[${i}].americanOdds[${j}] (${price}) is not valid American odds (magnitude must be 100–${NOVIG_MAX_ABS_ODDS}).`,
        };
      }
      americanOdds.push(Math.round(price));
    }
    books.push({
      name: readString(b["name"], `Book ${i + 1}`),
      americanOdds,
    });
  }

  // Every book must quote the same number of sides as the market's "way" count.
  const sideCount = books[0]!.americanOdds.length;
  for (let i = 1; i < books.length; i++) {
    if (books[i]!.americanOdds.length !== sideCount) {
      return {
        error: `every book must quote the same number of sides; book ${i + 1} has ${books[i]!.americanOdds.length}, expected ${sideCount}.`,
      };
    }
  }

  // Side labels: use the supplied ones (trimmed) when they match the side count,
  // otherwise synthesize positional labels so the output is always coherent.
  let sideLabels: string[];
  const rawLabels = src["sideLabels"];
  if (Array.isArray(rawLabels) && rawLabels.length === sideCount) {
    sideLabels = rawLabels.map((l, idx) => readString(l, `Side ${idx + 1}`));
  } else if (rawLabels !== undefined && Array.isArray(rawLabels)) {
    return {
      error: `sideLabels has ${rawLabels.length} labels but the market has ${sideCount} sides.`,
    };
  } else {
    sideLabels = Array.from({ length: sideCount }, (_, idx) => `Side ${idx + 1}`);
  }

  return { sideLabels, books };
}

// ── Engine ───────────────────────────────────────────────────────────────────

function devigBook(book: BookInput, sideLabels: string[]): BookResult {
  // Raw implied probability per side via the dormant odds-conversion helper.
  const implied = book.americanOdds.map((odds) => winProbabilityFromOdds(odds));
  const overround = implied.reduce((acc, p) => acc + p, 0);
  // Proportional (multiplicative) devig: normalize the implied probs to sum 1.
  const denom = overround === 0 ? 1 : overround;

  const sides: SideResult[] = book.americanOdds.map((odds, i) => {
    const rawImplied = implied[i]!;
    const fair = rawImplied / denom;
    return {
      label: sideLabels[i] ?? `Side ${i + 1}`,
      americanOdds: odds,
      impliedProbability: round(rawImplied, 6),
      fairProbability: round(fair, 6),
      fairAmericanOdds: fairProbToAmerican(fair),
    };
  });

  // Hold = margin as a fraction of the booked total. overround = sum - 1.
  const margin = overround - 1;
  const hold = margin / overround;

  return {
    name: book.name,
    sides,
    overround: round(overround, 6),
    hold: round(hold, 6),
  };
}

/**
 * Run the no-vig calculation and assemble an honest, complete result.
 * Pure and deterministic: identical input always yields identical output.
 */
export function runNoVigCalculation(input: NoVigInput): NoVigOutput {
  const books = input.books.map((b) => devigBook(b, input.sideLabels));

  // Average hold across the books (fraction).
  const avgHold =
    books.reduce((acc, b) => acc + b.hold, 0) / (books.length || 1);

  // Consensus fair line: per side, the median of the per-book fair
  // probabilities, then renormalized so the consensus probs sum to 1 (medians
  // taken independently per side need not sum to exactly 1). Only meaningful
  // with more than one book.
  let consensus: ConsensusSide[] | null = null;
  if (books.length > 1) {
    const perSideMedians = input.sideLabels.map((_, sideIdx) => {
      const probs = books.map((b) => b.sides[sideIdx]!.fairProbability);
      // median() returns number | null; books.length > 1 guarantees non-empty.
      return median(probs) ?? 0;
    });
    const medianSum = perSideMedians.reduce((acc, p) => acc + p, 0);
    const norm = medianSum === 0 ? 1 : medianSum;
    consensus = input.sideLabels.map((label, sideIdx) => {
      const fair = (perSideMedians[sideIdx] ?? 0) / norm;
      return {
        label,
        fairProbability: round(fair, 6),
        fairAmericanOdds: fairProbToAmerican(fair),
      };
    });
  }

  const notes = buildNotes(books, consensus, input.sideLabels.length);

  return {
    sideLabels: input.sideLabels,
    books,
    consensus,
    averageHold: round(avgHold, 6),
    notes,
    disclaimer: NO_VIG_DISCLAIMER,
  };
}

function buildNotes(
  books: BookResult[],
  consensus: ConsensusSide[] | null,
  sideCount: number,
): string[] {
  const notes: string[] = [];

  notes.push(
    sideCount === 2
      ? "Two-way market: the prices you see add up to more than 100% — that excess is the book's margin."
      : `${sideCount}-way market: the implied probabilities sum above 100%; the excess is the book's margin spread across the sides.`,
  );

  // Lowest- and highest-hold book, when more than one supplied.
  if (books.length > 1) {
    let lowest = books[0]!;
    let highest = books[0]!;
    for (const b of books) {
      if (b.hold < lowest.hold) lowest = b;
      if (b.hold > highest.hold) highest = b;
    }
    if (lowest.name !== highest.name) {
      notes.push(
        `${lowest.name} holds the least (${round(lowest.hold * 100, 2)}%); ${highest.name} holds the most (${round(highest.hold * 100, 2)}%).`,
      );
    }
    if (consensus !== null) {
      notes.push(
        "Consensus fair line is the median of the books' vig-free probabilities — a steadier read than any single book.",
      );
    }
  } else {
    const only = books[0]!;
    notes.push(
      `This book's hold is ${round(only.hold * 100, 2)}% — add more books to compare and build a consensus fair line.`,
    );
  }

  notes.push(
    "Fair odds are what a zero-margin book would post for the same probabilities — the price with the vig stripped out.",
  );

  return notes;
}
