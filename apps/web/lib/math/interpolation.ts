/**
 * Interpolation — pure TypeScript math library, zero dependencies.
 *
 * Covers basic scalar interpolation, linear/polynomial data interpolation,
 * splines, Bezier/easing curves, vector/multi-dimensional helpers, and
 * resampling utilities. All functions are side-effect free and operate on
 * plain numbers / {@link Point} records.
 *
 * Conventions:
 *  - Empty inputs return NaN (scalar) or [] (array) where noted.
 *  - Linear data interpolation expects points sorted ascending by x.
 *  - `noUncheckedIndexedAccess` is respected: every indexed read uses a
 *    `?? 0` fallback or an explicit guard.
 */

export interface Point {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// 1. Basic interpolation
// ---------------------------------------------------------------------------

/** Linear interpolation between `a` and `b` by parameter `t`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse of {@link lerp}: returns the `t` such that lerp(a, b, t) === value.
 * Returns 0 when a === b (degenerate range).
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) {
    return 0;
  }
  return (value - a) / (b - a);
}

/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/** Remap `value` from the input range to the output range (linear). */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

/**
 * Smoothstep — Hermite interpolation with zero first derivatives at the
 * edges. Returns 0 below edge0, 1 above edge1, smooth in between.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Smootherstep — Ken Perlin's improved variant with zero first AND second
 * derivatives at the edges.
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ---------------------------------------------------------------------------
// 2. Linear data interpolation
// ---------------------------------------------------------------------------

/**
 * Piecewise-linear interpolation over points sorted ascending by x.
 * Extrapolates flat (clamps to the end y-values) beyond the range.
 * Returns NaN for an empty input.
 */
export function linearInterpolate(points: Point[], x: number): number {
  if (points.length === 0) {
    return NaN;
  }
  const first = points[0] ?? { x: 0, y: NaN };
  if (points.length === 1) {
    return first.y;
  }
  const last = points[points.length - 1] ?? first;
  if (x <= first.x) {
    return first.y;
  }
  if (x >= last.x) {
    return last.y;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i] ?? first;
    const p1 = points[i + 1] ?? last;
    if (x >= p0.x && x <= p1.x) {
      if (p1.x === p0.x) {
        return p0.y;
      }
      const t = (x - p0.x) / (p1.x - p0.x);
      return lerp(p0.y, p1.y, t);
    }
  }
  return last.y;
}

/**
 * Bilinear interpolation on a rectangular grid cell. q11..q22 are the corner
 * values at (x1,y1), (x1,y2), (x2,y1), (x2,y2) respectively.
 */
export function bilinearInterpolate(
  q11: number,
  q12: number,
  q21: number,
  q22: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  x: number,
  y: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return q11;
  }
  const tx = dx === 0 ? 0 : (x - x1) / dx;
  const ty = dy === 0 ? 0 : (y - y1) / dy;
  const r1 = lerp(q11, q21, tx); // along x at y1
  const r2 = lerp(q12, q22, tx); // along x at y2
  return lerp(r1, r2, ty);
}

/**
 * Nearest-neighbor interpolation: returns the y of the point whose x is
 * closest to the query. Returns NaN for an empty input.
 */
export function nearestNeighbor(points: Point[], x: number): number {
  if (points.length === 0) {
    return NaN;
  }
  let best = points[0] ?? { x: 0, y: NaN };
  let bestDist = Math.abs(best.x - x);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (!p) {
      continue;
    }
    const d = Math.abs(p.x - x);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best.y;
}

/**
 * Step (zero-order hold) interpolation: returns the y of the last point with
 * px <= x. Before the first point, returns the first y. NaN if empty.
 */
