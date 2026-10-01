/**
 * cv-template.ts — canonical NFL field template (field-meter space).
 *
 * Coordinate convention (matches D's cv-field-model.ts and the tracking
 * layer's Homography output): xM along the field length with 0 at one end
 * line and 109.7 m at the other (120 yards); yM across the width,
 * 0 at the near sideline, 48.8 m at the far sideline (53.3 yards).
 *
 * Every numeric default below is marked [DERIVED] — engineering starting
 * points from the standard NFL field geometry; first tuning run on real
 * footage is mandatory before any weight moves off zero.
 */

/** Meters per yard. */
export const YARDS_TO_METERS = 0.9144;

/** Painted yard lines sit on a 5-yard grid. */
export const YARD_LINE_SPACING_YD = 5;

/**
 * Hash-mark row offset, meters. [DERIVED]
 * NFL hash marks are 18'6" apart → 5.6388 m ≈ 5.64 m. This is the yM of
 * the hash-mark correspondence row used by landmarksToCorrespondences.
 */
export const HASH_OFFSET_M = 5.64;

/** yM of the hash-mark correspondence row (see HASH_OFFSET_M). */
export function hashMarkLineYM(): number {
  return HASH_OFFSET_M;
}

/**
 * Template xM for a line N yards from the own goal line (0..100 scale).
 *
 * ONE field-coordinate story (reconciled 2026-10-01): the template origin
 * is the GOAL LINE (xM=0 at the goal line, growing toward the opposite
 * goal line). This matches D's field model (cv-field-model.ts), whose
 * SnapContext.losXM is measured from the same goal-line origin —
 * A's homography output feeds D's toOffenseFrame directly, no translation.
 */
export function templateXForYardFromOwnGoal(
  yardsFromOwnGoal: number,
): number {
  return yardsFromOwnGoal * YARDS_TO_METERS;
}
