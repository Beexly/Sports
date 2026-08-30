/**
 * BookGrade + PulseScore v1
 *
 * Transcribed exactly from:
 *   docs/ops/hermes/l18-book-metrics/RESULTS.md
 *
 * ONLY totals-market numbers are included for BookGrade.
 * Spread-market BPQI is intentionally excluded from this file: spread
 * BPQI is large because books post different spread *numbers*, not
 * because of vig shade. A same-line filter would be required before
 * spread BPQI could be treated as price quality, and that work is not
 * done yet. Moneyline BPQI is also omitted for now; it will be reviewed
 * when/if L-16/C-41 is re-opened.
 *
 * Provenance: 241 MLB clean-close games, 2026-05-22 to 2026-08-20,
 * pre-close snapshots only, Shin no-vig reference, clustered by game.
 * Method one-liner: mean(p_book - p_median_close), clustered SE.
 */

export interface BookGradeRow {
  readonly book: string;
  readonly bpqi: number;
  readonly se: number;
  readonly clusteredT: number;
  readonly snapshots: number;
  readonly games: number;
}

export interface PulseScoreRow {
  readonly book: string;
  readonly burs: number;
}

export const BOOKGRADE_V1: readonly BookGradeRow[] = [
  {
    book: "fanatics",
    bpqi: -0.00210,
    se: 0.00102,
    clusteredT: -2.05,
    snapshots: 11108,
    games: 227,
  },
  {
    book: "betus",
    bpqi: 0.00210,
    se: 0.00108,
    clusteredT: 1.95,
    snapshots: 9124,
    games: 241,
  },
  {
    book: "betmgm",
    bpqi: -0.00185,
    se: 0.00095,
    clusteredT: -1.94,
    snapshots: 10608,
    games: 241,
  },
  {
    book: "lowvig",
    bpqi: 0.00228,
    se: 0.00118,
    clusteredT: 1.93,
    snapshots: 11590,
    games: 240,
  },
  {
    book: "betrivers",
    bpqi: -0.00203,
    se: 0.00105,
    clusteredT: -1.93,
    snapshots: 9482,
    games: 241,
  },
  {
    book: "williamhill_us",
    bpqi: 0.00195,
    se: 0.00105,
    clusteredT: 1.87,
    snapshots: 11229,
    games: 227,
  },
  {
    book: "betonlineag",
    bpqi: 0.00203,
    se: 0.00116,
    clusteredT: 1.75,
    snapshots: 11593,
    games: 240,
  },
  {
    book: "fanduel",
    bpqi: -0.00159,
    se: 0.00115,
    clusteredT: -1.39,
    snapshots: 12059,
    games: 241,
  },
  {
    book: "draftkings",
    bpqi: -0.00112,
    se: 0.00097,
    clusteredT: -1.15,
    snapshots: 11447,
    games: 241,
  },
  {
    book: "mybookieag",
    bpqi: -0.00079,
    se: 0.00100,
    clusteredT: -0.79,
    snapshots: 10920,
    games: 241,
  },
  {
    book: "bovada",
    bpqi: -0.00073,
    se: 0.00107,
    clusteredT: -0.68,
    snapshots: 10255,
    games: 241,
  },
];

export const PULSE_SCORE_V1: readonly PulseScoreRow[] = [
  {
    book: "mybookieag",
    burs: 0.510,
  },
  {
    book: "betrivers",
    burs: 0.213,
  },
  {
    book: "draftkings",
    burs: 0.169,
  },
  {
    book: "betmgm",
    burs: 0.119,
  },
  {
    book: "fanatics",
    burs: 0.116,
  },
  {
    book: "bovada",
    burs: 0.109,
  },
  {
    book: "betus",
    burs: 0.083,
  },
  {
    book: "lowvig",
    burs: 0.093,
  },
  {
    book: "betonlineag",
    burs: 0.092,
  },
  {
    book: "fanduel",
    burs: 0.070,
  },
  {
    book: "williamhill_us",
    burs: 0.061,
  },
];

export const BOOKGRADE_PROVENANCE = {
  games: 241,
  dateRange: "2026-05-22 to 2026-08-20",
  market: "MLB totals",
  snapshots: "pre-close only",
  method: "mean(p_book - p_median_close), Shin no-vig reference, clustered by game",
} as const;