export function stepInterpolate(points: Point[], x: number): number {
  if (points.length === 0) {
    return NaN;
  }
  const first = points[0] ?? { x: 0, y: NaN };
  let result = first.y;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) {
      continue;
    }
    if (p.x <= x) {
      result = p.y;
    } else {
      break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. Polynomial interpolation
// ---------------------------------------------------------------------------

/**
 * Lagrange polynomial interpolation evaluated at x.
 * Returns NaN for an empty input.
 */
export function lagrangeInterpolate(points: Point[], x: number): number {
  const n = points.length;
  if (n === 0) {
    return NaN;
  }
  let result = 0;
  for (let i = 0; i < n; i++) {
    const pi = points[i];
    if (!pi) {
      continue;
    }
    let term = pi.y;
    for (let j = 0; j < n; j++) {
      if (j === i) {
        continue;
      }
      const pj = points[j];
      if (!pj) {
        continue;
      }
      const denom = pi.x - pj.x;
      if (denom === 0) {
        continue;
      }
      term *= (x - pj.x) / denom;
    }
    result += term;
  }
  return result;
}

/**
 * Newton's forward-difference interpolation for equally spaced points.
 * Returns NaN for empty input; the y of the single point when n === 1.
 */
export function newtonForwardDifference(points: Point[], x: number): number {
  const n = points.length;
  if (n === 0) {
    return NaN;
  }
  const first = points[0] ?? { x: 0, y: NaN };
  if (n === 1) {
    return first.y;
  }
  const second = points[1] ?? first;
  const h = second.x - first.x;
  if (h === 0) {
    return first.y;
  }

  // Forward-difference table; difference[0] is the y-values themselves.
  const diff: number[] = [];
  for (let i = 0; i < n; i++) {
    diff[i] = (points[i] ?? first).y;
  }
  const leading: number[] = [diff[0] ?? 0];
  for (let level = 1; level < n; level++) {
    for (let i = 0; i < n - level; i++) {
      diff[i] = (diff[i + 1] ?? 0) - (diff[i] ?? 0);
    }
    leading[level] = diff[0] ?? 0;
  }

  const s = (x - first.x) / h;
  let result = leading[0] ?? 0;
  let term = 1;
  let factorial = 1;
  for (let k = 1; k < n; k++) {
    term *= s - (k - 1);
    factorial *= k;
    result += (term / factorial) * (leading[k] ?? 0);
  }
  return result;
}

/**
 * Neville's algorithm for polynomial interpolation at x.
 * Numerically stable alternative to direct Lagrange. NaN if empty.
 */
export function nevilleInterpolate(points: Point[], x: number): number {
  const n = points.length;
  if (n === 0) {
    return NaN;
  }
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    p[i] = (points[i] ?? { x: 0, y: NaN }).y;
  }
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      const xi = (points[i] ?? { x: 0, y: 0 }).x;
      const xij = (points[i + j] ?? { x: 0, y: 0 }).x;
      const denom = xi - xij;
      if (denom === 0) {
        continue;
      }
      const pi = p[i] ?? 0;
      const pi1 = p[i + 1] ?? 0;
      p[i] = ((x - xij) * pi - (x - xi) * pi1) / denom;
    }
  }
  return p[0] ?? NaN;
}

// ---------------------------------------------------------------------------
// 4. Spline interpolation
// ---------------------------------------------------------------------------

/**
 * Natural cubic spline. Returns an evaluator function f(x).
 * Natural boundary conditions: second derivative = 0 at both ends.
 * Passes exactly through every knot. Extrapolates flat outside the range.
 */
