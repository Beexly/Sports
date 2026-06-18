/**
 * Edge-type taxonomy v1 — the named kinds of mispricing we claim to exploit.
 *
 * WHAT THIS IS
 * A pure registry + tagger that labels a candidate pick with the KIND of edge it
 * is acting on, so per-type reliability can later accrue (win-rate loop step 13).
 * It is the vocabulary defined in reports/reality-engine/edge-type-taxonomy-v1.md
 * — 13 named types, each annotated with whether its detecting signal exists in the
 * data we already store (`detectableNow`) and what signals that detection needs.
 *
 * WHY IT IS INERT
 * An edge *type* is a hypothesis about WHY we have an edge — it is NOT proof of one.
 * This module does not score, rank, gate, or price anything. It is additive and is
 * NOT imported by scoring.ts or any live path. A pick tagged `market-overcorrection`
 * is a claim to be validated by its CLV and result, never a fact asserted here.
 *
 * HONESTY GUARDS (mirroring conviction-tier.ts)
 * - Only the three FULLY-DETECTABLE-NOW types fire from signals we actually have:
 *   book-disagreement-lag, market-overcorrection, and the honest default
 *   no-clear-edge. Everything else is data-blocked.
 * - Data-blocked types are NEVER returned as positives — they are surfaced as
 *   `requiresData` CANDIDATES (named, with their unlock signals), so we record the
 *   leverage point without fabricating a detection we cannot make.
 * - Insufficient/invalid signal collapses to `no-clear-edge` (or `null` when there
 *   is no usable market read at all) — we never guess a type to look smart.
 *
 * Pure functions, no I/O — fully unit-testable. All probabilities are in [0, 1].
 */

import type { EdgeDecision, AnchorAgreement } from "./edge-engine.js";

/** The 13 v1 edge types (12 named mispricings + the honest `no-clear-edge` default). */
export type EdgeType =
  | "stale-injury-price"
  | "derivative-market-lag"
  | "book-disagreement-lag"
  | "market-overcorrection"
  | "public-narrative-distortion"
  | "scheme-mismatch"
  | "player-usage-role-change"
  | "weather-underreaction"
  | "ol-dl-mismatch"
  | "pace-game-script-mismatch"
  | "coach-tendency-mispricing"
  | "prop-threshold-mispricing"
  | "no-clear-edge";

/** Data-status legend from the taxonomy doc: signal we HAVE, PARTIAL proxy, or MISSING feed. */
export type EdgeDataStatus = "HAVE" | "PARTIAL" | "MISSING";

/** One registry entry: definition + whether it is detectable today + the signals it needs. */
export interface EdgeTypeSpec {
  readonly type: EdgeType;
  /** One-line definition (from the taxonomy doc). */
  readonly definition: string;
  /**
   * True ONLY for types whose detecting signal exists in data we already store
   * and whose detection is implemented in `tagEdgeType`. The taxonomy marks three
   * such types HAVE; the others are PARTIAL/MISSING and are never auto-tagged.
   */
  readonly detectableNow: boolean;
  /** Data status from the taxonomy: HAVE / PARTIAL / MISSING. */
  readonly dataStatus: EdgeDataStatus;
  /** The signals required to detect this type (the unlock path for blocked ones). */
  readonly requiredSignals: readonly string[];
  /** Typical market(s) this edge lives in. */
  readonly market: string;
}

/**
 * The v1 registry, in the taxonomy doc's order. `detectableNow` is true for the
 * three HAVE types only (book-disagreement-lag, market-overcorrection,
 * no-clear-edge); the PARTIAL/MISSING types carry their unlock signals so the
 * leverage point is recorded without claiming a detection we cannot make.
 */
