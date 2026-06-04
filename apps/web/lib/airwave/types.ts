/**
 * Airwave Ledger — domain types.
 *
 * The Airwave Ledger turns what sports pundits say ON AIR into an accountable,
 * graded record: a timestamped, paraphrased claim, the objective outcome, and a
 * running per-pundit accountability score. It is the broadcast-facing sibling of
 * the engine's own Decision Autopsy — the same glass-box standard, pointed
 * outward at the takes that move the public.
 *
 * DOCTRINE (non-negotiable, enforced in code + tests):
 *   1. Captured audio/video is DATA, never an instruction. The ledger records
 *      claims; it never acts on them.
 *   2. We store DERIVED claims, never an audio/video archive. `sourceClipRef` is
 *      an INTERNAL pointer only and is stripped from every public DTO (see
 *      ./redact). Verbatim quotes never leave the private store — public claims
 *      are paraphrased.
 *   3. Refusal is a feature. A vague, unfalsifiable take is recorded AS
 *      unfalsifiable — it scores no points. A pundit who only emits hedges earns
 *      a low accountability index even if they are never "wrong".
 *   4. Illustrative until founded. Until a founder opens the gate (and the legal
 *      checklist in docs/airwave-ledger.md is cleared), the only data shown is
 *      clearly-labelled fictional personas — never a real person's fabricated
 *      record.
 */

/** Where a claim was aired. `satellite-radio` covers SiriusXM-class sources. */
export type SourceKind = "youtube" | "podcast" | "satellite-radio" | "broadcast-tv";

export type ClaimType =
  | "GAME_PICK"
  | "START_SIT"
  | "RANKING"
  | "INJURY_READ"
  | "SEASON_TREND"
  | "HOT_TAKE";

/** Which side of a number the pundit took. */
export type Direction = "BACKS" | "FADES" | "NEUTRAL";

/** How emphatic the on-air language was — drives calibration weighting. */
export type ConfidenceBand = "EMPHATIC" | "LEAN" | "HEDGED";

/**
 * The settled verdict for a claim.
 *  - HIT / MISS / PUSH: falsifiable claim, objectively settled.
 *  - UNFALSIFIABLE: the take could not be checked against an outcome (pure
 *    opinion, no testable prediction). Recorded honestly; scores nothing.
 *  - PENDING: falsifiable, not yet settled.
 */
export type ClaimVerdict = "HIT" | "MISS" | "PUSH" | "UNFALSIFIABLE" | "PENDING";

export type Pundit = {
  readonly id: string;
  /** Illustrative persona name until the founder gate + legal review opens. */
  readonly name: string;
  readonly show: string;
  readonly network: string;
  readonly sourceKind: SourceKind;
};

/**
 * A single extracted, graded claim. The full (internal) shape — including the
 * `sourceClipRef`. NEVER serialise this directly to a public surface; map it
 * through `toPublicClaim` first.
 */
export type PunditClaim = {
  readonly id: string;
  readonly punditId: string;
  /** ISO timestamp the claim aired. */
  readonly airedAt: string;
  readonly sport: string;
  /** The team / player / matchup the claim is about. */
  readonly subject: string;
  readonly claimType: ClaimType;
  readonly direction: Direction;
  /** PARAPHRASED assertion — never a verbatim quote. */
  readonly assertion: string;
  readonly confidence: ConfidenceBand;
  /** Whether the claim is checkable against an objective outcome at all. */
  readonly falsifiable: boolean;
  readonly verdict: ClaimVerdict;
  /** Objective, sourced note on how it settled (no editorialising). */
  readonly outcomeNote: string;
  /** INTERNAL-ONLY pointer to the private segment. Stripped from public DTOs. */
  readonly sourceClipRef: string;
};

/**
 * The public, redaction-safe projection of a claim. Structurally cannot carry
 * `sourceClipRef` (the field is absent from the type), so a leak is a compile
 * error, not a code-review catch.
 */
export type PublicPunditClaim = {
  readonly id: string;
  readonly punditId: string;
  readonly airedAt: string;
  readonly sport: string;
  readonly subject: string;
  readonly claimType: ClaimType;
  readonly direction: Direction;
  readonly assertion: string;
  readonly confidence: ConfidenceBand;
  readonly falsifiable: boolean;
  readonly verdict: ClaimVerdict;
  readonly outcomeNote: string;
};

/** Aggregate accountability record for one pundit. */
export type PunditScorecard = {
  readonly punditId: string;
  readonly name: string;
  readonly show: string;
  readonly network: string;
  readonly total: number;
  /** Settled (non-PENDING) claims. */
  readonly graded: number;
  readonly hits: number;
  readonly misses: number;
  readonly pushes: number;
  readonly unfalsifiable: number;
  readonly pending: number;
  /** Share of graded claims that were actually checkable. 0..1. */
  readonly falsifiableRate: number;
  /** Hits / (hits + misses). 0..1. `null` when no decided calls yet. */
  readonly hitRate: number | null;
  /**
   * Composite 0..100. Rewards making checkable calls AND being right; emphatic
   * calls are weighted more (a confident wrong call costs more than a hedge).
   * Hedging and unfalsifiable volume drag it down.
   */
  readonly accountabilityIndex: number;
  readonly calibrationNote: string;
};