export function cubicSplineNatural(points: Point[]): (x: number) => number {
  const n = points.length;
  if (n === 0) {
    return () => NaN;
  }
  if (n === 1) {
    const only = points[0] ?? { x: 0, y: NaN };
    return () => only.y;
  }
  if (n === 2) {
    // A spline with two points is just a line segment.
    return (x: number) => linearInterpolate(points, x);
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const pt = points[i] ?? { x: 0, y: 0 };
    xs[i] = pt.x;
    ys[i] = pt.y;
  }

  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = (xs[i + 1] ?? 0) - (xs[i] ?? 0);
  }

  // Solve the tridiagonal system for the second derivatives (m).
  const alpha: number[] = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const hPrev = h[i - 1] ?? 0;
    const hCur = h[i] ?? 0;
    const yNext = ys[i + 1] ?? 0;
    const yCur = ys[i] ?? 0;
    const yPrev = ys[i - 1] ?? 0;
    alpha[i] =
      (3 / (hCur || 1)) * (yNext - yCur) - (3 / (hPrev || 1)) * (yCur - yPrev);
  }

  const l: number[] = new Array<number>(n).fill(0);
  const mu: number[] = new Array<number>(n).fill(0);
  const z: number[] = new Array<number>(n).fill(0);
  l[0] = 1;
  for (let i = 1; i < n - 1; i++) {
    const xNext = xs[i + 1] ?? 0;
    const xPrev = xs[i - 1] ?? 0;
    const hPrev = h[i - 1] ?? 0;
    l[i] = 2 * (xNext - xPrev) - hPrev * (mu[i - 1] ?? 0);
    mu[i] = (h[i] ?? 0) / (l[i] || 1);
    z[i] = ((alpha[i] ?? 0) - hPrev * (z[i - 1] ?? 0)) / (l[i] || 1);
  }
  l[n - 1] = 1;

  const m: number[] = new Array<number>(n).fill(0); // second derivatives
  const b: number[] = new Array<number>(n).fill(0);
  const c: number[] = new Array<number>(n).fill(0);
  const d: number[] = new Array<number>(n).fill(0);
  for (let j = n - 2; j >= 0; j--) {
    c[j] = (z[j] ?? 0) - (mu[j] ?? 0) * (c[j + 1] ?? 0);
    const hj = h[j] ?? 0;
    const yNext = ys[j + 1] ?? 0;
    const yCur = ys[j] ?? 0;
    b[j] =
      (yNext - yCur) / (hj || 1) -
      (hj * ((c[j + 1] ?? 0) + 2 * (c[j] ?? 0))) / 3;
    d[j] = ((c[j + 1] ?? 0) - (c[j] ?? 0)) / (3 * (hj || 1));
    m[j] = c[j] ?? 0;
  }

  return (x: number): number => {
    const x0 = xs[0] ?? 0;
    const xn = xs[n - 1] ?? 0;
    if (x <= x0) {
      return ys[0] ?? NaN;
    }
    if (x >= xn) {
      return ys[n - 1] ?? NaN;
    }
    // Locate the interval [xs[i], xs[i+1]].
    let i = 0;
    for (let k = 0; k < n - 1; k++) {
      if (x >= (xs[k] ?? 0) && x <= (xs[k + 1] ?? 0)) {
        i = k;
        break;
      }
    }
    const dx = x - (xs[i] ?? 0);
    return (
      (ys[i] ?? 0) +
      (b[i] ?? 0) * dx +
      (c[i] ?? 0) * dx * dx +
      (d[i] ?? 0) * dx * dx * dx
    );
  };
}

/**
 * Monotonicity-preserving cubic interpolation (Fritsch–Carlson).
 * Returns an evaluator f(x) that passes through every knot without
 * introducing overshoot. Extrapolates flat outside the range.
 */
