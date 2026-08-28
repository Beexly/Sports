/**
 * Green Board eligibility predicate.
 *
 * Decides whether a settled-published pick earns a slot on the
 * "Green Board" (the public selective board) and, if so, which tier
 * (PRIME ≥ 0.80 or GREEN 0.70–0.80). Pure function over typed input —
 * no I/O, no clock, no random, no global state. The read-side
 * (`/api/picks?lane=green` and `/green` page) maps persisted pick
 * fields to {@link GreenGateInput} and calls this function. The
 * retroactive record (see GB-4) calls it the same way over
 * already-settled picks.
 *
 * Gate semantics (all four must pass for the pick to be GREEN):
 *   G1 Probability floor      calibratedP ≥ {@link GREEN_P_MIN} (0.70)
 *   G2 Market depth           bookmakerCount ≥ 2 AND freshnessOk
 *   G3 Independent dissent   any PRESENT independent more than
 *                             {@link INDEPENDENT_DISSENT_BAND} (6pts)
 *                             below calibratedP → veto. Absent
 *                             independents are NOT a veto and NOT a
 *                             boost — honest miss, not a penalty.
 *   G4 Situation clean        vetoFlags array is empty. The flags
 *                             come from {@link sitrepVetoes} (GB-2).
 *
 * Tier assignment (only when green === true):
 *   calibratedP ≥ {@link PRIME_P_MIN} (0.80) → "PRIME"
 *   otherwise                                → "GREEN"
 *   when green === false                     → null
 *
 * Reasons array (clause-scoped, never batched):
 *   failed gate  → ["G1"], ["G2"], ["G3"], ["G4"], or any subset
 *   all pass     → ["GREEN"]
 *
 * Strict-greater at G3: an independent exactly INDEPENDENT_DISSENT_BAND
 * below calibratedP is NOT a veto. "More than 6pts under" is the
 * literal rule; this is the conservative read.
 *
 * @see docs/ops/hermes/GREEN-BOARD-DISPATCH-2026-08-28.md §GB-1
 * @see docs/ops/hermes/GB-RECON-2026-08-28.md §1.1
 * @see docs/strategy/GREEN-BOARD-DOCTRINE.md
 */

/** Probability floor for any Green Board slot. Board average target ≥ 0.72. */
export const GREEN_P_MIN = 0.70;

/** Probability floor for the PRIME sub-tier. */
export const PRIME_P_MIN = 0.80;

/**
 * Maximum tolerated gap between calibratedP and any present independent
 * (elo, poisson, fpi). Strict-greater than this is a veto; exactly this
 * is not.
 */
export const INDEPENDENT_DISSENT_BAND = 0.06;

/** One source's independent probability. `null` = absent (honest miss). */
export type IndependentProb = number | null | undefined;

/**
 * Independent model votes. `null` means the source had no signal to give
 * for this pick (off-season, sport not covered, data quality fail). It is
 * NEVER a default; the resolver upstream is responsible for the `null`.
 */
export interface Independents {
  /** Elo-derived win probability (NFL, NBA, NHL, etc.). */
  elo?: IndependentProb;
  /** Poisson / Dixon-Coles derived win probability (soccer, NHL). */
  poisson?: IndependentProb;
  /** FPI / power-rating derived win probability. */
  fpi?: IndependentProb;
}

/**
 * Input to {@link greenBoardEligible}. The read-side resolver maps
 * persisted fields to this shape; the function trusts the caller for
 * domain validity (calibratedP in [0,1], bookmakerCount ≥ 0). NaN or
 * non-finite values are treated as failing the relevant gate.
 */
export interface GreenGateInput {
  /** Clean de-vigged consensus probability, 0–1. After P-0 lands, this
   *  is `modelProb` not `confidence`. Until then it is the resolver's
   *  best heuristic — see the P-0 hotspot in GREEN-BOARD-DISPATCH §2.1. */
  calibratedP: number;
  /** Distinct bookmakers contributing to the line. */
  bookmakerCount: number;
  /** True if the latest snapshot is within the freshness SLA. */
  freshnessOk: boolean;
  /** Independent model votes. */
  independents: Independents;
  /** Hard vetoes from the SITREP v1 extractor (GB-2). Empty = clean. */
  vetoFlags: readonly string[];
}

/** The tier a pick earns on the Green Board. */
export type BoardTier = "PRIME" | "GREEN" | null;

/** Result of {@link greenBoardEligible}. */
export interface GreenGateResult {
  /** The tier: "PRIME" ≥ 0.80, "GREEN" 0.70–0.80, or null when not green. */
  tier: BoardTier;
  /** True iff all four gates pass. */
  green: boolean;
  /**
   * Gate trace. Names every gate that failed ("G1".."G4"), or `["GREEN"]`
   * when all pass. The single-element "GREEN" marker is intentional —
   * it lets the read-side render "this pick earned the lane" without
   * needing to consult the boolean.
   */
  reasons: readonly string[];
}

/**
 * Decide if a pick belongs on the Green Board and at what tier.
 *
 * Pure. No I/O. Safe to call in read-side, retro, and tests. Does not
 * validate domain bounds (the resolver is responsible); NaN or
 * non-finite `calibratedP` is treated as failing G1.
 *
 * @param input the gate input (see {@link GreenGateInput})
 * @returns tier, green, reasons
 */
export function greenBoardEligible(input: GreenGateInput): GreenGateResult {
  const reasons: string[] = [];

  // G1: probability floor. NaN / non-finite fails this gate.
  const p = input.calibratedP;
  if (!Number.isFinite(p) || p < GREEN_P_MIN) {
    reasons.push("G1");
  }

  // G2: market depth. Either a single book or stale data fails this gate.
  if (!(input.bookmakerCount >= 2 && input.freshnessOk)) {
    reasons.push("G2");
  }

  // G3: independent dissent. Absent values are skipped (NOT a veto, NOT a boost).
  // An independent strictly more than INDEPENDENT_DISSENT_BAND below p* is a veto.
  const { elo, poisson, fpi } = input.independents;
  const presentIndependents: number[] = [];
  for (const ind of [elo, poisson, fpi]) {
    if (typeof ind === "number" && Number.isFinite(ind)) {
      presentIndependents.push(ind);
    }
  }
  const dissentThreshold = p - INDEPENDENT_DISSENT_BAND;
  const dissent =
    presentIndependents.length > 0 &&
    presentIndependents.some((ind) => ind < dissentThreshold);
  if (dissent) {
    reasons.push("G3");
  }

  // G4: SITREP vetoes. Any non-empty vetoFlags fails this gate.
  if (input.vetoFlags.length > 0) {
    reasons.push("G4");
  }

  const green = reasons.length === 0;
  let tier: BoardTier = null;
  if (green) {
    tier = p >= PRIME_P_MIN ? "PRIME" : "GREEN";
    // Reasons collapse to the single "GREEN" marker when all pass.
    reasons.length = 0;
    reasons.push("GREEN");
  }

  return { tier, green, reasons: reasons as readonly string[] };
}