export const EDGE_TYPES: readonly EdgeTypeSpec[] = [
  {
    type: "stale-injury-price",
    definition:
      "A book hasn't moved its line after a meaningful injury/scratch; we price the injury before the book does.",
    detectableNow: false,
    dataStatus: "MISSING",
    requiredSignals: ["injuryStatusFeedTimestamp", "lastOddsMoveTimestamp"],
    market: "ML, SPREAD",
  },
  {
    type: "derivative-market-lag",
    definition:
      "The main market moved but a derived market (team total, alt line, first-half) hasn't repriced to match.",
    detectableNow: false,
    dataStatus: "PARTIAL",
    requiredSignals: ["mainMarketLine", "derivativeMarketLine"],
    market: "TOTAL, SPREAD, PROP",
  },
  {
    type: "book-disagreement-lag",
    definition:
      "Sharp book has moved; a softer book lags at the old number — we take the soft price before it catches up.",
    detectableNow: true,
    dataStatus: "HAVE",
    requiredSignals: ["homeProbDispersion", "consensusFairProb"],
    market: "SPREAD, TOTAL, ML",
  },
  {
    type: "market-overcorrection",
    definition:
      "The line moved too far on a piece of news (sharp/steam overshoot); the closing line drifts back.",
    detectableNow: true,
    dataStatus: "HAVE",
    requiredSignals: ["lineMovementMagnitude", "lineMovementReversal"],
    market: "SPREAD, TOTAL",
  },
  {
    type: "public-narrative-distortion",
    definition:
      "Public money on a popular team/narrative inflates one side; fair value sits on the unpopular side.",
    detectableNow: false,
    dataStatus: "PARTIAL",
    requiredSignals: ["ticketHandleSplit", "narrativeSignal"],
    market: "ML, SPREAD",
  },
  {
    type: "scheme-mismatch",
    definition:
      "A matchup-specific tactical edge the line doesn't fully price.",
    detectableNow: false,
    dataStatus: "PARTIAL",
    requiredSignals: ["opponentAdjustedEfficiency", "schemeTags"],
    market: "SPREAD, TOTAL",
  },
  {
    type: "player-usage-role-change",
    definition:
      "A player's role/usage has shifted and the prop/total hasn't repriced.",
    detectableNow: false,
    dataStatus: "MISSING",
    requiredSignals: ["playerUsageSnapShare", "usageChangePoint"],
    market: "PROP, TOTAL",
  },
  {
    type: "weather-underreaction",
    definition:
      "Wind/precip/cold should depress a total more than the market has priced.",
    detectableNow: false,
    dataStatus: "MISSING",
    requiredSignals: ["weatherFeed", "venueNorms"],
    market: "TOTAL",
  },
  {
    type: "ol-dl-mismatch",
    definition:
      "Offensive-line vs defensive-line strength gap the line underweights; drives rush totals, game script.",
    detectableNow: false,
    dataStatus: "MISSING",
    requiredSignals: ["lineUnitGrades", "opponentLineUnitGrades"],
    market: "SPREAD, TOTAL",
  },
  {
    type: "pace-game-script-mismatch",
    definition:
      "Expected pace / game-script mis-set, distorting the total.",
    detectableNow: false,
    dataStatus: "PARTIAL",
    requiredSignals: ["paceEstimate", "winProbabilitySpread"],
    market: "TOTAL",
  },
  {
    type: "coach-tendency-mispricing",
    definition:
      "A coach's situational tendency the market doesn't capture.",
    detectableNow: false,
    dataStatus: "MISSING",
    requiredSignals: ["coachTendencyPrior"],
    market: "SPREAD, TOTAL, PROP",
  },
  {
    type: "prop-threshold-mispricing",
    definition:
      "A player-prop line sits on the wrong side of a meaningful threshold given the player's distribution.",
    detectableNow: false,
    dataStatus: "MISSING",
    requiredSignals: ["playerProjectionDistribution", "propLine"],
    market: "PROP",
  },
  {
    type: "no-clear-edge",
    definition:
      "The honest default: model and devigged market agree within tolerance — no edge.",
    detectableNow: true,
    dataStatus: "HAVE",
    requiredSignals: ["assessEdgeDecision"],
    market: "all",
  },
];

/** The three types the taxonomy marks fully detectable today (HAVE). */
export const DETECTABLE_NOW_TYPES: readonly EdgeType[] = EDGE_TYPES.filter(
  (s) => s.detectableNow,
).map((s) => s.type);

/** Look up a registry entry by type. */
export function getEdgeTypeSpec(type: EdgeType): EdgeTypeSpec | undefined {
  return EDGE_TYPES.find((s) => s.type === type);
}

/**
 * Signals we ACTUALLY have at tag time — all derived from data already stored
 * (multi-book odds + the timestamped Odds history). Anything not supplied is
 * treated as absent; absence never fabricates a positive tag.
 */
export interface EdgeTypeSignals {
  /**
   * Independent edge decision from edge-engine.ts (assessEdge). Drives the honest
   * no-clear-edge default: PASS / NONE agreement → no demonstrable edge.
   */
  readonly edgeDecision?: EdgeDecision;
  /** Independent-estimator agreement from assessEdge. */
  readonly edgeAgreement?: AnchorAgreement;
  /**
   * Cross-book dispersion of de-vigged P(home) in the CURRENT snapshot
   * (`homeProbDispersion` from consensusNoVig). High dispersion = one book lagging
   * the consensus → book-disagreement-lag.
   */
  readonly homeProbDispersion?: number | null;
  /** How many books the dispersion is measured across (a one-book read is not disagreement). */
  readonly bookCount?: number | null;
  /**
   * Magnitude of the opener→current line move (absolute), in line units or prob
   * points. A large move is the precondition for an overcorrection read.
   */
  readonly lineMovementMagnitude?: number | null;
  /**
   * Signed retrace AFTER the initial move (opposite sign to the move) — the close
   * drifting back toward the opener. Present + meaningful → market-overcorrection.
   */
  readonly lineMovementReversal?: number | null;
}

/** A data-blocked type we could detect if its unlock signals existed — recorded, not fired. */
export interface RequiresDataCandidate {
  readonly type: EdgeType;
  readonly dataStatus: EdgeDataStatus;
  readonly requiredSignals: readonly string[];
}

