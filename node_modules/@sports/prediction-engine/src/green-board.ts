/**
 * Green-Board Gate (GB-3, GB-4, GB-5)
 *
 * Decides which picks are eligible for the public green board.
 *
 * The board has tiers:
 *   - GREEN : calibratedP >= 0.70, >= 2 books, fresh, no dissent, no veto
 *   - PRIME : calibratedP >= 0.80, otherwise same as GREEN
 *   - PLUS  : calibratedP >= 0.90, bookmakerCount >= 3, otherwise same as PRIME
 *
 * "Beat the close" is the standard. CLV (Closing Line Value) is the
 * sharps' gold-standard credibility metric. The 52.4% beat rate at -110
 * is the breakeven. This module is purely the gate; CLV computation lives
 * in clv.ts.
 *
 * Pure functions only — no DB, no side effects, fully unit-testable.
 */

export type BoardTier = "GREEN" | "PRIME" | "PLUS";

export type VetoFlag =
  | "INJURY_REPORTED"
  | "LINEUP_LATE"
  | "WEATHER_SUSPENDED"
  | "BOOK_PULL"
  | "MARKET_HALTED"
  | (string & {}); // accepts other strings from legacy callers

/** Below this calibrated probability, the pick is not green-eligible. */
export const GREEN_P_MIN = 0.70;
/** Threshold for PRIME. */
export const PRIME_P_MIN = 0.80;
/** Threshold for PLUS. */
export const PLUS_P_MIN = 0.90;
/** Max number of books we require for GREEN / PRIME. */
export const GREEN_BOOKMAKER_MIN = 2;
/** PLUS needs more bookmaker coverage. */
export const PLUS_BOOKMAKER_MIN = 3;
/** Maximum allowed absolute deviation between any single independent
 *  source and the calibrated probability before the pick is vetoed. */
export const INDEPENDENT_DISSENT_BAND = 0.06;
/** Quote freshness window in seconds. */
export const FRESHNESS_WINDOW_SECONDS = 60;

export interface Independents {
  readonly elo: number | null;
  readonly poisson: number | null;
  readonly fpi: number | null;
}

export interface GreenGateInput {
  readonly calibratedP: number;
  readonly bookmakerCount: number;
  readonly freshnessOk: boolean;
  readonly independents: Independents;
  readonly vetoFlags: readonly VetoFlag[];
  /** Optional — when present, a non-empty drift report adds a reason. */
  readonly lastDriftCheck?: { readonly drifted: boolean; readonly note?: string } | null;
}

export interface GreenGateResult {
  readonly green: boolean;
  readonly tier: BoardTier | null;
  readonly reasons: readonly string[];
}

const VETO_REASONS: Readonly<Record<string, string>> = {
  INJURY_REPORTED: "VETO_INJURY_REPORTED",
  LINEUP_LATE: "VETO_LINEUP_LATE",
  WEATHER_SUSPENDED: "VETO_WEATHER_SUSPENDED",
  BOOK_PULL: "VETO_BOOK_PULL",
  MARKET_HALTED: "VETO_MARKET_HALTED",
};

/**
 * Returns the green-board eligibility decision.
 *
 * Reasons accumulate; the order is gate-then-veto so the consumer can
 * see which gate fired first.
 */
export function greenBoardEligible(input: GreenGateInput): GreenGateResult {
  const reasons: string[] = [];

  // Veto flags are absolute: any non-empty flag set fails the gate
  // immediately. We still record the rest of the gates in `reasons` so
  // the operator can see what *would* have failed.
  for (const flag of input.vetoFlags) {
    reasons.push(VETO_REASONS[flag] ?? "VETO_FLAGS");
  }

  if (input.calibratedP < GREEN_P_MIN) {
    reasons.push("GREEN_P_MIN");
  }
  if (input.calibratedP >= PLUS_P_MIN && input.bookmakerCount < PLUS_BOOKMAKER_MIN) {
    reasons.push("PLUS_BOOKMAKER_COUNT");
  }
  if (!input.freshnessOk) {
    reasons.push("FRESHNESS");
  }
  if (input.bookmakerCount < GREEN_BOOKMAKER_MIN) {
    reasons.push("BOOKMAKER_COUNT");
  }
  if (hasIndependentDissent(input.calibratedP, input.independents)) {
    reasons.push("INDEPENDENT_DISSENT");
  }
  if (input.lastDriftCheck?.drifted) {
    reasons.push("CALIBRATION_DRIFT");
  }

  if (reasons.length > 0) {
    return { green: false, tier: null, reasons };
  }

  // No failures — pick a tier. The "GREEN" reason is the legacy gate
  // marker; the tier field is the source of truth for which sub-tier
  // (GREEN / PRIME / PLUS) was awarded.
  const tier: BoardTier =
    input.calibratedP >= PLUS_P_MIN
      ? "PLUS"
      : input.calibratedP >= PRIME_P_MIN
        ? "PRIME"
        : "GREEN";
  return { green: true, tier, reasons: ["GREEN"] };
}

function hasIndependentDissent(
  calibratedP: number,
  independents: Independents,
): boolean {
  return (
    dissentFor(calibratedP, independents.elo) ||
    dissentFor(calibratedP, independents.poisson) ||
    dissentFor(calibratedP, independents.fpi)
  );
}

function dissentFor(calibratedP: number, sourceP: number | null): boolean {
  if (sourceP == null) return false;
  return Math.abs(calibratedP - sourceP) > INDEPENDENT_DISSENT_BAND;
}
