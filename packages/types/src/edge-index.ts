/**
 * ============================================================================
 * THE EDGE INDEX SCALE — single source of truth
 * ============================================================================
 *
 * WHAT THE NUMBER ACTUALLY IS
 * ---------------------------
 * The engine computes one quantity and publishes it as the Edge Index:
 *
 *     rawEdge = pickedSideFairProb − offeredProb
 *
 * where `pickedSideFairProb` is the PROPORTIONAL de-vig (`removeVig`) of the
 * same books' mean implied probability p, and `offeredProb` is that same side's
 * WITH-vig implied probability. Writing S for the two-way overround:
 *
 *     rawEdge = p/S − p = −p·(S−1)/S   ≤ 0   for every S ≥ 1
 *
 * So on any internally consistent market `rawEdge` is a NEGATIVE number whose
 * magnitude is the juice you pay, in probability points, on the side we picked.
 * It is a PRICE-QUALITY reading — cheaper books read higher — and it is not,
 * and has never been, a forecast of whether the pick wins.
 *
 * THE DEFECT THIS FILE FIXES
 * --------------------------
 * The historical mapping was
 *
 *     EdgeIndex = clamp(round(50 + 1000 · rawEdge), 0, 100)
 *
 * Because rawEdge ≤ 0, that put 50 at ZERO HOLD — a price no book offers — and
 * left the entire 50–100 half of a published "0–100" scale structurally
 * unreachable. Measured against the real scorer (uniform books, so no price
 * averaging artefact), the usable band was:
 *
 *     hold 1%  → 43–45      hold 4%  → 22–31
 *     hold 2%  → 36–40      hold 5%  → 15–25
 *     hold 3%  → 29–35      hold 8%  →  0–11
 *
 * Half of the axis was dead, and every grade rung keyed above 50 was dead with
 * it. A reader shown "26" on a 0–100 scale reasonably concludes "poor"; 26 was
 * in fact an ordinary −110/−110 market.
 *
 * THE SCALE, RESTATED
 * -------------------
 * The honest domain of `rawEdge` is [RAW_EDGE_AT_ZERO, RAW_EDGE_AT_FULL]. Both
 * endpoints are taken from the engine's OWN pre-existing normaliser in
 * `computeEdgeScore`
 *
 *     normalized = clamp((rawEdge + 0.05) / 0.10, 0, 1)
 *
 * which already declares ±0.05 to be full scale in each direction. Nothing new
 * is invented here: the negative half of that same domain is stretched onto the
 * full published axis.
 *
 *     EdgeIndex = clamp(round(100 + 2000 · rawEdge), 0, 100)
 *
 *     100  a perfectly fair price — the book takes nothing on this side
 *      50  ~2.5 probability points of juice (an ordinary −110/−110 two-way)
 *       0  ≥5 probability points of juice (roughly a 10% two-way hold)
 *
 * HISTORICAL COMPARABILITY
 * ------------------------
 * The two scales are related by a closed form, not a re-fit:
 *
 *     current = min(100, 2 × legacy)
 *
 * because both are affine in the same `rawEdge` with the same clamp.
 * `legacyHalfScaleToCurrent` below is that conversion, and
 * `LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION` names the last model version that
 * emitted the legacy scale, so any stored value can be converted from its own
 * `modelVersion` stamp without guessing.
 *
 * PRECISION, STATED HONESTLY: a converted value can differ by at most ONE index
 * point from what the current scale would have published for the same market.
 * That is not slack in the conversion — it is the rounding the LEGACY value
 * already threw away. A stored integer carries ±0.5 points of the old scale,
 * and the old scale's points are worth two of the new one's, so ±0.5 becomes
 * ±1. No conversion can recover precision the stored integer never had; only
 * re-scoring the market from its odds can. `CONVERSION_MAX_ERROR_POINTS` below
 * is that bound, and it is asserted rather than assumed.
 *
 * A legacy value ABOVE 50 could only be produced by a positive `rawEdge`, which
 * an honest two-way market cannot yield — it is the fingerprint of the
 * American-odds averaging defect. Those convert to a clamped 100 and should be
 * treated as unusable rather than as a strong price.
 */

/**
 * Tolerance on the two-way overround before a market is called inconsistent.
 *
 * A mathematically zero-hold pair can sum to just under 1 in IEEE-754: −120/+120
 * gives 120/220 + 100/220 = 0.9999999999999999. Without this tolerance that
 * perfectly fair market would be classified inconsistent and published at the
 * BOTTOM of the axis — the worst possible reading of the best possible price.
 *
 * This admits markets that are sub-vig by less than a billionth of a
 * probability point, i.e. exactly the double-rounding of an exactly-fair
 * market. It does not admit any real negative-hold quote: the shapes the
 * inconsistency guard exists for (crossed lines, stale quotes, mixed odds
 * formats) are sub-vig by whole percentage points, eight orders of magnitude
 * above this.
 */
export const OVERROUND_CONSISTENCY_EPSILON = 1e-9;

