/**
 * Route extraction: per-receiver polylines → route-tree classification.
 *
 * From the snap to the whistle (or the catch point), each eligible
 * receiver traces a polyline in the offense frame. The route tree is a
 * small closed vocabulary — go, slant, out, dig, post, corner, curl,
 * comeback, flat, wheel, screen, drag, seam, hitch — so classification is
 * template matching: resample the polyline, compare against canonical
 * route shapes with dynamic time warping, in both lateral orientations
 * (in-breaking vs out-breaking must NOT collapse).
 *
 * Break points come from maximum curvature along the polyline; separation
 * and break-angle metrics (cv-separation-metrics.ts) consume them.
 *
 * Original implementation for GSE.
 */

import { offenseDistance, type OffensePoint } from "./cv-field-model.js";

export type RouteName =
  | "go"
  | "slant"
  | "out"
  | "dig"
  | "post"
  | "corner"
  | "curl"
  | "comeback"
  | "flat"
  | "wheel"
  | "screen"
  | "drag"
  | "seam"
  | "hitch"
  | "unknown";

export interface Route {
  readonly trackletId: string;
  readonly route: RouteName;
  /** 0..1, from the margin between best and second-best template. */
  readonly confidence: number;
  /** Max-curvature point; null for straight routes (go/seam). */
  readonly breakPoint: (OffensePoint & { t: number }) | null;
  /** Max downfield extent, yards. */
  readonly depthYards: number;
  readonly releaseT: number;
}

/** Waypoint in (downfield, lateral) yards, pre-mirror orientation. */
type Waypoint = readonly [number, number];

/**
 * Canonical route shapes. +lateral is arbitrary; matching tries both the
 * template and its lateral mirror so dig≠out and post≠corner survive.
 */
const ROUTE_TEMPLATES: Record<Exclude<RouteName, "unknown">, Waypoint[]> = {
  go: [[0, 0], [12, 0.3]],
  seam: [[0, 0], [10, -0.5]],
  slant: [[0, 0], [3.5, 0.2], [7, 3.5]],
  out: [[0, 0], [6, 0.2], [6.5, 4.5]],
  dig: [[0, 0], [7, 0.2], [7.5, -5]],
  post: [[0, 0], [8, 0.3], [13, -4]],
  corner: [[0, 0], [8, 0.3], [12, 4.5]],
  curl: [[0, 0], [7, 0.2], [6, 0]],
  comeback: [[0, 0], [10, 0.3], [8.5, 0]],
  hitch: [[0, 0], [5, 0.2], [4.5, 0]],
  flat: [[0, 0], [1.5, 0.5], [2, 4]],
  wheel: [[0, 0], [1.5, 0.5], [3, 3], [9, 4]],
  screen: [[0, 0], [-1, 1], [-2, 3]],
  drag: [[0, 0], [2, 1], [4, -8]],
};

const RESAMPLE_N = 16;

/** Resample a polyline to n evenly spaced points by arc length. */
export function resamplePolyline(
  pts: readonly OffensePoint[],
  n: number = RESAMPLE_N,
): OffensePoint[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => ({ ...pts[0]! }));
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1]! + offenseDistance(pts[i - 1]!, pts[i]!));
  }
  const total = cum[cum.length - 1]!;
  if (total <= 0) return Array.from({ length: n }, () => ({ ...pts[0]! }));
  const out: OffensePoint[] = [];
  let seg = 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (seg < cum.length - 1 && cum[seg]! < target) seg++;
    const c0 = cum[seg - 1]!;
    const c1 = cum[seg]!;
    const f = c1 > c0 ? (target - c0) / (c1 - c0) : 0;
    const a = pts[seg - 1]!;
    const b = pts[seg]!;
    out.push({
      downfieldYd: a.downfieldYd + f * (b.downfieldYd - a.downfieldYd),
      lateralYd: a.lateralYd + f * (b.lateralYd - a.lateralYd),
    });
  }
  return out;
}

/** Dynamic time warping distance between two resampled polylines. */
export function dtwDistance(
  a: readonly OffensePoint[],
  b: readonly OffensePoint[],
): number {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(Infinity),
  );
  dp[0]![0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = offenseDistance(a[i - 1]!, b[j - 1]!);
      dp[i]![j] =
        cost + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[n]![m]! / (n + m);
}

