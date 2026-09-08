import type { NormalizedOdds } from "@sports/types";

/**
 * Cross-bookmaker robust outlier detector for a single game+market's numeric
 * lines (spread points, total points, or any already-comparable numeric
 * quote such as a de-vigged implied probability).
 *
 * WHY THIS EXISTS (a real gap, not a duplicate):
 *
 * `normalizer.ts`'s `sanitizeSpreadPoint` (this package, ~line 59) is a FIXED
 * per-sport magnitude bound — `|point| > 6` for `FIXED_LINE_SPORTS` only
 * (MLB/NHL). It was scoped narrowly on purpose (its own comment: "a single
 * global bound would either miss this contamination or reject real football
 * lines") and its own author flagged the bound as "a conservative first
 * pass, not confirmed against production data" (AGENTS.md, C-119). That
 * leaves two real holes: (1) a bad quote that is anomalous RELATIVE TO THE
 * SAME GAME'S OTHER BOOKS but still inside the fixed bound (e.g. a lone -4.5
 * among ten books quoting -1 to -1.5) has no defense at all, and (2) sports
 * with genuinely wide, legitimate spread ranges (NFL/NCAAF/NBA/NCAAB) have
 * NO magnitude-bound guard whatsoever — a bad single-book quote there
 * (upstream mis-key, decimal/American mix, stale alt-line bleed) passes
 * straight through to `scoring.ts`'s `avgSpread` untouched.
 *
 * This module is scale-invariant instead of magnitude-bound: it compares
 * each book's quote to the CONTEMPORANEOUS median of every other book
 * quoting the SAME fixture and market, via the median-absolute-deviation
 * (MAD) based "modified z-score" (Iglewicz & Hoaglin, 1993). That matters
 * because `scoring.ts`'s own existing dispersion measure — `spreadOfSpreads`
 * (scoring.ts ~line 405-406, a plain mean/variance calculation) — is NOT
 * robust: a single 19.5 dragging a mean of eleven -1.5s also drags that same
 * mean's variance, so the very outlier it should reveal instead dilutes the
 * signal. Median and MAD barely move under one bad point, which is what
 * makes this catch the C-119 shape (one book wildly off, `n-1` books tightly
 * clustered) regardless of sport or magnitude.
 *
 * `apps/web/lib/truthmetrics/consensus-clock.ts`'s `measureDispersion`
 * (read in full before writing this) is adjacent but answers a different
 * question with different math: it folds the WHOLE group into one aggregate
 * dispersion number per time slice, using MEAN absolute deviation around the
 * MEAN (not robust — exactly the C-119 failure mode), to fit a market
 * "how fast did disagreement decay" half-life curve. It never identifies
 * WHICH book is the outlier, and it lives downstream in the gated-off
 * TruthMetrics narrative feature, not at ingestion time. This module is the
 * missing piece: a per-book, actionable, ingestion-time flag.
 *
 * DELIBERATELY NOT WIRED into `normalizer.ts` or any scoring path. This is a
 * pure diagnostic — flagging a book as a same-game outlier does not drop it,
 * does not adjust `avgSpread`, and does not touch a published pick's
 * line/confidence. Wiring it in (e.g. excluding flagged books before
 * `scoreSpreadPick` averages) is a scoring-path behavior change and needs
 * the founder-gated MODEL_VERSION sequencing already scheduled for after
 * 2026-09-13 (AGENTS.md) — this ships only the detection primitive plus a
 * read-only summary helper, for a human or a future gated caller to use.
 */

export interface CrossBookQuote {
  readonly bookmaker: string;
  readonly value: number;
}

export interface CrossBookOutlierResult extends CrossBookQuote {
  /** Cross-book median value (NaN when there weren't enough quotes to judge). */
  readonly median: number;
  /** Median absolute deviation from that median (NaN when not enough quotes). */
  readonly mad: number;
  /** Iglewicz & Hoaglin modified z-score: 0.6745 * (x - median) / MAD. */
  readonly modifiedZ: number;
  readonly flagged: boolean;
}

/** Iglewicz & Hoaglin's recommended modified-z cutoff for outlier flags. */
export const DEFAULT_MODIFIED_Z_THRESHOLD = 3.5;

/**
 * Below this many quotes, "is this one an outlier vs. the group" isn't a
 * meaningful question (e.g. with 2 quotes, either one is "the group" from
 * the other's perspective) — return every row unflagged rather than guess.
 */
export const MIN_QUOTES_TO_JUDGE = 4;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Flag quotes that are statistical outliers relative to the other quotes for
 * the SAME game+market, using a robust (median/MAD) measure instead of a
 * hardcoded magnitude bound. Pure function — no I/O, no sport awareness.
 *
 * Note on scope: pass values that are already directly comparable across
 * books. Spread points and total points qualify as-is. Raw American prices
 * do NOT (the sign flips discontinuously across the +100/-100 boundary,
 * e.g. -110 vs +105 are close in probability but far apart numerically) —
 * convert to implied or de-vigged probability first for price comparisons.
 */
