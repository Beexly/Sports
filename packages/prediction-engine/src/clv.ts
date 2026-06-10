// ============================================================
// Closing-Line Value (CLV) — pure math (v6, additive shadow)
//
// CLV is the honest, leak-free proof that the engine beats the market: it
// compares the bet-time line/price we published to the closing reference
// (the last fair price before kickoff). A consistently CLV-positive book is
// the strongest non-outcome evidence of genuine edge.
//
// This module is PURE — no DB, no I/O, fully unit-testable. It produces a
// signed CLV value where POSITIVE = the bet beat the close (we secured a
// better number/price than the market settled on). It returns `null` whenever
// the comparison can't be made honestly:
//   - either side of the comparison is missing, OR
//   - the closing snapshot is flagged stale (thin coverage / limit-down).
//
// IMPORTANT — nothing here feeds the published confidence/tier/grade/result
// or MODEL_VERSION. CLV is computed and stored separately as proof only.
// ============================================================

/**
 * The side of the bet, derived by the caller from Pick.pickType + selection.
 *   - SPREAD / MONEYLINE → "HOME" | "AWAY"
 *   - TOTAL              → "OVER" | "UNDER"
 *
 * Direction matters because a "better" number differs by side: a home-spread
 * bettor wants a more positive home line; an under bettor wants a higher total.
 */
export type ClvBetSide = "HOME" | "AWAY" | "OVER" | "UNDER";

export interface ComputeClvInput {
  /** The side the pick is on (drives the sign convention). */
  betSide: ClvBetSide;
  /**
   * Bet-time line at publish (Pick.line). For SPREAD it is the home-perspective
   * spread; for TOTAL it is the total points line. Pass null for moneyline-only
   * comparisons (where price is the meaningful axis).
   */
  betLine?: number | null;
  /** Closing line at the reference book, same convention as betLine. */
  closingLine?: number | null;
  /**
   * Bet-time American price for the selected side (e.g. -110, +145). Optional —
   * SPREAD/TOTAL picks may not carry a stored price (assumed standard vig), in
   * which case price CLV is simply not computed.
   */
  betPrice?: number | null;
  /** Closing American price for the selected side at the reference book. */
  closingPrice?: number | null;
  /**
   * When true, the closing snapshot was thin/limit-down and must be excluded.
   * Forces the whole computation to null (no gameable CLV from stale quotes).
   */
  isStale?: boolean;
}

export interface ClvResult {
  /**
   * Line CLV in points, signed so POSITIVE = bet beat the close. Null when
   * either line is missing.
   */
  clvPoints: number | null;
  /**
   * Price CLV in American-odds "cents", signed so POSITIVE = bet beat the
   * close (we locked a better price than it closed). Null when either price
   * is missing.
   */
  clvCents: number | null;
  /**
   * Overall verdict: did the bet beat the close? Prefers the line axis when
   * present, else the price axis. Null when neither axis is computable.
   */
  clvPositive: boolean | null;
}

/**
 * Signed line improvement in the bet's favor.
 *
 * Spread is stored from the HOME perspective:
 *   - HOME wants a more positive home line (more points) → favor = bet − close.
 *   - AWAY (away line = −homeLine) is best when the home line DROPS, so the
 *     away dog lays fewer / gets more points → favor = bet − close as well.
 *
 * Totals:
 *   - OVER wants a LOWER total   → favor = close − bet.
 *   - UNDER wants a HIGHER total → favor = bet − close.
 */
function signedLineFavor(
  betSide: ClvBetSide,
  betLine: number,
  closingLine: number
): number {
  switch (betSide) {
    case "HOME":
    case "AWAY":
    case "UNDER":
      return betLine - closingLine;
    case "OVER":
      return closingLine - betLine;
  }
}

/**
 * Signed American-price improvement in the bet's favor.
 *
 * For a fixed stake a higher payout is always better for the bettor, but the
 * raw American scale is discontinuous at ±100, so we convert to a continuous
 * payout proxy: profit on a 100-unit stake.
 *
 *   americanToProfitPer100(+150) = 150
 *   americanToProfitPer100(-110) = 100 * 100 / 110 ≈ 90.9
 *
 * Price CLV in cents is then the bet's payout minus the close's payout, so
 * POSITIVE means we locked a better price than the market closed at:
 *   clvCents = profitPer100(betPrice) − profitPer100(closingPrice)
 */