interface TemplateSet {
  name: RouteName;
  pts: OffensePoint[];
  mirror: OffensePoint[];
}

function buildTemplates(): TemplateSet[] {
  return (Object.keys(ROUTE_TEMPLATES) as RouteName[]).map((name) => {
    const wp = ROUTE_TEMPLATES[name as Exclude<RouteName, "unknown">];
    const base: OffensePoint[] = wp.map(([d, l]) => ({
      downfieldYd: d,
      lateralYd: l,
    }));
    const res = resamplePolyline(base);
    // Normalize by depth so shape dominates scale; floor avoids blowup.
    const depth = Math.max(3, ...res.map((p) => Math.abs(p.downfieldYd)));
    const norm = (p: OffensePoint): OffensePoint => ({
      downfieldYd: p.downfieldYd / depth,
      lateralYd: p.lateralYd / depth,
    });
    return {
      name,
      pts: res.map(norm),
      mirror: res.map((p) => norm({ ...p, lateralYd: -p.lateralYd })),
    };
  });
}

let templateCache: TemplateSet[] | null = null;
function templates(): TemplateSet[] {
  if (!templateCache) templateCache = buildTemplates();
  return templateCache;
}

/** Max-curvature point of a polyline (the break). Null for straight lines. */
export function findBreakPoint(
  pts: readonly (OffensePoint & { t: number })[],
): (OffensePoint & { t: number }) | null {
  if (pts.length < 5) return null;
  let best: (OffensePoint & { t: number }) | null = null;
  let bestTurn = 0;
  for (let i = 2; i < pts.length - 2; i++) {
    const a = pts[i - 2]!;
    const b = pts[i]!;
    const c = pts[i + 2]!;
    const v1x = b.downfieldYd - a.downfieldYd;
    const v1y = b.lateralYd - a.lateralYd;
    const v2x = c.downfieldYd - b.downfieldYd;
    const v2y = c.lateralYd - b.lateralYd;
    const n1 = Math.hypot(v1x, v1y);
    const n2 = Math.hypot(v2x, v2y);
    if (n1 < 0.5 || n2 < 0.5) continue;
    const cos = Math.max(
      -1,
      Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2)),
    );
    const turn = Math.acos(cos);
    if (turn > bestTurn && turn > 0.35) {
      bestTurn = turn;
      best = b;
    }
  }
  return best;
}

export interface RouteInput {
  readonly trackletId: string;
  /** Offense-frame polyline, snap → whistle/catch, with timestamps. */
  readonly points: readonly (OffensePoint & { t: number })[];
}

/** Classify one receiver's polyline against the route tree. */
export function classifyRoute(input: RouteInput): Route {
  const releaseT = input.points[0]?.t ?? 0;
  const depthYards = Math.max(
    0,
    ...input.points.map((p) => p.downfieldYd),
  );

  if (input.points.length < 4) {
    return {
      trackletId: input.trackletId,
      route: "unknown",
      confidence: 0.1,
      breakPoint: null,
      depthYards,
      releaseT,
    };
  }

  const res = resamplePolyline(input.points);
  const depth = Math.max(3, ...res.map((p) => Math.abs(p.downfieldYd)));
  const norm = res.map((p) => ({
    downfieldYd: p.downfieldYd / depth,
    lateralYd: p.lateralYd / depth,
  }));

  const scored = templates().map((t) => ({
    name: t.name,
    dist: Math.min(dtwDistance(norm, t.pts), dtwDistance(norm, t.mirror)),
  }));
  scored.sort((a, b) => a.dist - b.dist);
  const best = scored[0]!;
  const second = scored[1]!;

  const margin = second.dist > 0 ? (second.dist - best.dist) / second.dist : 0;
  const confidence = Math.max(0.15, Math.min(0.95, 0.35 + margin * 1.6));

  return {
    trackletId: input.trackletId,
    route: best.name,
    confidence: Math.round(confidence * 100) / 100,
    breakPoint: findBreakPoint(input.points),
    depthYards: Math.round(depthYards * 10) / 10,
    releaseT,
  };
}

/** Classify a batch of receiver polylines. */
export function extractRoutes(inputs: readonly RouteInput[]): Route[] {
  return inputs.map(classifyRoute);
}
