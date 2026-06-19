/**
 * Geometry and spatial analytics library — pure TypeScript, zero dependencies.
 *
 * Covers: 2D/3D vectors, polygon operations, line/segment math,
 * circle geometry, geospatial utilities, sports field zones,
 * and projectile trajectory physics.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Point2D = { x: number; y: number };
export type Point3D = { x: number; y: number; z: number };

// ─────────────────────────────────────────────────────────────────────────────
// 2D Point Operations
// ─────────────────────────────────────────────────────────────────────────────

/** Euclidean distance between two 2D points. */
export function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Midpoint between two 2D points. */
export function midpoint2D(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Slope of line through a and b. Returns Infinity if vertical (a.x === b.x). */
export function slope(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  if (dx === 0) return Infinity;
  return (b.y - a.y) / dx;
}

/** Angle in radians of vector a→b (atan2). Range: (-π, π]. */
export function angle2D(a: Point2D, b: Point2D): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Rotate point p around origin by angleRad radians (CCW). */
export function rotate2D(p: Point2D, origin: Point2D, angleRad: number): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Dot product of two 2D vectors (treated as vectors from origin). */
export function dotProduct2D(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

/** Z-component of 3D cross product of two 2D vectors. */
export function crossProduct2D(a: Point2D, b: Point2D): number {
  return a.x * b.y - a.y * b.x;
}

/** Unit vector; returns {x:0,y:0} for zero vector. */
export function normalize2D(v: Point2D): Point2D {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

/** Scale a 2D vector by a scalar factor. */
export function scale2D(v: Point2D, factor: number): Point2D {
  return { x: v.x * factor, y: v.y * factor };
}

/** Add two 2D vectors/points. */
export function add2D(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract b from a (a - b). */
export function subtract2D(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D Point Operations
// ─────────────────────────────────────────────────────────────────────────────

/** Euclidean distance between two 3D points. */
export function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Dot product of two 3D vectors. */
export function dotProduct3D(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Cross product of two 3D vectors. */
export function crossProduct3D(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Magnitude (length) of a 3D vector. */
export function magnitude3D(v: Point3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** Unit vector of a 3D vector; returns {x:0,y:0,z:0} for zero vector. */
export function normalize3D(v: Point3D): Point3D {
  const mag = magnitude3D(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/** Add two 3D vectors. */
export function add3D(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Subtract b from a (a - b). */
export function subtract3D(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

// ─────────────────────────────────────────────────────────────────────────────
// Polygon and Area
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shoelace formula for polygon area.
 * Returns positive area regardless of winding order.
 */
export function polygonArea(vertices: readonly Point2D[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const vi: Point2D = vertices[i] as Point2D;
    const vj: Point2D = vertices[j] as Point2D;
    area += vi.x * vj.y;
    area -= vj.x * vi.y;
  }
  return Math.abs(area) / 2;
}

/** Sum of edge lengths for a closed polygon. */
export function polygonPerimeter(vertices: readonly Point2D[]): number {
  const n = vertices.length;
  if (n < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += distance2D(vertices[i] as Point2D, vertices[j] as Point2D);
  }
  return perimeter;
}

/** Geometric centroid of a polygon. Throws if vertices array is empty. */
export function centroid(vertices: readonly Point2D[]): Point2D {
  if (vertices.length === 0) throw new Error("centroid: vertices array must not be empty");
  const v0 = vertices[0] as Point2D;
  if (vertices.length === 1) return { x: v0.x, y: v0.y };
  if (vertices.length === 2) {
    return midpoint2D(v0, vertices[1] as Point2D);
  }
  const area = polygonArea(vertices);
  if (area === 0) {
    // Collinear or degenerate — return average
    const sumX = vertices.reduce((s, v) => s + v.x, 0);
    const sumY = vertices.reduce((s, v) => s + v.y, 0);
    return { x: sumX / vertices.length, y: sumY / vertices.length };
  }
  let cx = 0;
  let cy = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const vi: Point2D = vertices[i] as Point2D;
    const vj: Point2D = vertices[j] as Point2D;
    const factor = vi.x * vj.y - vj.x * vi.y;
    cx += (vi.x + vj.x) * factor;
    cy += (vi.y + vj.y) * factor;
  }
  // Compute signed area to get correct sign for cx/cy
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const vi: Point2D = vertices[i] as Point2D;
    const vj: Point2D = vertices[j] as Point2D;
    signedArea += vi.x * vj.y - vj.x * vi.y;
  }
  signedArea /= 2;
  const coeff = 1 / (6 * signedArea);
  return { x: cx * coeff, y: cy * coeff };
}

/**
 * Returns true if all cross products of consecutive edges have the same sign.
 * Requires at least 3 vertices.
 */
export function isConvex(vertices: readonly Point2D[]): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a: Point2D = vertices[i] as Point2D;
    const b: Point2D = vertices[(i + 1) % n] as Point2D;
    const c: Point2D = vertices[(i + 2) % n] as Point2D;
    const cross = crossProduct2D(subtract2D(b, a), subtract2D(c, b));
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) {
        sign = s;
      } else if (sign !== s) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Ray casting algorithm to test if point p is inside polygon.
 * Points on edges are considered inside.
 */
export function pointInPolygon(p: Point2D, polygon: readonly Point2D[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi: Point2D = polygon[i] as Point2D;
    const pj: Point2D = polygon[j] as Point2D;
    const intersect =
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Graham scan convex hull.
 * Returns vertices in CCW order.
 */
export function convexHull(points: readonly Point2D[]): Point2D[] {
  const n = points.length;
  if (n <= 1) return points.slice();
  if (n === 2) return points.slice();

  // Find pivot: lowest y, then leftmost x
  let pivotIdx = 0;
  for (let i = 1; i < n; i++) {
    const pi: Point2D = points[i] as Point2D;
    const pp: Point2D = points[pivotIdx] as Point2D;
    if (pi.y < pp.y || (pi.y === pp.y && pi.x < pp.x)) {
      pivotIdx = i;
    }
  }

  const base: Point2D = points[pivotIdx] as Point2D;
  const rest: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== pivotIdx) rest.push(points[i] as Point2D);
  }

  rest.sort((a, b) => {
    const cross = crossProduct2D(subtract2D(a, base), subtract2D(b, base));
    if (cross !== 0) return -cross; // CCW order
    return distance2D(base, a) - distance2D(base, b);
  });

  // Remove collinear duplicates — keep farthest for same angle
  const filtered: Point2D[] = [];
  let i = 0;
  while (i < rest.length) {
    const ri: Point2D = rest[i] as Point2D;
    let j = i + 1;
    while (
      j < rest.length &&
      crossProduct2D(subtract2D(rest[j] as Point2D, base), subtract2D(ri, base)) === 0
    ) {
      j++;
    }
    filtered.push(rest[j - 1] as Point2D);
    i = j;
  }

  if (filtered.length === 0) return [base];
  if (filtered.length === 1) return [base, filtered[0] as Point2D];

  const hull: Point2D[] = [base, filtered[0] as Point2D, filtered[1] as Point2D];
  for (let k = 2; k < filtered.length; k++) {
    const fk: Point2D = filtered[k] as Point2D;
    while (
      hull.length >= 2 &&
      crossProduct2D(
        subtract2D(hull[hull.length - 1] as Point2D, hull[hull.length - 2] as Point2D),
        subtract2D(fk, hull[hull.length - 2] as Point2D)
      ) <= 0
    ) {
      hull.pop();
    }
    hull.push(fk);
  }
  return hull;
}

// ─────────────────────────────────────────────────────────────────────────────
// Line and Segment Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intersection of lines p1-p2 and p3-p4.
 * Returns null if parallel (or coincident).
 */
export function lineIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const d1 = subtract2D(p2, p1);
  const d2 = subtract2D(p4, p3);
  const denom = crossProduct2D(d1, d2);
  if (Math.abs(denom) < 1e-12) return null; // parallel
  const d3 = subtract2D(p3, p1);
  const t = crossProduct2D(d3, d2) / denom;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

/**
 * Returns true if line segment p1-p2 intersects segment p3-p4.
 * Endpoint touches count as intersections.
 */
export function segmentIntersects(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): boolean {
  const d1 = subtract2D(p2, p1);
  const d2 = subtract2D(p4, p3);
  const denom = crossProduct2D(d1, d2);
  const d3 = subtract2D(p3, p1);

  if (Math.abs(denom) < 1e-12) {
    // Parallel — check collinear overlap
    const cross = crossProduct2D(d3, d1);
    if (Math.abs(cross) > 1e-12) return false; // parallel but not collinear
    // Collinear — check 1D overlap
    const len1Sq = dotProduct2D(d1, d1);
    if (len1Sq === 0) {
      // p1=p2 degenerate
      const t = closestPointOnSegmentParam(p1, p3, p4);
      return t >= 0 && t <= 1;
    }
    const t3 = dotProduct2D(subtract2D(p3, p1), d1) / len1Sq;
    const t4 = dotProduct2D(subtract2D(p4, p1), d1) / len1Sq;
    const tMin = Math.min(t3, t4);
    const tMax = Math.max(t3, t4);
    return tMax >= 0 && tMin <= 1;
  }

  const t = crossProduct2D(d3, d2) / denom;
  const u = crossProduct2D(d3, d1) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Helper: parameter t of closest point on segment from p. */
function closestPointOnSegmentParam(p: Point2D, segStart: Point2D, segEnd: Point2D): number {
  const seg = subtract2D(segEnd, segStart);
  const lenSq = dotProduct2D(seg, seg);
  if (lenSq === 0) return distance2D(p, segStart) < 1e-12 ? 0 : -1;
  return dotProduct2D(subtract2D(p, segStart), seg) / lenSq;
}

/** Perpendicular distance from point p to infinite line through lineStart-lineEnd. */
export function pointToLineDistance(
  p: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D
): number {
  const d = subtract2D(lineEnd, lineStart);
  const len = Math.sqrt(dotProduct2D(d, d));
  if (len === 0) return distance2D(p, lineStart);
  return Math.abs(crossProduct2D(d, subtract2D(p, lineStart))) / len;
}

/** Distance from point p to line segment segStart-segEnd. */
export function pointToSegmentDistance(
  p: Point2D,
  segStart: Point2D,
  segEnd: Point2D
): number {
  return distance2D(p, closestPointOnSegment(p, segStart, segEnd));
}

/** Closest point on segment segStart-segEnd to point p. */
export function closestPointOnSegment(
  p: Point2D,
  segStart: Point2D,
  segEnd: Point2D
): Point2D {
  const seg = subtract2D(segEnd, segStart);
  const lenSq = dotProduct2D(seg, seg);
  if (lenSq === 0) return { x: segStart.x, y: segStart.y };
  const t = Math.max(0, Math.min(1, dotProduct2D(subtract2D(p, segStart), seg) / lenSq));
  return { x: segStart.x + t * seg.x, y: segStart.y + t * seg.y };
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle Operations
// ─────────────────────────────────────────────────────────────────────────────

/** Area of a circle. */
export function circleArea(radius: number): number {
  return Math.PI * radius * radius;
}

/** Circumference of a circle. */
export function circleCircumference(radius: number): number {
  return 2 * Math.PI * radius;
}

/**
 * Relationship between two circles:
 * - 'none': do not intersect and neither is inside the other
 * - 'tangent': internally or externally tangent
 * - 'intersecting': two intersection points
 * - 'contained': one circle is entirely inside the other
 */
export function circleIntersection(
  c1: { center: Point2D; radius: number },
  c2: { center: Point2D; radius: number }
): 'none' | 'tangent' | 'intersecting' | 'contained' {
  const d = distance2D(c1.center, c2.center);
  const r1 = c1.radius;
  const r2 = c2.radius;
  const eps = 1e-9;

  if (Math.abs(d - (r1 + r2)) < eps) return 'tangent'; // external tangent
  if (Math.abs(d - Math.abs(r1 - r2)) < eps) return 'tangent'; // internal tangent

  if (d > r1 + r2) return 'none'; // too far apart
  if (d < Math.abs(r1 - r2)) return 'contained'; // one inside the other

  return 'intersecting';
}

/** Returns true if point p is inside or on the boundary of the circle. */
export function pointInCircle(p: Point2D, center: Point2D, radius: number): boolean {
  return distance2D(p, center) <= radius;
}

/**
 * Circumscribed circle of three points.
 * Returns null if the points are collinear.
 */
export function circleFromThreePoints(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): { center: Point2D; radius: number } | null {
  const ax = p1.x;
  const ay = p1.y;
  const bx = p2.x;
  const by = p2.y;
  const cx = p3.x;
  const cy = p3.y;

  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-10) return null; // collinear

  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    D;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    D;

  const center: Point2D = { x: ux, y: uy };
  const radius = distance2D(center, p1);
  return { center, radius };
}

// ─────────────────────────────────────────────────────────────────────────────
// Geospatial (lat/lon)
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Haversine distance between two lat/lon points in kilometers. */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rlat1 = toRad(lat1);
  const rlat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Compass bearing from point 1 to point 2 in degrees.
 * 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rlat1 = toRad(lat1);
  const rlat2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(rlat2);
  const x =
    Math.cos(rlat1) * Math.sin(rlat2) -
    Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Destination point given start, distance (km), and bearing (degrees).
 * Uses the spherical law of cosines (Vincenty simplified).
 */
export function destinationPoint(
  lat: number,
  lon: number,
  distanceKm: number,
  bearingDeg: number
): { lat: number; lon: number } {
  const angDist = distanceKm / EARTH_RADIUS_KM;
  const bRad = toRad(bearingDeg);
  const rLat = toRad(lat);
  const rLon = toRad(lon);

  const lat2 = Math.asin(
    Math.sin(rLat) * Math.cos(angDist) +
      Math.cos(rLat) * Math.sin(angDist) * Math.cos(bRad)
  );
  const lon2 =
    rLon +
    Math.atan2(
      Math.sin(bRad) * Math.sin(angDist) * Math.cos(rLat),
      Math.cos(angDist) - Math.sin(rLat) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lon: ((toDeg(lon2) + 540) % 360) - 180 };
}

/**
 * Axis-aligned bounding box of a set of lat/lon points.
 * Throws if points array is empty.
 */
export function boundingBox(
  points: ReadonlyArray<{ lat: number; lon: number }>
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  if (points.length === 0) throw new Error("boundingBox: points array must not be empty");
  const first = points[0] as { lat: number; lon: number };
  let minLat = first.lat;
  let maxLat = first.lat;
  let minLon = first.lon;
  let maxLon = first.lon;
  for (const pt of points) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lon < minLon) minLon = pt.lon;
    if (pt.lon > maxLon) maxLon = pt.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sports Field Geometry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NFL field zone based on yard line and side.
 * Zone names relative to the offense:
 *   'own-red-zone' (0-20 own side)
 *   'own-territory' (21-49 own side)
 *   'midfield' (50)
 *   'opponent-territory' (21-49 opponent side)
 *   'red-zone' (1-20 opponent side)
 *   'goal-line' (1-5 opponent side)
 *
 * yardLine: 0-50, side: 'offense' (own side) or 'defense' (opponent side)
 */
export function nflFieldZone(yardLine: number, side: 'offense' | 'defense'): string {
  if (yardLine === 50) return 'midfield';

  if (side === 'offense') {
    // Own side: 0 = own goal line, 49 = near midfield
    if (yardLine <= 20) return 'own-red-zone';
    return 'own-territory';
  } else {
    // Opponent's side: 1 = opponent goal line, 49 = near midfield
    if (yardLine <= 5) return 'goal-line';
    if (yardLine <= 20) return 'red-zone';
    return 'opponent-territory';
  }
}

/**
 * Soccer field zone based on x/y coordinates.
 * Returns combined zone: e.g. 'defensive-left', 'middle-center', 'attacking-right'.
 * fieldLength default 105m (x-axis), fieldWidth default 68m (y-axis).
 * x=0 is defensive goal, x=fieldLength is attacking goal.
 * y=0 is left touchline, y=fieldWidth is right touchline.
 */
export function soccerFieldZone(
  x: number,
  y: number,
  fieldLength = 105,
  fieldWidth = 68
): string {
  // Longitudinal third
  const third = fieldLength / 3;
  let longitudinal: string;
  if (x < third) {
    longitudinal = 'defensive';
  } else if (x < 2 * third) {
    longitudinal = 'middle';
  } else {
    longitudinal = 'attacking';
  }

  // Lateral wing
  const wing = fieldWidth / 3;
  let lateral: string;
  if (y < wing) {
    lateral = 'left';
  } else if (y < 2 * wing) {
    lateral = 'center';
  } else {
    lateral = 'right';
  }

  return `${longitudinal}-${lateral}`;
}

/**
 * Basketball zone on an NBA court (94×50 ft).
 * side: 'left' has basket at (5, 25); 'right' has basket at (89, 25).
 * Three-point corner: y < 3 or y > 47 AND within 14 ft of basket.
 * Three-point arc: 23.75 ft from basket.
 * Paint: roughly 8 ft wide, 19 ft deep from basket.
 */
export function basketballZone(
  x: number,
  y: number,
  side: 'left' | 'right'
): string {
  const basket: Point2D = side === 'left' ? { x: 5, y: 25 } : { x: 89, y: 25 };
  const dist = distance2D({ x, y }, basket);

  const THREE_POINT_RADIUS = 23.75;
  const CORNER_THREE_Y_LOW = 3;
  const CORNER_THREE_Y_HIGH = 47;
  const CORNER_DIST = 14;

  // Paint: within 8 ft of y=25 (lane width 16ft / 2 = 8), within 19 ft deep of basket
  const paintWidth = 8; // half lane width
  const paintDepth = 19;
  const inLane = Math.abs(y - 25) <= paintWidth;
  const inDepth =
    side === 'left'
      ? x >= basket.x && x <= basket.x + paintDepth
      : x <= basket.x && x >= basket.x - paintDepth;

  if (inLane && inDepth) return 'paint';

  // Three-point corner: sideline area within 14ft of basket
  const isCorner = (y < CORNER_THREE_Y_LOW || y > CORNER_THREE_Y_HIGH) && dist <= CORNER_DIST;
  if (isCorner) return 'three-point-corner';

  // Three-point arc (outside the arc)
  if (dist > THREE_POINT_RADIUS) {
    // Distinguish wing vs top based on angle from baseline
    const angleFromBasket = Math.abs(
      Math.atan2(y - 25, side === 'left' ? x - basket.x : basket.x - x)
    );
    if (angleFromBasket > Math.PI / 3) {
      return 'three-point-wing';
    }
    return 'three-point-top';
  }

  // Mid-range: inside three-point line but outside paint
  return 'mid-range';
}

/**
 * Hockey rink zone.
 * faceoffSideLeft: if true, defensive zone is at x=0-25, offensive 75-100.
 * Zones: 0-25 defensive, 25-75 neutral, 75-100 offensive.
 * If faceoffSideLeft is false, zones are flipped (x=0-25 is offensive).
 */
export function hockeyZone(
  xFeet: number,
  faceoffSideLeft: boolean
): 'defensive' | 'neutral' | 'offensive' {
  if (faceoffSideLeft) {
    if (xFeet <= 25) return 'defensive';
    if (xFeet <= 75) return 'neutral';
    return 'offensive';
  } else {
    if (xFeet >= 75) return 'defensive';
    if (xFeet >= 25) return 'neutral';
    return 'offensive';
  }
}

/**
 * Cricket field region based on angle from batsman perspective.
 * 8 regions, each 45 degrees:
 *   fine-leg (0-45), square-leg (45-90), mid-wicket (90-135), mid-on (135-180),
 *   mid-off (180-225), cover (225-270), point (270-315), third-man (315-360)
 */
export function cricketFieldRegion(angleDeg: number): string {
  // Normalize to [0, 360)
  const a = ((angleDeg % 360) + 360) % 360;
  const regions: readonly string[] = [
    'fine-leg',
    'square-leg',
    'mid-wicket',
    'mid-on',
    'mid-off',
    'cover',
    'point',
    'third-man',
  ];
  const idx = Math.min(Math.floor(a / 45), 7);
  return regions[idx] as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trajectory and Projectile Physics
// ─────────────────────────────────────────────────────────────────────────────

const G = 9.80665; // m/s²

/**
 * Horizontal range of a projectile in meters.
 * heightDiff: vertical difference (landing height - launch height), default 0.
 */
export function projectileRange(
  velocityMps: number,
  angleDeg: number,
  heightDiff = 0
): number {
  const theta = toRad(angleDeg);
  const v0x = velocityMps * Math.cos(theta);
  const v0y = velocityMps * Math.sin(theta);

  if (heightDiff === 0) {
    return (velocityMps * velocityMps * Math.sin(2 * theta)) / G;
  }

  // Solve quadratic: 0.5*G*t² - v0y*t - heightDiff = 0
  const a = 0.5 * G;
  const b = -v0y;
  const c = -heightDiff;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0;
  const t = (-b + Math.sqrt(discriminant)) / (2 * a);
  return v0x * t;
}

/**
 * Maximum height reached by a projectile above launch point, in meters.
 */
export function projectileMaxHeight(velocityMps: number, angleDeg: number): number {
  const theta = toRad(angleDeg);
  const v0y = velocityMps * Math.sin(theta);
  return (v0y * v0y) / (2 * G);
}

/**
 * Angle (degrees) that maximizes range for given velocity and height differential.
 * For flat terrain: 45°.
 */
export function optimalAngle(velocityMps: number, heightDiff = 0): number {
  if (heightDiff === 0) return 45;

  // Numerically find the angle that maximizes range
  let bestAngle = 45;
  let bestRange = -Infinity;
  for (let deg = 0.1; deg < 90; deg += 0.1) {
    const r = projectileRange(velocityMps, deg, heightDiff);
    if (r > bestRange) {
      bestRange = r;
      bestAngle = deg;
    }
  }
  return bestAngle;
}

/**
 * Exponential decay of football spin rate.
 * result = initialSpin * e^(-decayRate * time), decayRate default 0.1 per second
 */
export function footballSpinDecay(
  initialSpin: number,
  time: number,
  decayRate = 0.1
): number {
  return initialSpin * Math.exp(-decayRate * time);
}

/**
 * Discrete trajectory points of a projectile.
 * Returns steps+1 points from launch (t=0) to landing.
 * Default steps = 20.
 */
export function shotArc(
  velocityMps: number,
  angleDeg: number,
  steps = 20
): Point2D[] {
  const theta = toRad(angleDeg);
  const v0x = velocityMps * Math.cos(theta);
  const v0y = velocityMps * Math.sin(theta);

  // Total time of flight (flat terrain)
  const totalTime = (2 * v0y) / G;
  if (totalTime <= 0) return [{ x: 0, y: 0 }];

  const points: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalTime;
    const x = v0x * t;
    const y = v0y * t - 0.5 * G * t * t;
    points.push({ x, y });
  }
  return points;
}

/**
 * Simplified basketball make probability.
 * Base probability is 0.9 at the rim (distanceFt=0), decaying with distance.
 * Optimal angle ≈ 45 + arctan(heightDiffFt / distanceFt).
 * Angle deviation penalty: -0.01 per degree off optimal.
 */
export function basketballMakesProbability(
  distanceFt: number,
  heightDiffFt: number,
  velocityFtPerSec: number,
  angleDeg: number
): number {
  const BASE_PROB = 0.9;
  const DECAY = 0.03; // per foot

  // Distance decay
  let prob = BASE_PROB * Math.exp(-DECAY * distanceFt);

  // Optimal angle
  let optAngle = 45;
  if (distanceFt > 0) {
    optAngle = 45 + toDeg(Math.atan(heightDiffFt / distanceFt));
  }

  // Angle deviation penalty
  const angleDev = Math.abs(angleDeg - optAngle);
  prob -= 0.01 * angleDev;

  // velocityFtPerSec is unused in this simplified model (parameter kept for API)
  void velocityFtPerSec;

  return Math.max(0, Math.min(1, prob));
}