export interface EdgeTypeTag {
  /**
   * The tagged type, or null when there is no usable market read at all (no edge
   * decision AND no dispersion AND no line-movement signal supplied).
   */
  readonly type: EdgeType | null;
  /** True only when `type` is one of the fully-detectable-now (HAVE) types. */
  readonly detectableNow: boolean;
  /** Plain-language reason for the tag (auditable, never a certainty claim). */
  readonly reason: string;
  /**
   * The PARTIAL/MISSING types that COULD apply but cannot be detected today, named
   * with their unlock signals. These are leverage points, never positives.
   */
  readonly requiresData: readonly RequiresDataCandidate[];
}

/** Minimum cross-book dispersion (in P(home) MAD) that reads as a book lagging the consensus. */
export const BOOK_DISAGREEMENT_DISPERSION = 0.03;
/** A disagreement read needs at least this many books — one book is not a disagreement. */
export const MIN_BOOKS_FOR_DISAGREEMENT = 3;
/** Minimum opener→current move magnitude that can qualify as an overcorrection precondition. */
export const OVERCORRECTION_MIN_MOVE = 0.5;
/** Minimum retrace (opposite the move) that reads as the line drifting back. */
export const OVERCORRECTION_MIN_REVERSAL = 0.25;

function isFiniteNum(x: number | null | undefined): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** The data-blocked types, pre-built as candidates (everything not detectable now). */
const REQUIRES_DATA_CANDIDATES: readonly RequiresDataCandidate[] = EDGE_TYPES.filter(
  (s) => !s.detectableNow && s.type !== "no-clear-edge",
).map((s) => ({
  type: s.type,
  dataStatus: s.dataStatus,
  requiredSignals: s.requiredSignals,
}));

/**
 * Tag a candidate pick with the kind of edge it is acting on, from signals we
 * actually have. Only the three detectable-now types can fire as positives
 * (book-disagreement-lag, market-overcorrection) plus the honest no-clear-edge
 * default; every data-blocked type is returned in `requiresData` as a named
 * candidate, never as a false positive. Returns `type: null` only when there is no
 * usable market read at all. This is a hypothesis tag, not proof of an edge.
 */
export function tagEdgeType(signals: EdgeTypeSignals): EdgeTypeTag {
  const requiresData = REQUIRES_DATA_CANDIDATES;

  const hasDispersion =
    isFiniteNum(signals.homeProbDispersion) &&
    isFiniteNum(signals.bookCount) &&
    (signals.bookCount as number) >= MIN_BOOKS_FOR_DISAGREEMENT;
  const hasMove = isFiniteNum(signals.lineMovementMagnitude);
  const hasReversal = isFiniteNum(signals.lineMovementReversal);
  const hasEdgeRead = signals.edgeDecision !== undefined;

  // No usable read of any kind → null, not a guessed type.
  if (!hasDispersion && !hasMove && !hasEdgeRead) {
    return {
      type: null,
      detectableNow: false,
      reason:
        "No usable market read supplied (no edge decision, no cross-book dispersion, no line movement) — cannot tag honestly.",
      requiresData,
    };
  }

  // market-overcorrection: a large move FOLLOWED BY a meaningful retrace back.
  // The reversal must oppose the move (close drifting back toward the opener).
  if (
    hasMove &&
    hasReversal &&
    Math.abs(signals.lineMovementMagnitude as number) >= OVERCORRECTION_MIN_MOVE &&
    Math.abs(signals.lineMovementReversal as number) >= OVERCORRECTION_MIN_REVERSAL
  ) {
    return {
      type: "market-overcorrection",
      detectableNow: true,
      reason: `Line moved ${Math.abs(signals.lineMovementMagnitude as number)} then retraced ${Math.abs(
        signals.lineMovementReversal as number,
      )} — overshoot drifting back (detectable from stored Odds history).`,
      requiresData,
    };
  }

  // book-disagreement-lag: one book diverges from the consensus in the current snapshot.
  if (hasDispersion && (signals.homeProbDispersion as number) >= BOOK_DISAGREEMENT_DISPERSION) {
    return {
      type: "book-disagreement-lag",
      detectableNow: true,
      reason: `Cross-book dispersion ${signals.homeProbDispersion} across ${signals.bookCount} books exceeds ${BOOK_DISAGREEMENT_DISPERSION} — a softer book lagging the consensus (detectable from multi-book odds).`,
      requiresData,
    };
  }

  // Honest default: the edge engine sees no demonstrable edge (or no usable
  // divergence signal) → no-clear-edge. This is the most common, correct tag.
  return {
    type: "no-clear-edge",
    detectableNow: true,
    reason: hasEdgeRead
      ? `Independent edge decision is ${signals.edgeDecision} (agreement ${signals.edgeAgreement ?? "NONE"}) — model and devigged market agree within tolerance; no demonstrable edge.`
      : "No detectable-now edge signal cleared its threshold — defaulting to no-clear-edge rather than guessing a type.",
    requiresData,
  };
}