export function detectCrossBookOutliers(
  quotes: readonly CrossBookQuote[],
  threshold: number = DEFAULT_MODIFIED_Z_THRESHOLD,
): CrossBookOutlierResult[] {
  const finiteValues = quotes.map((q) => q.value).filter((v) => Number.isFinite(v));

  if (finiteValues.length < MIN_QUOTES_TO_JUDGE) {
    return quotes.map((q) => ({ ...q, median: NaN, mad: NaN, modifiedZ: 0, flagged: false }));
  }

  const med = median(finiteValues);
  const mad = median(finiteValues.map((v) => Math.abs(v - med)));

  // Spread/total lines are quantized (half-point ticks), so it is common for
  // a plain majority (not just a unanimous board) to sit exactly at the
  // median — e.g. 4 of 6 books at -3, two others at -2.5/-3.5. That alone
  // makes MAD (the MEDIAN of deviations) collapse to 0 even though the group
  // has real, unremarkable dispersion. Dividing by that zero, or treating
  // every nonzero deviation as an outlier, would false-positive on ordinary
  // market noise. Iglewicz & Hoaglin's own fix for this degenerate case is to
  // fall back to the MEAN absolute deviation (still centered on the median)
  // with the matching normal-consistency constant 1.253314 in place of 0.6745.
  const meanAbsoluteDeviation =
    finiteValues.reduce((acc, v) => acc + Math.abs(v - med), 0) / finiteValues.length;

  return quotes.map((q) => {
    if (!Number.isFinite(q.value)) {
      return { ...q, median: med, mad, modifiedZ: 0, flagged: false };
    }
    if (mad === 0) {
      if (meanAbsoluteDeviation === 0) {
        // Every quote in the group is identical — no scale exists at all.
        // Any deviation from that unanimous value is meaningful by
        // definition, so report it distinctly rather than a manufactured
        // finite z-score.
        const deviates = q.value !== med;
        return { ...q, median: med, mad, modifiedZ: deviates ? Infinity : 0, flagged: deviates };
      }
      const modifiedZ = (q.value - med) / (1.253314 * meanAbsoluteDeviation);
      return { ...q, median: med, mad, modifiedZ, flagged: Math.abs(modifiedZ) > threshold };
    }
    const modifiedZ = (0.6745 * (q.value - med)) / mad;
    return { ...q, median: med, mad, modifiedZ, flagged: Math.abs(modifiedZ) > threshold };
  });
}

/** One flagged same-game-and-market outlier, for a plain-language summary. */
export interface OddsOutlierFlag {
  readonly gameExternalId: string;
  readonly market: "SPREADS" | "TOTALS";
  readonly bookmaker: string;
  readonly value: number;
  readonly groupMedian: number;
  readonly modifiedZ: number;
}

/**
 * Convenience wrapper over `detectCrossBookOutliers` for a real
 * `NormalizedOdds[]` batch (as produced by `DataNormalizer.normalizeOdds`)
 * covering one or many games. Groups by `gameExternalId`, judges SPREADS
 * (`spread`) and TOTALS (`total`) independently, and returns only the
 * flagged rows — a read-only summary a caller can log, alert on, or hand to
 * a future founder-gated exclusion step. Never mutates or returns the input
 * odds; does not touch H2H/price (see the price-comparison caveat above).
 */
export function findOddsOutliers(odds: readonly NormalizedOdds[]): OddsOutlierFlag[] {
  const flags: OddsOutlierFlag[] = [];

  for (const market of ["SPREADS", "TOTALS"] as const) {
    const field = market === "SPREADS" ? "spread" : "total";
    // Deduped so a batch spanning more than one fetch cycle (not how
    // process-sport.ts calls this today, but this is a reusable, not-yet-wired
    // utility a future caller could feed a wider batch) can never count the
    // SAME book's own odds more than once — that would silently corrupt the
    // median/MAD by treating one source's time series as several independent
    // books, exactly the kind of false-consensus shape this module exists to
    // catch in OTHER books. Keeps the LATEST `fetchedAt` reading per
    // (game, bookmaker), since that is the quote scoring.ts would actually use
    // for a fresh cycle. Nested by game first (not a composite string key) so
    // no delimiter-collision assumption is needed for gameExternalId/bookmaker.
    const latestByGameAndBookmaker = new Map<string, Map<string, { value: number; fetchedAt: Date }>>();

    for (const o of odds) {
      if (o.market !== market) continue;
      const value = o[field];
      if (value === undefined || value === null) continue;
      let byBookmaker = latestByGameAndBookmaker.get(o.gameExternalId);
      if (!byBookmaker) {
        byBookmaker = new Map();
        latestByGameAndBookmaker.set(o.gameExternalId, byBookmaker);
      }
      const existing = byBookmaker.get(o.bookmaker);
      if (!existing || o.fetchedAt.getTime() >= existing.fetchedAt.getTime()) {
        byBookmaker.set(o.bookmaker, { value, fetchedAt: o.fetchedAt });
      }
    }

    const byGame = new Map<string, { bookmaker: string; value: number }[]>();
    for (const [gameExternalId, byBookmaker] of latestByGameAndBookmaker) {
      byGame.set(
        gameExternalId,
        [...byBookmaker.entries()].map(([bookmaker, quote]) => ({ bookmaker, value: quote.value })),
      );
    }

    for (const [gameExternalId, quotes] of byGame) {
      const results = detectCrossBookOutliers(quotes);
      for (const r of results) {
        if (!r.flagged) continue;
        flags.push({
          gameExternalId,
          market,
          bookmaker: r.bookmaker,
          value: r.value,
          groupMedian: r.median,
          modifiedZ: r.modifiedZ,
        });
      }
    }
  }

  return flags;
}
