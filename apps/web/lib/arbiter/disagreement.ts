/**
 * Path disagreement: the pure, measurable question the arbiter is asked.
 *
 * THE TWO PATHS THIS FILE NAMES
 * ------------------------------
 * GSE writes a pick from two different producers, and they do not agree:
 *
 *   1. The REASONING path. `packages/ingestion-pipeline/src/generate-signal-slate.ts`
 *      mints an independent fair value from model sources (Kalshi, FPI, ClubElo,
 *      Poisson, Dixon-Coles, Elo) with NO book behind it. Its defining fact is
 *      `bookmakerCount === 0` and a selection tagged with the
 *      `(model signal)` suffix. Measured 2026-09-13 onward, its confidence bands
 *      track reality closely (60-69 -> 57.0%, 70-79 -> 66.0%, 80-89 -> 67.8%),
 *      so it is trustworthy WITHIN its bands.
 *
 *   2. The LEGACY path. `packages/ingestion-pipeline/src/process-sport.ts` feeds
 *      `packages/prediction-engine/src/scoring.ts`, whose confidence is a
 *      heuristic weighted sum of book-derived factors. Its bands are measured
 *      INVERTED at the top: 80-89 -> 41.5% and 90-99 -> 31.2% real hit rate, so
 *      a 95 there means LESS than a 65. It is a genuinely different estimator,
 *      not a worse copy of the same one.
 *
 * They collide because `picks` carries `@@unique([gameId, pickType])`: for one
 * fixture and one market only ONE row can survive, so whichever producer writes
 * second overwrites the other, and a reader cannot see that a disagreement ever
 * happened. `model-signal-coherence.ts` already suppresses the duplicate at
 * DISPLAY time, but it is a viewer-scoped filter that writes nothing, so the
 * collision itself leaves no record.
 *
 * WHAT COUNTS AS A DISAGREEMENT HERE
 * ----------------------------------
 * Only the two ways these paths can actually contradict each other on a
 * fixture, both derived from persisted columns rather than from a narrative:
 *
 *   SIDE_CONFLICT    The two rows name different sides of the same contest. This
 *                    is the Bears/Panthers case measured on 2026-09-13: a
 *                    SPREAD on Chicago -3.0 beside a MONEYLINE on Carolina. Two
 *                    opposite positions, both sellable, on one game.
 *   CONFIDENCE_CLASH The two rows back the SAME side but disagree about how
 *                    strong it is by more than the bands can absorb. Because the
 *                    legacy bands are measured inverted, "the legacy row is more
 *                    confident" does NOT mean "the legacy row is more right", and
 *                    an arbiter that cannot see that will just average.
 *
 * WHY DIFFERENT MARKETS ARE STILL ADJUDICATED. A SPREAD and a MONEYLINE are
 * different questions in the abstract, so a naive detector would call that pair
 * out of scope and the detector would MISS the exact collision found in
 * production: the reasoning path wrote "Carolina Panthers ML (model signal)"
 * onto a game that already carried a book-priced "Chicago Bears -3.0", while its
 * own reasoning string read "Model signal (no book line)". Two claims about one
 * fixture, one of which asserts the other does not exist. The out-of-scope rule
 * is applied only when the two rows are in the same market (where they are
 * genuinely competing for one `@@unique` slot); across markets the contradiction
 * is real and is measured, not assumed away.
 *
 * Anything else (one row only, same side, close confidence) is AGREEMENT and is
 * returned as such, because a detector that invents disagreements to look busy
 * is worse than no detector.
 *
 * Side resolution reuses the engine's own boundary-aware matcher
 * (`selectionIsHomeSide`) rather than a `startsWith` written here. That is not
 * tidiness: a bare prefix check mis-derives the side both when an away name
 * CONTAINS the home name and when the home identifier is a strict PREFIX of the
 * away one (nflverse "LA" Rams home vs "LAC" Chargers away inverts WIN/LOSS).
 * The engine fixed that in settlement.ts after a property fuzzer found it; a
 * second, looser copy in the arbiter would reintroduce the bug on the lane that
 * decides which side is shown.
 */

/** The two producers whose rows can contradict each other. */
export type PickPath = "REASONING" | "LEGACY";

/** Which persisted row shape produced this side of the disagreement. */
export type PathClaim = {
  readonly path: PickPath;
  readonly pickId: string;
  readonly pickType: string;
  readonly selection: string;
  /** Engine confidence 0-100. Read as a BAND INDEX, never as a probability. */
  readonly confidence: number;
  /** Bookmakers behind the row. 0 on a model-signal row, by definition. */
  readonly bookmakerCount: number;
  /** Edge Index 0-100 as published, when the row carries one. */
  readonly edgeScore: number | null;
  readonly pickGrade: string | null;
  readonly modelVersion: string;
  /** True when the selection carries the `(model signal)` marker. */
  readonly isModelSignal: boolean;
};

export type DisagreementKind = "SIDE_CONFLICT" | "CONFIDENCE_CLASH";

