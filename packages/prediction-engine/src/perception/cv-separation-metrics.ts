/**
 * Separation and break-angle metrics — the fieldcoachai shapes, computed
 * from our own tracklets.
 *
 *   breakAngleDeg    — angle between the incoming and outgoing route
 *                      segments at the break point (their "92°" example).
 *   sepAtBreakYd     — nearest-defender distance at the break.
 *   sepAtCatchYd     — nearest-defender distance at the catch point.
 *
 * Nearest defender = closest opposing-team tracklet by field position at
 * the query time. All values are internal, weight-zero until validated
 * against real clips.
 *
 * Original implementation for GSE.
 */

import type { FramePoint, Tracklet } from "../tracking/cv-movement-primitive.js";
import type { OffensePoint } from "./cv-field-model.js";
import type { Route } from "./cv-route-extract.js";

export interface SeparationMetrics {
  readonly trackletId: string;
  readonly route: string;
  /** Degrees, e.g. 92. Null when no clean break was found. */
  readonly breakAngleDeg: number | null;
  /** Yards to the nearest defender at the break. */
  readonly sepAtBreakYd: number | null;
  /** Yards to the nearest defender at the catch (route end). */
  readonly sepAtCatchYd: number | null;
  readonly nearestDefenderAtBreak: string | null;
}

/** Field position of a tracklet at time t (linear interpolation). */
export function positionAt(
  trk: Tracklet,
  t: number,
): { xM: number; yM: number } | null {
  const fs = trk.frames;
  if (fs.length === 0) return null;
  let lo: FramePoint | null = null;
  let hi: FramePoint | null = null;
  for (const f of fs) {
    if (f.xM == null || f.yM == null) continue;
    if (f.t <= t) lo = f;
    if (f.t >= t) {
      hi = f;
      break;
    }
  }
  if (!lo && !hi) return null;
  if (!lo) return { xM: hi!.xM as number, yM: hi!.yM as number };
  if (!hi || lo === hi) return { xM: lo.xM as number, yM: lo.yM as number };
  const span = hi.t - lo.t || 1e-6;
  const f = (t - lo.t) / span;
  return {
    xM: (lo.xM as number) + f * ((hi.xM as number) - (lo.xM as number)),
    yM: (lo.yM as number) + f * ((hi.yM as number) - (lo.yM as number)),
  };
}

function fieldDistance(
  a: { xM: number; yM: number },
  b: { xM: number; yM: number },
): number {
  const dx = a.xM - b.xM;
  const dy = a.yM - b.yM;
  return Math.sqrt(dx * dx + dy * dy) / 0.9144;
}

/** Nearest opposing tracklet to `point` at time t. */
export function nearestDefender(
  point: { xM: number; yM: number },
  t: number,
  defenders: readonly Tracklet[],
): { trackletId: string; distanceYd: number } | null {
  let best: { trackletId: string; distanceYd: number } | null = null;
  for (const d of defenders) {
    const pos = positionAt(d, t);
    if (!pos) continue;
    const dist = fieldDistance(point, pos);
    if (!best || dist < best.distanceYd) {
      best = { trackletId: d.id, distanceYd: Math.round(dist * 10) / 10 };
    }
  }
  return best;
}

/**
 * Break angle from the route polyline: angle between the incoming
 * segment (release → break) and outgoing segment (break → end).
 * A 90° cut reads ~90; a go route has no break (null).
 */
export function breakAngle(
  polyline: readonly OffensePoint[],
  breakIdx: number,
): number | null {
  if (breakIdx <= 0 || breakIdx >= polyline.length - 1) return null;
  const pre = polyline[0]!;
  const brk = polyline[breakIdx]!;
  const end = polyline[polyline.length - 1]!;
  const v1x = brk.downfieldYd - pre.downfieldYd;
  const v1y = brk.lateralYd - pre.lateralYd;
  const v2x = end.downfieldYd - brk.downfieldYd;
  const v2y = end.lateralYd - brk.lateralYd;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 < 0.5 || n2 < 0.5) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  return Math.round(((Math.acos(cos) * 180) / Math.PI) * 10) / 10;
}

export interface SeparationInput {
  readonly route: Route;
  /** Route polyline in FIELD meters with timestamps (for defender math). */
  readonly fieldPolyline: readonly ({ xM: number; yM: number; t: number })[];
  /** Break index into fieldPolyline. -1 when the route has no break. */
  readonly breakIdx: number;
  readonly offenseTeam: string;
  readonly allTracklets: readonly Tracklet[];
}

/** Compute separation metrics for one classified route. */
export function separationMetrics(input: SeparationInput): SeparationMetrics {
  const defenders = input.allTracklets.filter(
    (t) => t.team !== input.offenseTeam,
  );
  const poly = input.fieldPolyline;

  const breakPt = input.breakIdx >= 0 ? poly[input.breakIdx] ?? null : null;
  const endPt = poly[poly.length - 1] ?? null;

  let sepAtBreakYd: number | null = null;
  let nearestDefenderAtBreak: string | null = null;
  if (breakPt) {
    const nd = nearestDefender(
      { xM: breakPt.xM, yM: breakPt.yM },
      breakPt.t,
      defenders,
    );
    sepAtBreakYd = nd?.distanceYd ?? null;
    nearestDefenderAtBreak = nd?.trackletId ?? null;
  }

  let sepAtCatchYd: number | null = null;
  if (endPt) {
    const nd = nearestDefender(
      { xM: endPt.xM, yM: endPt.yM },
      endPt.t,
      defenders,
    );
    sepAtCatchYd = nd?.distanceYd ?? null;
  }

  // Break angle is unit-invariant: compute it directly on the meter
  // polyline via the offense-shape adapter (angles don't care about units).
  const shapePts: OffensePoint[] = poly.map((p) => ({
    downfieldYd: p.xM,
    lateralYd: p.yM,
  }));

  return {
    trackletId: input.route.trackletId,
    route: input.route.route,
    breakAngleDeg: breakAngle(shapePts, input.breakIdx),
    sepAtBreakYd,
    sepAtCatchYd,
    nearestDefenderAtBreak,
  };
}
