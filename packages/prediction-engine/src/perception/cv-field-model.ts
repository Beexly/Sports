/**
 * Field model for the perception layer (Layer 2/3 of the CV pipeline).
 *
 * The tracking layer emits field positions in meters: xM along the field
 * length measured from the goal line (0 = the goal line at the xM=0 end,
 * 91.44 = the far goal line; negative xM reaches into the near end zone),
 * yM across the width (0..48.8; 53.3 yards), 0 at the near sideline.
 *
 * ONE field-coordinate story (reconciled 2026-10-01): this is the SAME
 * origin as the tracking template (cv-template.ts
 * templateXForYardFromOwnGoal) — A's homography output feeds
 * toOffenseFrame directly with no translation.
 *
 * Perception reasons in the OFFENSE frame: downfield yards from the line of
 * scrimmage (positive = toward the opponent end zone) and lateral yards from
 * the ball. Every formation / route / separation computation in this package
 * works in offense-frame yards — the unit coaches think in.
 *
 * Original implementation for GSE.
 */

export const METERS_PER_YARD = 0.9144;
export const YARDS_PER_METER = 1 / METERS_PER_YARD;
export const FIELD_LENGTH_YD = 120;
export const FIELD_WIDTH_YD = 53.3;

/** Where the play starts: line of scrimmage + direction of attack. */
export interface SnapContext {
  /** LOS position, field meters (xM). */
  readonly losXM: number;
  /** Ball lateral position, field meters (yM). */
  readonly losYM: number;
  /** +1 = attacking toward increasing xM, -1 = toward decreasing xM. */
  readonly attackDir: 1 | -1;
}

/** A point in the offense frame, yards. */
export interface OffensePoint {
  /** Yards downfield from the LOS. Negative = behind the line. */
  readonly downfieldYd: number;
  /** Yards lateral from the ball. Sign follows the field yM axis. */
  readonly lateralYd: number;
}

/** Convert a field-meter point to offense-frame yards. */
export function toOffenseFrame(
  xM: number,
  yM: number,
  ctx: SnapContext,
): OffensePoint {
  return {
    downfieldYd: ((xM - ctx.losXM) * ctx.attackDir) * YARDS_PER_METER,
    lateralYd: (yM - ctx.losYM) * YARDS_PER_METER,
  };
}

/** Euclidean distance between two offense-frame points, yards. */
export function offenseDistance(a: OffensePoint, b: OffensePoint): number {
  const dx = a.downfieldYd - b.downfieldYd;
  const dy = a.lateralYd - b.lateralYd;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build a SnapContext from a score-bug yard line.
 * `yardLine` is e.g. { team: "KC", yard: 32 } meaning "ball on KC's 32".
 * `possession` is the offense team. `sideSign` maps which goal line is
 * xM=0: pass +1 when the possessing team's own goal line sits at xM=0.
 * (Reconciled 2026-10-01: goal-line origin, shared with the tracking
 * template — no end-zone offset.)
 */
export function snapContextFromYardLine(
  yardLine: { team: string; yard: number },
  possession: string,
  sideSign: 1 | -1,
): SnapContext {
  // Distance of the LOS from the possessing team's own goal line, yards.
  const fromOwnGoalYd =
    yardLine.team === possession ? yardLine.yard : 100 - yardLine.yard;
  const losXM =
    sideSign === 1
      ? fromOwnGoalYd * METERS_PER_YARD
      : (100 - fromOwnGoalYd) * METERS_PER_YARD;
  return { losXM, losYM: (FIELD_WIDTH_YD / 2) * METERS_PER_YARD, attackDir: sideSign };
}