export type Disagreement = {
  readonly kind: DisagreementKind;
  readonly reasoning: PathClaim;
  readonly legacy: PathClaim;
  /**
   * Confidence gap in points, on BOTH conflict kinds. Not a gradient for
   * SIDE_CONFLICT: a side conflict is not "more" or "less" than a magnitude, it
   * is a different question, and a sentinel number here would end up in the
   * prompt's own text and in the numeric guard's allowlist as if it meant
   * something. The gap is still reported because it tells the arbiter how far
   * apart the two estimators were, which is evidence.
   */
  readonly magnitude: number;
  /**
   * True when the two claims name the same side of the fixture. Only meaningful
   * for CONFIDENCE_CLASH, where it is what makes the row a disagreement about
   * strength rather than about direction.
   */
  readonly sameSide: boolean;
};

/** What the detector returns when there is nothing to adjudicate. */
export type NoDisagreement = {
  readonly kind: "AGREEMENT" | "INSUFFICIENT";
  /** Why no ruling is possible. `INSUFFICIENT` is not the same as agreement. */
  readonly reason: string;
};

export type DisagreementVerdict = Disagreement | NoDisagreement;

/** The `(model signal)` suffix `generate-slate-slate.ts` appends. */
export const SIGNAL_SELECTION_SUFFIX = "(model signal)";

/**
 * Minimum confidence gap, in points, for two same-side rows to count as a clash.
 *
 * WHY A FLOOR AT ALL. One point of difference between two estimators is noise
 * and would otherwise manufacture a ruling for most of the board. Why not reuse
 * the published confidence BANDS (50/65/75/85): a gap that stays inside one band
 * is a disagreement the bands explicitly say is not meaningful, and the arbiter
 * would be asked to adjudicate nothing. Ten points is roughly one full band, so
 * the detector fires only when the two paths have genuinely separated.
 */
export const CONFIDENCE_CLASH_FLOOR_POINTS = 10;

/** True when the row was written by the reasoning path, not by a book. */
export function isReasoningPathRow(row: {
  readonly selection: string;
  readonly bookmakerCount: number;
}): boolean {
  return row.selection.endsWith(SIGNAL_SELECTION_SUFFIX) && row.bookmakerCount === 0;
}

/**
 * Resolve a selection to the home or away side of the fixture.
 *
 * Delegates to the engine's boundary-aware matcher. Returns null when neither
 * team resolves, which happens on a corrupted selection; the caller treats null
 * as INSUFFICIENT rather than guessing a side, because guessing here would
 * manufacture a SIDE_CONFLICT out of a parse failure.
 */
export type SideResolver = (selection: string) => "HOME" | "AWAY" | null;

/**
 * Decide whether the two paths disagree on one fixture, and how sharply.
 *
 * Pure: no I/O, no clock, no randomness. The caller supplies both rows already
 * read, so the same input always yields the same verdict and a disagreement
 * cannot be re-litigated by re-running the detector.
 */
export function detectDisagreement(
  reasoningRow: PathClaim,
  legacyRow: PathClaim,
  resolveSide: SideResolver,
): DisagreementVerdict {
  if (reasoningRow.pickId === legacyRow.pickId) {
    return {
      kind: "INSUFFICIENT",
      reason: "Same pick on both sides: there is nothing to adjudicate.",
    };
  }

  const reasoningSide = resolveSide(reasoningRow.selection);
  const legacySide = resolveSide(legacyRow.selection);
  if (reasoningSide === null || legacySide === null) {
    return {
      kind: "INSUFFICIENT",
      reason:
        "Could not resolve both selections to a home/away side. A side that " +
        "cannot be parsed is not evidence of a conflict.",
    };
  }

  // `magnitude` is the confidence gap on BOTH conflict kinds, never a sentinel.
  // A side conflict is the more serious disagreement, but "more serious" is not
  // "infinitely far apart", and the arbiter is told the gap in the prompt. A
  // sentinel here would make the prompt's own number meaningless and would put
  // an ungrounded value into the numeric-guard allowlist.
  const gap = Math.abs(reasoningRow.confidence - legacyRow.confidence);

  if (reasoningSide !== legacySide) {
    return {
      kind: "SIDE_CONFLICT",
      reasoning: reasoningRow,
      legacy: legacyRow,
      magnitude: gap,
      sameSide: false,
    };
  }

  if (gap < CONFIDENCE_CLASH_FLOOR_POINTS) {
    return {
      kind: "AGREEMENT",
      reason:
        `Same side, and the ${gap}-point confidence gap sits below the ` +
        `${CONFIDENCE_CLASH_FLOOR_POINTS}-point floor, so it is inside the noise ` +
        "the published bands already say is not meaningful.",
    };
  }

  return {
    kind: "CONFIDENCE_CLASH",
    reasoning: reasoningRow,
    legacy: legacyRow,
    magnitude: gap,
    sameSide: true,
  };
}
