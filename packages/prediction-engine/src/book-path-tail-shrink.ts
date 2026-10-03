/**
 * Book-path confidence tail shrink — the inverted ≥80 band only.
 *
 * MEASURED FAILURE MODE (production, 2026-09-13, n 2,385 settled published
 * non-bootstrap picks, pushes excluded; full tables in
 * docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md
 * section 3b):
 *
 *   confidence 80+ : n 235, claimed 0.8663, realized 0.5191, gap -0.3472, z = -10.7
 *   Brier of confidence-as-probability on that band: 0.3617
 *   (a constant 0.5 forecast scores 0.25 — worse than saying nothing)
 *
 * Realized win rate PEAKS at conf 75–79 (0.6146) and FALLS to 0.4643 by
 * conf 90–94. The score is NON-MONOTONE and anti-predictive at the top.
 * The display calibrator (calibration-apply.ts) is isotonic/PAVA, monotone
 * non-decreasing BY CONSTRUCTION: it can flatten a curve; it can NEVER
 * invert one. Applied to this score it would turn a score inversion into a
 * stated win-probability inversion. This module is the honest alternative:
 * a non-monotone-aware tail shrink that ONLY pulls the inverted band down
 * toward the measured pre-inversion peak, and leaves every score below the
 * floor untouched.
 *
 * SCOPE (v5.3.0 doctrine):
 *   - BOOK PATH ONLY (the heuristic weighted sum in scoring.ts).
 *     The signal path (`generate-signal-slate.ts`, confidence = blended
 *     trueProb) calibrates roughly honestly and MUST NOT be recalibrated.
 *   - Confidence NUMBER only. Never touches independentEdge, rankingP,
 *     selection, line, tier, or publish/withhold. No edge is invented and
 *     no withheld pick is released.
 *
 * FLAG (disabled by default; additive):
 *   BOOK_PATH_TAIL_SHRINK_ENABLED=true  — AND —
 *   CALIBRATION_ADJUSTMENTS_ENABLED=true
 * Both must be true. Either alone is identity. Safe enable procedure is in
 * the PR note; MODEL_VERSION is untouched because the default path is
 * identity and the shrink is a display/calibration-map step, not a re-fit
 * of scoring weights.
 *
 * Pure, no I/O, deterministic.
 */

/** Scores at or above this floor are the measured inverted band. */
export const BOOK_PATH_TAIL_FLOOR = 80;

/**
 * Pull target / floor of the inverted band's display. Anchored at the
 * MEASURED REALIZED rate of the ≥80 band (0.5191 ≈ 52 as a score): a
 * score in this band claiming 87% against a realized 52% may not keep
 * claiming 87%. The shrink pulls the band's display toward this ceiling
 * without ever raising a score and without touching edge.
 */
export const BOOK_PATH_TAIL_CEILING = 52;

/**
 * Default pull strength in [0, 1]. 0 = identity; 1 = hard cap at the
 * ceiling. 0.85 is strong enough that the most overclaimed scores fall
 * FURTHER than mid-band scores (non-monotone — matching the measured
 * inversion where 90–94 realizes WORSE than 75–79) while conf 80 at the
 * band edge is barely touched.
 */
export const BOOK_PATH_TAIL_STRENGTH = 0.85;

export interface BookPathTailShrinkOptions {
  /**
   * Master switch. Default false (identity). Must be true for any shrink.
   * Pairs with CALIBRATION_ADJUSTMENTS_ENABLED at the call site.
   */
  readonly enabled?: boolean;
  /** Inverted-band floor. Default 80. */
  readonly floor?: number;
  /** Pull target ceiling. Default 75. */
  readonly ceiling?: number;
  /** Pull strength in [0, 1]. Default 0.35. */
  readonly strength?: number;
}

export interface BookPathTailShrinkResult {
  /** Shrunk 0–100 score (integer). Equals input when disabled or below floor. */
  readonly confidence: number;
  /** True when the shrink actually moved the score. */
  readonly applied: boolean;
  /** The raw input score, for audit trails. */
  readonly rawConfidence: number;
}