function americanToProfitPer100(american: number): number {
  if (american > 0) return american;
  // american < 0; |american| to win 100 stakes → profit per 100 staked
  return (100 * 100) / Math.abs(american);
}

/**
 * Compute Closing-Line Value for a single pick. Pure. Returns null on each
 * axis that cannot be honestly compared; clvPositive is null only when BOTH
 * axes are uncomputable (or the snapshot is stale).
 */
export function computeClv(input: ComputeClvInput): ClvResult {
  const NULL_RESULT: ClvResult = {
    clvPoints: null,
    clvCents: null,
    clvPositive: null,
  };

  // Stale / limit-down closing snapshots are excluded entirely — a thin or
  // frozen quote is not a fair "close" and would let CLV% be gamed.
  if (input.isStale) return NULL_RESULT;

  const hasLine =
    input.betLine != null &&
    input.closingLine != null &&
    Number.isFinite(input.betLine) &&
    Number.isFinite(input.closingLine);

  const hasPrice =
    input.betPrice != null &&
    input.closingPrice != null &&
    Number.isFinite(input.betPrice) &&
    Number.isFinite(input.closingPrice);

  const clvPoints = hasLine
    ? round2(signedLineFavor(input.betSide, input.betLine as number, input.closingLine as number))
    : null;

  const clvCents = hasPrice
    ? round2(
        americanToProfitPer100(input.betPrice as number) -
          americanToProfitPer100(input.closingPrice as number)
      )
    : null;

  // Verdict: prefer the line axis when present (it is the primary CLV signal
  // for spread/total picks), else fall back to the price axis (moneyline).
  let clvPositive: boolean | null = null;
  if (clvPoints !== null) clvPositive = clvPoints > 0;
  else if (clvCents !== null) clvPositive = clvCents > 0;

  return { clvPoints, clvCents, clvPositive };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// Rolling CLV-positive rate
// ============================================================

export interface ClvRateInput {
  /**
   * clvPositive verdict per settled pick. null/undefined entries (no CLV
   * computed) are ignored, so they never affect the denominator.
   */
  clvPositive: boolean | null | undefined;
  /** Set when CLV was computed; only picks with a verdict count toward the rate. */
  clvComputedAt?: Date | string | null;
}

export interface ClvRate {
  /** Picks with a computed CLV verdict (the denominator). */
  sampleSize: number;
  /** Picks that beat the close (clvPositive === true). */
  positiveCount: number;
  /**
   * Share of CLV-graded picks that beat the close, 0–100 rounded to 1 decimal.
   * Null when sampleSize is 0 (no fabricated rate from an empty sample).
   */
  clvPositiveRate: number | null;
}

/**
 * Rolling CLV-positive rate over a set of settled picks. Only picks with a
 * non-null clvPositive verdict (i.e. a real close existed and was fresh) are
 * counted, so a missing/stale close never silently inflates or deflates the
 * rate. Returns a null rate for an empty sample.
 */
export function computeClvPositiveRate(picks: readonly ClvRateInput[]): ClvRate {
  let sampleSize = 0;
  let positiveCount = 0;

  for (const p of picks) {
    if (p.clvPositive === null || p.clvPositive === undefined) continue;
    sampleSize++;
    if (p.clvPositive === true) positiveCount++;
  }

  const clvPositiveRate =
    sampleSize > 0
      ? Math.round((positiveCount / sampleSize) * 100 * 10) / 10
      : null;

  return { sampleSize, positiveCount, clvPositiveRate };
}

/**
 * Map a pick's pickType + selection to the CLV bet side. Mirrors the
 * settlement convention (calculatePickResult): a home pick contains the home
 * team name; totals start with "OVER"/"UNDER". Pure helper so the worker and
 * the read surface derive the side identically.
 */
export function clvBetSideFor(
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL",
  selection: string,
  homeTeamName: string
): ClvBetSide {
  if (pickType === "TOTAL") {
    return selection.trim().toUpperCase().startsWith("OVER") ? "OVER" : "UNDER";
  }
  return selection.includes(homeTeamName) ? "HOME" : "AWAY";
}