export function monotonicCubic(points: Point[]): (x: number) => number {
  const n = points.length;
  if (n === 0) {
    return () => NaN;
  }
  if (n === 1) {
    const only = points[0] ?? { x: 0, y: NaN };
    return () => only.y;
  }
  if (n === 2) {
    return (x: number) => linearInterpolate(points, x);
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const pt = points[i] ?? { x: 0, y: 0 };
    xs[i] = pt.x;
    ys[i] = pt.y;
  }

  // Secant slopes between consecutive points.
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1] ?? 0) - (xs[i] ?? 0);
    delta[i] = dx === 0 ? 0 : ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / dx;
  }

  // Initial tangents.
  const tangent: number[] = new Array<number>(n).fill(0);
  tangent[0] = delta[0] ?? 0;
  tangent[n - 1] = delta[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const dPrev = delta[i - 1] ?? 0;
    const dCur = delta[i] ?? 0;
    if (dPrev * dCur <= 0) {
      tangent[i] = 0;
    } else {
      tangent[i] = (dPrev + dCur) / 2;
    }
  }

  // Fritsch–Carlson adjustment to preserve monotonicity.
  for (let i = 0; i < n - 1; i++) {
    const d = delta[i] ?? 0;
    if (d === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = (tangent[i] ?? 0) / d;
    const b = (tangent[i + 1] ?? 0) / d;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      tangent[i] = tau * a * d;
      tangent[i + 1] = tau * b * d;
    }
  }

  return (x: number): number => {
    const x0 = xs[0] ?? 0;
    const xn = xs[n - 1] ?? 0;
    if (x <= x0) {
      return ys[0] ?? NaN;
    }
    if (x >= xn) {
      return ys[n - 1] ?? NaN;
    }
    let i = 0;
    for (let k = 0; k < n - 1; k++) {
      if (x >= (xs[k] ?? 0) && x <= (xs[k + 1] ?? 0)) {
        i = k;
        break;
      }
    }
    const h = (xs[i + 1] ?? 0) - (xs[i] ?? 0);
    if (h === 0) {
      return ys[i] ?? 0;
    }
    const t = (x - (xs[i] ?? 0)) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    // Cubic Hermite basis functions.
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return (
      h00 * (ys[i] ?? 0) +
      h10 * h * (tangent[i] ?? 0) +
      h01 * (ys[i + 1] ?? 0) +
      h11 * h * (tangent[i + 1] ?? 0)
    );
  };
}

/**
 * Catmull–Rom spline segment. Interpolates between p1 and p2 using the
 * surrounding control points p0 and p3. t in [0,1]; t=0 -> p1, t=1 -> p2.
 */
export function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Cubic Hermite interpolation between p0 and p1 with tangents m0 and m1.
 * t in [0,1]; t=0 -> p0, t=1 -> p1.
 */
export function hermite(
  p0: number,
  p1: number,
  m0: number,
  m1: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

// ---------------------------------------------------------------------------
// 5. Easing-style interpolation
// ---------------------------------------------------------------------------

/**
 * Cosine interpolation between a and b. Smooth at both endpoints.
 * t=0 -> a, t=1 -> b.
 */
export function cosineInterpolate(a: number, b: number, t: number): number {
  const t2 = (1 - Math.cos(t * Math.PI)) / 2;
  return a * (1 - t2) + b * t2;
}

/**
 * Catmull–Rom style cubic interpolation between y1 and y2 using neighbors
 * y0 and y3 (the classic "cubic interpolate" formulation). t in [0,1].
 */
export function cubicInterpolate(
  y0: number,
  y1: number,
  y2: number,
  y3: number,
  t: number,
): number {
  const t2 = t * t;
  const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
  const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const a2 = -0.5 * y0 + 0.5 * y2;
  const a3 = y1;
  return a0 * t * t2 + a1 * t2 + a2 * t + a3;
}

/** Quadratic Bezier between p0 and p2 with control point p1. t in [0,1]. */
export function quadraticBezier(
  p0: number,
  p1: number,
  p2: number,
  t: number,
): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

/** Cubic Bezier between p0 and p3 with control points p1 and p2. t in [0,1]. */
export function cubicBezier(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return (
    mt2 * mt * p0 +
    3 * mt2 * t * p1 +
    3 * mt * t2 * p2 +
    t2 * t * p3
  );
}

// ---------------------------------------------------------------------------
// 6. Multi-dimensional / vector
// ---------------------------------------------------------------------------

/**
 * Element-wise linear interpolation between two equal-length vectors.
 * Throws if the lengths differ.
 */
export function lerpArray(a: number[], b: number[], t: number): number[] {
  if (a.length !== b.length) {
    throw new Error(
      `lerpArray: length mismatch (${a.length} vs ${b.length})`,
    );
  }
  const result: number[] = [];
  for (let i = 0; i < a.length; i++) {
    result[i] = lerp(a[i] ?? 0, b[i] ?? 0, t);
  }
  return result;
}

/**
 * Spherical/angular linear interpolation between two angles (radians),
 * taking the shortest path around the circle. t in [0,1].
 */
export function slerp(a: number, b: number, t: number): number {
  const twoPi = Math.PI * 2;
  let diff = b - a;
  // Wrap the difference into (-PI, PI] for the shortest path.
  diff = ((diff % twoPi) + twoPi) % twoPi;
  if (diff > Math.PI) {
    diff -= twoPi;
  }
  return a + diff * t;
}

/**
 * Linear interpolation between two RGB colors (each channel 0–255).
 * Returns a new [r, g, b] tuple; channels are not rounded.
 */
export function interpolateColors(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
  ];
}