/** `rawEdge` at which the published index reads 0: 5 probability points of juice. */
export const RAW_EDGE_AT_ZERO = -0.05;

/** `rawEdge` at which the published index reads 100: a perfectly fair price. */
export const RAW_EDGE_AT_FULL = 0;

/** Lowest publishable Edge Index. */
export const EDGE_INDEX_MIN = 0;

/** Highest publishable Edge Index. Reached only by a zero-hold price. */
export const EDGE_INDEX_MAX = 100;

/**
 * Index points per unit of `rawEdge`. Derived, not tuned:
 * `EDGE_INDEX_MAX / (RAW_EDGE_AT_FULL − RAW_EDGE_AT_ZERO)` = 100 / 0.05 = 2000.
 */
export const EDGE_INDEX_POINTS_PER_RAW_EDGE =
  EDGE_INDEX_MAX / (RAW_EDGE_AT_FULL - RAW_EDGE_AT_ZERO);

/**
 * The last `MODEL_VERSION` whose stored `edgeScore` / `edgeIndex` values are on
 * the legacy half scale (50 = fair price). Anything stamped later is on the
 * current full scale (100 = fair price).
 */
export const LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION = "v5.2.7";

/**
 * Map the engine's `rawEdge` (probability units, ≤ 0 on an honest market) onto
 * the published 0–100 Edge Index. THE definition — no other call site may
 * re-derive it.
 *
 * @param twoSidedImpliedSum the two-way overround — the sum of BOTH sides' mean
 *   implied probabilities. REQUIRED, not optional, so no call site can publish
 *   an index without supplying the market-consistency evidence.
 *
 * WHY CONSISTENCY IS AN ARGUMENT AND NOT AN AFTERTHOUGHT
 * -----------------------------------------------------
 * A negative-hold two-way market (implied sum < 1: crossed lines, a stale
 * quote, mixed odds formats) cannot arise from honest pricing, and de-vigging
 * it inflates the "fair" probability above anything the market supports.
 * `computeEdgeScore` already refuses to credit a positive edge in that case by
 * clamping `rawEdge` to 0.
 *
 * On the RETIRED half scale, `rawEdge = 0` rendered as 50 — the top of what an
 * honest market could reach, but only the MIDDLE of the published axis, so the
 * neutralised value read as unremarkable. On the current scale `rawEdge = 0` is
 * 100, the loudest number the product can print. Passing the clamped value
 * straight through would turn a refusal-to-vouch into a claim of a perfect
 * price, and could carry an ELITE_PLAY grade with it.
 *
 * So an inconsistent market publishes `EDGE_INDEX_MIN`. For a PRICE-QUALITY
 * reading, fail-closed is the bottom of the axis: we cannot vouch for this
 * price. This is strictly quieter than both the retired behaviour (50) and a
 * naive rescale (100).
 *
 * Non-finite input (either argument) likewise yields `EDGE_INDEX_MIN` rather
 * than NaN — a non-finite edge is an upstream fault, never a number that should
 * propagate silently into a grade.
 */
export function edgeIndexFromRawEdge(
  rawEdge: number,
  twoSidedImpliedSum: number,
): number {
  // Negated comparison so a NaN overround falls through to MIN rather than
  // sailing past a `< 1` check that is false for NaN.
  if (!(twoSidedImpliedSum >= 1 - OVERROUND_CONSISTENCY_EPSILON)) {
    return EDGE_INDEX_MIN;
  }
  if (!Number.isFinite(rawEdge)) return EDGE_INDEX_MIN;
  const raw = EDGE_INDEX_MAX + EDGE_INDEX_POINTS_PER_RAW_EDGE * rawEdge;
  return Math.max(EDGE_INDEX_MIN, Math.min(EDGE_INDEX_MAX, Math.round(raw)));
}

/**
 * Worst-case error, in index points, between converting a STORED legacy integer
 * and re-scoring the same market on the current scale.
 *
 * Inherited entirely from the legacy value's own rounding: a stored integer
 * carries ±0.5 legacy points, and one legacy point is worth two current ones.
 * Pinned by `__tests__/edge-index-and-grade-ladder.test.ts` over the whole
 * honest domain, so a future change to either mapping that widens it fails.
 */
export const CONVERSION_MAX_ERROR_POINTS = 1;

/**
 * Convert an Edge Index stored under a model version at or before
 * `LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION` onto the current scale.
 *
 * Accurate to within `CONVERSION_MAX_ERROR_POINTS` of what the current scale
 * would publish for the same market — see the precision note in this file's
 * header. Values above the legacy honest ceiling of 50 saturate at
 * `EDGE_INDEX_MAX`; they were never honest readings to begin with.
 */
export function legacyHalfScaleToCurrent(legacyEdgeIndex: number): number {
  if (!Number.isFinite(legacyEdgeIndex)) return EDGE_INDEX_MIN;
  return Math.max(
    EDGE_INDEX_MIN,
    Math.min(EDGE_INDEX_MAX, Math.round(legacyEdgeIndex * 2)),
  );
}