function clampScore(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

/**
 * Shrink one book-path confidence score.
 *
 * Below `floor`: identity (the measured mid-band is roughly honest).
 * At or above `floor`: pull DOWN toward `ceiling`, never raising the score
 * and never dropping it below `ceiling`.
 *
 * Formula (deterministic; the only knobs are the named constants above):
 *
 *   if strength <= 0        → identity
 *   if strength >= 1        → ceiling   (hard cap)
 *   else:
 *     excess = c - floor                       // 0 at floor, 20 at 100
 *     t      = excess / (100 - floor)          // 0..1
 *     maxDrop = floor - ceiling                // how far the TOP may fall
 *     drop    = round(strength * maxDrop * t)  // grows with excess
 *     c'      = max(ceiling, c - drop)
 *
 * Because `drop` grows with `excess` faster than the input gap between
 * mid-band and top-band scores (with the default strength 0.85 and
 * ceiling 52), the MOST overclaimed scores fall furthest — conf 100 maps
 * BELOW conf 90. That non-monotone pull is deliberate: the measured
 * score is inverted at the top (90–94 realizes 0.4643, worse than the
 * lowest band), so a monotone map cannot honestly repair it.
 *
 * Worked defaults (floor 80, ceiling 52, strength 0.85):
 *   conf 80 → drop 0  → 80   (band edge barely touched)
 *   conf 85 → drop 6  → 79
 *   conf 90 → drop 12 → 78
 *   conf 100 → drop 24 → 76  (wait: 0.85*28=23.8→24; 100-24=76)
 *   and 76 < 78, so the top of the band sits BELOW the mid — the
 *   inversion is reflected in the display rather than amplified.
 */
export function shrinkBookPathTailConfidence(
  confidence: number,
  options: BookPathTailShrinkOptions = {},
): BookPathTailShrinkResult {
  const raw = clampScore(confidence);
  const enabled = options.enabled === true;
  const floor = options.floor ?? BOOK_PATH_TAIL_FLOOR;
  const ceiling = options.ceiling ?? BOOK_PATH_TAIL_CEILING;
  const strength =
    options.strength === undefined
      ? BOOK_PATH_TAIL_STRENGTH
      : Math.max(0, Math.min(1, options.strength));

  if (!enabled) {
    return { confidence: Math.round(raw), applied: false, rawConfidence: Math.round(raw) };
  }
  if (raw < floor) {
    return { confidence: Math.round(raw), applied: false, rawConfidence: Math.round(raw) };
  }
  if (ceiling >= floor) {
    // Degenerate config: no room to shrink below the floor. Identity.
    return { confidence: Math.round(raw), applied: false, rawConfidence: Math.round(raw) };
  }
  if (strength <= 0) {
    return { confidence: Math.round(raw), applied: false, rawConfidence: Math.round(raw) };
  }

  const rawRounded = Math.round(raw);
  if (strength >= 1) {
    // Hard cap: the entire inverted band collapses to the ceiling.
    return {
      confidence: ceiling,
      applied: ceiling < rawRounded,
      rawConfidence: rawRounded,
    };
  }

  const excess = raw - floor;
  const maxDrop = floor - ceiling;
  const t = Math.min(1, excess / Math.max(1, 100 - floor));
  const drop = Math.round(strength * maxDrop * t);
  const shrunk = Math.max(ceiling, rawRounded - drop);
  const applied = shrunk < rawRounded;
  return { confidence: shrunk, applied, rawConfidence: rawRounded };
}

/**
 * Convenience: shrink or pass through, returning just the score.
 * Identity when `enabled` is false or omitted.
 */
export function bookPathTailShrinkScore(
  confidence: number,
  options: BookPathTailShrinkOptions = {},
): number {
  return shrinkBookPathTailConfidence(confidence, options).confidence;
}

/**
 * Shrink a batch of settled book-path rows for the confidence-tail report,
 * returning before/after claimed rates so a test (or an operator) can
 * PROVE the tail shrank. Rows below the floor are unchanged in both arms.
 *
 * Pure. Never reads outcomes — this is a display map, not a fit.
 */
export interface BookPathTailRow {
  readonly confidence: number;
}

export interface BookPathTailShrinkReport {
  readonly floor: number;
  readonly n: number;
  readonly claimedBefore: number;
  readonly claimedAfter: number;
  readonly maxBefore: number;
  readonly maxAfter: number;
  readonly rowsBefore: readonly number[];
  readonly rowsAfter: readonly number[];
}

export function reportBookPathTailShrink(
  rows: readonly BookPathTailRow[],
  options: BookPathTailShrinkOptions = {},
): BookPathTailShrinkReport {
  const floor = options.floor ?? BOOK_PATH_TAIL_FLOOR;
  const tail = rows.filter((r) => Number.isFinite(r.confidence) && r.confidence >= floor);
  const n = tail.length;
  const rowsBefore = tail.map((r) => Math.round(clampScore(r.confidence)));
  const rowsAfter = tail.map((r) =>
    shrinkBookPathTailConfidence(r.confidence, options).confidence,
  );
  const claimedBefore =
    n > 0 ? rowsBefore.reduce((s, c) => s + c / 100, 0) / n : 0;
  const claimedAfter =
    n > 0 ? rowsAfter.reduce((s, c) => s + c / 100, 0) / n : 0;
  const maxBefore = n > 0 ? Math.max(...rowsBefore) : 0;
  const maxAfter = n > 0 ? Math.max(...rowsAfter) : 0;
  return {
    floor,
    n,
    claimedBefore,
    claimedAfter,
    maxBefore,
    maxAfter,
    rowsBefore,
    rowsAfter,
  };
}