// ---------------------------------------------------------------------------
// 7. Resampling & utilities
// ---------------------------------------------------------------------------

/**
 * Resample a set of points to `count` evenly spaced samples across the
 * x-range, using piecewise-linear interpolation. Returns [] when there are
 * fewer than 2 points or count <= 0.
 */
export function resample(points: Point[], count: number): Point[] {
  if (points.length < 2 || count <= 0) {
    return [];
  }
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[points.length - 1] ?? first;
  const xMin = first.x;
  const xMax = last.x;
  const out: Point[] = [];
  if (count === 1) {
    return [{ x: xMin, y: linearInterpolate(points, xMin) }];
  }
  const span = xMax - xMin;
  for (let i = 0; i < count; i++) {
    const x = xMin + (span * i) / (count - 1);
    out.push({ x, y: linearInterpolate(points, x) });
  }
  return out;
}

/**
 * Fill `null` gaps in a series by linear interpolation between the nearest
 * known neighbors. Leading/trailing nulls are flat-extrapolated from the
 * first/last known value. If the series has no known values, returns zeros.
 */
export function movingInterpolateFill(values: (number | null)[]): number[] {
  const n = values.length;
  const out: number[] = new Array<number>(n).fill(0);
  if (n === 0) {
    return out;
  }

  // Index of the first known value.
  let firstKnown = -1;
  for (let i = 0; i < n; i++) {
    if (values[i] !== null && values[i] !== undefined) {
      firstKnown = i;
      break;
    }
  }
  if (firstKnown === -1) {
    return out; // all null -> zeros
  }

  // Index of the last known value.
  let lastKnown = firstKnown;
  for (let i = n - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] !== undefined) {
      lastKnown = i;
      break;
    }
  }

  const firstVal = values[firstKnown] ?? 0;
  const lastVal = values[lastKnown] ?? 0;

  // Leading nulls -> flat-extrapolate.
  for (let i = 0; i < firstKnown; i++) {
    out[i] = firstVal;
  }
  // Trailing nulls -> flat-extrapolate.
  for (let i = lastKnown + 1; i < n; i++) {
    out[i] = lastVal;
  }

  // Interior: walk known anchors, linearly filling gaps between them.
  let prevIdx = firstKnown;
  out[firstKnown] = firstVal;
  for (let i = firstKnown + 1; i <= lastKnown; i++) {
    const v = values[i];
    if (v !== null && v !== undefined) {
      const prevVal = values[prevIdx] ?? 0;
      const gap = i - prevIdx;
      for (let k = 1; k < gap; k++) {
        const t = k / gap;
        out[prevIdx + k] = lerp(prevVal, v, t);
      }
      out[i] = v;
      prevIdx = i;
    }
  }

  return out;
}

/**
 * Find the indices of the points bracketing `x` (points sorted ascending by
 * x). Returns { lower, upper } with lower+1 === upper, or null if x is
 * outside the data range or there are fewer than 2 points.
 */
export function findBracket(
  points: Point[],
  x: number,
): { lower: number; upper: number } | null {
  const n = points.length;
  if (n < 2) {
    return null;
  }
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[n - 1] ?? first;
  if (x < first.x || x > last.x) {
    return null;
  }
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i] ?? first;
    const p1 = points[i + 1] ?? last;
    if (x >= p0.x && x <= p1.x) {
      return { lower: i, upper: i + 1 };
    }
  }
  return null;
}
