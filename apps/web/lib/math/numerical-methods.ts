/**
 * Pure TypeScript numerical methods library for Galaxy Sports Edge.
 * Zero npm dependencies — Node/ES built-ins only.
 */

// ---------------------------------------------------------------------------
// 1. Root finding
// ---------------------------------------------------------------------------

/** Bisection method: find root of f in [a, b]. Throws if no sign change. */
export function bisection(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-10,
  maxIter = 100
): number {
  let fa = f(a);
  const fb = f(b);
  if (fa * fb > 0) {
    throw new Error(
      `bisection: f(a) and f(b) must have opposite signs (f(${a})=${fa}, f(${b})=${fb})`
    );
  }
  let lo = a;
  let hi = b;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < tol || (hi - lo) / 2 < tol) return mid;
    if (fa * fm < 0) {
      hi = mid;
    } else {
      lo = mid;
      fa = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Newton-Raphson: find root near x0. Throws if derivative is near zero. */
export function newtonRaphson(
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  tol = 1e-10,
  maxIter = 100
): number {
  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x);
    if (Math.abs(fx) < tol) return x;
    const dfx = df(x);
    if (Math.abs(dfx) < 1e-14) {
      throw new Error(`newtonRaphson: derivative near zero at x=${x}`);
    }
    x = x - fx / dfx;
  }
  return x;
}

/** Secant method: find root using two initial guesses. */
export function secantMethod(
  f: (x: number) => number,
  x0: number,
  x1: number,
  tol = 1e-10,
  maxIter = 100
): number {
  let xPrev = x0;
  let xCurr = x1;
  for (let i = 0; i < maxIter; i++) {
    const fPrev = f(xPrev);
    const fCurr = f(xCurr);
    if (Math.abs(fCurr) < tol) return xCurr;
    const denom = fCurr - fPrev;
    if (Math.abs(denom) < 1e-14) break;
    const xNext = xCurr - fCurr * ((xCurr - xPrev) / denom);
    xPrev = xCurr;
    xCurr = xNext;
  }
  return xCurr;
}

/**
 * Brent's method: robust root finding combining bisection, secant, and
 * inverse quadratic interpolation. Requires f(a)*f(b) < 0.
 */
export function brentMethod(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-10,
  maxIter = 100
): number {
  let fa = f(a);
  let fb = f(b);
  if (fa * fb > 0) {
    throw new Error(
      `brentMethod: f(a) and f(b) must have opposite signs (f(${a})=${fa}, f(${b})=${fb})`
    );
  }
  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }
  let c = a;
  let fc = fa;
  let mflag = true;
  let s = 0;
  let d = 0;
  for (let i = 0; i < maxIter; i++) {
    if (Math.abs(b - a) < tol || Math.abs(fb) < tol) return b;
    if (fa !== fc && fb !== fc) {
      // Inverse quadratic interpolation
      s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb));
    } else {
      // Secant
      s = b - fb * ((b - a) / (fb - fa));
    }
    const cond1 = !((3 * a + b) / 4 < s && s < b) && !((3 * a + b) / 4 > s && s > b);
    const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
    const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
    const cond4 = mflag && Math.abs(b - c) < tol;
    const cond5 = !mflag && Math.abs(c - d) < tol;
    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = (a + b) / 2;
      mflag = true;
    } else {
      mflag = false;
    }
    const fs = f(s);
    d = c;
    c = b;
    fc = fb;
    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }
    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
  }
  return b;
}

/** False position (Regula Falsi): requires sign change on [a, b]. */
export function falsePosition(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-10,
  maxIter = 100
): number {
  let fa = f(a);
  const fb0 = f(b);
  if (fa * fb0 > 0) {
    throw new Error(
      `falsePosition: f(a) and f(b) must have opposite signs`
    );
  }
  let lo = a;
  let hi = b;
  let flo = fa;
  let fhi = fb0;
  for (let i = 0; i < maxIter; i++) {
    const c = (lo * fhi - hi * flo) / (fhi - flo);
    const fc = f(c);
    if (Math.abs(fc) < tol) return c;
    if (flo * fc < 0) {
      hi = c;
      fhi = fc;
    } else {
      lo = c;
      flo = fc;
    }
  }
  return (lo * fhi - hi * flo) / (fhi - flo);
}

// ---------------------------------------------------------------------------
// 2. Numerical integration
// ---------------------------------------------------------------------------

/** Trapezoidal rule: ∫[a,b] f(x) dx. n default 1000. */
export function trapezoidalRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 1000
): number {
  const h = (b - a) / n;
  let sum = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) {
    sum += f(a + i * h);
  }
  return sum * h;
}

/** Simpson's 1/3 rule. n must be even; default 1000. */
export function simpsonsRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 1000
): number {
  if (n % 2 !== 0) throw new Error(`simpsonsRule: n must be even, got ${n}`);
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (sum * h) / 3;
}

/** Simpson's 3/8 rule. n must be divisible by 3; default 999. */
export function simpsonsThreeEighths(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 999
): number {
  if (n % 3 !== 0)
    throw new Error(`simpsonsThreeEighths: n must be divisible by 3, got ${n}`);
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    sum += f(a + i * h) * (i % 3 === 0 ? 2 : 3);
  }
  return (3 * sum * h) / 8;
}

// Gauss-Legendre nodes and weights on [-1, 1]
const GL_NODES_WEIGHTS: Record<
  2 | 3 | 4 | 5,
  { nodes: number[]; weights: number[] }
> = {
  2: {
    nodes: [-0.5773502691896257, 0.5773502691896257],
    weights: [1.0, 1.0],
  },
  3: {
    nodes: [-0.7745966692414834, 0.0, 0.7745966692414834],
    weights: [0.5555555555555556, 0.8888888888888888, 0.5555555555555556],
  },
  4: {
    nodes: [
      -0.8611363115940526,
      -0.3399810435848563,
      0.3399810435848563,
      0.8611363115940526,
    ],
    weights: [
      0.3478548451374538,
      0.6521451548625461,
      0.6521451548625461,
      0.3478548451374538,
    ],
  },
  5: {
    nodes: [
      -0.9061798459386640,
      -0.5384693101056831,
      0.0,
      0.5384693101056831,
      0.9061798459386640,
    ],
    weights: [
      0.2369268850561891,
      0.4786286704993665,
      0.5688888888888889,
      0.4786286704993665,
      0.2369268850561891,
    ],
  },
};

/** Gaussian (Gauss-Legendre) quadrature with 2, 3, 4, or 5 points. */
export function gaussianQuadrature(
  f: (x: number) => number,
  a: number,
  b: number,
  points: 2 | 3 | 4 | 5 = 5
): number {
  const { nodes, weights } = GL_NODES_WEIGHTS[points];
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  let sum = 0;
  for (let i = 0; i < nodes.length; i++) {
    sum += (weights[i] ?? 0) * f(mid + half * (nodes[i] ?? 0));
  }
  return half * sum;
}

/** Romberg integration via Richardson extrapolation. maxLevel default 6. */
export function rombergIntegration(
  f: (x: number) => number,
  a: number,
  b: number,
  maxLevel = 6
): number {
  const R: number[][] = [];
  for (let i = 0; i <= maxLevel; i++) {
    R.push(new Array<number>(i + 1).fill(0));
  }
  // First column: trapezoidal approximations
  R[0]![0] = ((f(a) + f(b)) * (b - a)) / 2;
  for (let i = 1; i <= maxLevel; i++) {
    const h = (b - a) / Math.pow(2, i);
    const n = Math.pow(2, i - 1);
    let sum = 0;
    for (let k = 1; k <= n; k++) {
      sum += f(a + (2 * k - 1) * h);
    }
    R[i]![0] = R[i - 1]![0]! / 2 + sum * h;
    for (let j = 1; j <= i; j++) {
      const factor = Math.pow(4, j);
      R[i]![j] = (factor * R[i]![j - 1]! - R[i - 1]![j - 1]!) / (factor - 1);
    }
  }
  return R[maxLevel]![maxLevel]!;
}

/** Adaptive Simpson's quadrature (recursive). tol default 1e-6. */
export function adaptiveSimpsons(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-6
): number {
  const c = (a + b) / 2;
  const fa = f(a);
  const fc = f(c);
  const fb = f(b);
  const whole = ((b - a) / 6) * (fa + 4 * fc + fb);

  function recurse(
    lo: number,
    hi: number,
    flо: number,
    fmid: number,
    fhi: number,
    wholeVal: number,
    depth: number
  ): number {
    const mid = (lo + hi) / 2;
    const lm = (lo + mid) / 2;
    const rm = (mid + hi) / 2;
    const flm = f(lm);
    const frm = f(rm);
    const fmidNew = f(mid);
    const left = ((mid - lo) / 6) * (flо + 4 * flm + fmidNew);
    const right = ((hi - mid) / 6) * (fmidNew + 4 * frm + fhi);
    const delta = left + right - wholeVal;
    if (depth >= 50 || Math.abs(delta) <= 15 * tol * ((hi - lo) / (b - a))) {
      return left + right + delta / 15;
    }
    const halfTol = tol / 2;
    return (
      recurse(lo, mid, flо, flm, fmidNew, left, depth + 1) +
      recurse(mid, hi, fmidNew, frm, fhi, right, depth + 1)
    );
  }

  return recurse(a, b, fa, fc, fb, whole, 0);
}

// ---------------------------------------------------------------------------
// 3. ODE solvers
// ---------------------------------------------------------------------------

/** Euler method for dy/dt = f(t, y). Returns array of {t, y} points. */
export function eulerMethod(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  h: number,
  steps: number
): Array<{ t: number; y: number }> {
  const result: Array<{ t: number; y: number }> = [{ t: t0, y: y0 }];
  let t = t0;
  let y = y0;
  for (let i = 0; i < steps; i++) {
    y = y + h * f(t, y);
    t = t + h;
    result.push({ t, y });
  }
  return result;
}

/** 4th-order Runge-Kutta for dy/dt = f(t, y). */
export function rk4(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  h: number,
  steps: number
): Array<{ t: number; y: number }> {
  const result: Array<{ t: number; y: number }> = [{ t: t0, y: y0 }];
  let t = t0;
  let y = y0;
  for (let i = 0; i < steps; i++) {
    const k1 = h * f(t, y);
    const k2 = h * f(t + h / 2, y + k1 / 2);
    const k3 = h * f(t + h / 2, y + k2 / 2);
    const k4 = h * f(t + h, y + k3);
    y = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    t = t + h;
    result.push({ t, y });
  }
  return result;
}

/** 4th-order Runge-Kutta for a system of ODEs. */
export function rk4System(
  fs: Array<(t: number, ys: number[]) => number>,
  t0: number,
  y0s: number[],
  h: number,
  steps: number
): Array<{ t: number; ys: number[] }> {
  const n = fs.length;
  const result: Array<{ t: number; ys: number[] }> = [
    { t: t0, ys: [...y0s] },
  ];
  let t = t0;
  let ys = [...y0s];
  for (let i = 0; i < steps; i++) {
    const k1 = fs.map((f) => h * f(t, ys));
    const y2 = ys.map((y, j) => y + (k1[j] ?? 0) / 2);
    const k2 = fs.map((f) => h * f(t + h / 2, y2));
    const y3 = ys.map((y, j) => y + (k2[j] ?? 0) / 2);
    const k3 = fs.map((f) => h * f(t + h / 2, y3));
    const y4 = ys.map((y, j) => y + (k3[j] ?? 0));
    const k4 = fs.map((f) => h * f(t + h, y4));
    ys = ys.map(
      (y, j) =>
        y + ((k1[j] ?? 0) + 2 * (k2[j] ?? 0) + 2 * (k3[j] ?? 0) + (k4[j] ?? 0)) / 6
    );
    t = t + h;
    result.push({ t, ys: [...ys] });
  }
  return result;
}

/**
 * Adaptive RK45 (Dormand-Prince) embedded pair.
 * tol default 1e-6; max 10000 steps.
 */
export function adaptiveRK45(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  t_end: number,
  tol = 1e-6
): Array<{ t: number; y: number }> {
  // Dormand-Prince coefficients
  const c2 = 1 / 5,
    c3 = 3 / 10,
    c4 = 4 / 5,
    c5 = 8 / 9;
  const a21 = 1 / 5;
  const a31 = 3 / 40,
    a32 = 9 / 40;
  const a41 = 44 / 45,
    a42 = -56 / 15,
    a43 = 32 / 9;
  const a51 = 19372 / 6561,
    a52 = -25360 / 2187,
    a53 = 64448 / 6561,
    a54 = -212 / 729;
  const a61 = 9017 / 3168,
    a62 = -355 / 33,
    a63 = 46732 / 5247,
    a64 = 49 / 176,
    a65 = -5103 / 18656;
  // 5th order weights
  const b1 = 35 / 384,
    b3 = 500 / 1113,
    b4 = 125 / 192,
    b5 = -2187 / 6784,
    b6 = 11 / 84;
  // Error coefficients (difference between 4th and 5th order)
  const e1 = 71 / 57600,
    e3 = -71 / 16695,
    e4 = 71 / 1920,
    e5 = -17253 / 339200,
    e6 = 22 / 525,
    e7 = -1 / 40;

  const result: Array<{ t: number; y: number }> = [{ t: t0, y: y0 }];
  let t = t0;
  let y = y0;
  let h = (t_end - t0) / 100;
  const hMin = 1e-12;
  const hMax = (t_end - t0) / 10;
  let steps = 0;
  const maxSteps = 10000;

  while (t < t_end && steps < maxSteps) {
    if (t + h > t_end) h = t_end - t;
    const k1 = h * f(t, y);
    const k2 = h * f(t + c2 * h, y + a21 * k1);
    const k3 = h * f(t + c3 * h, y + a31 * k1 + a32 * k2);
    const k4 = h * f(t + c4 * h, y + a41 * k1 + a42 * k2 + a43 * k3);
    const k5 = h * f(
      t + c5 * h,
      y + a51 * k1 + a52 * k2 + a53 * k3 + a54 * k4
    );
    const k6 = h * f(
      t + h,
      y + a61 * k1 + a62 * k2 + a63 * k3 + a64 * k4 + a65 * k5
    );
    const yNew = y + b1 * k1 + b3 * k3 + b4 * k4 + b5 * k5 + b6 * k6;
    const k7 = h * f(t + h, yNew);
    // Error estimate
    const err = Math.abs(
      e1 * k1 + e3 * k3 + e4 * k4 + e5 * k5 + e6 * k6 + e7 * k7
    );
    const sc = tol * (1 + Math.max(Math.abs(y), Math.abs(yNew)));
    const errNorm = err / sc;

    if (errNorm <= 1.0) {
      t = t + h;
      y = yNew;
      result.push({ t, y });
      steps++;
      // Adjust step size
      const factor = Math.min(5.0, 0.9 * Math.pow(errNorm + 1e-10, -0.2));
      h = Math.min(h * factor, hMax);
    } else {
      const factor = Math.max(0.1, 0.9 * Math.pow(errNorm, -0.2));
      h = h * factor;
      if (h < hMin) {
        t = t + h;
        y = yNew;
        result.push({ t, y });
        steps++;
        h = hMin;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. Interpolation
// ---------------------------------------------------------------------------

/** Linear interpolation between (x0, y0) and (x1, y1). */
export function linearInterpolate(
  x: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** Lagrange polynomial interpolation at x given data points (xs, ys). */
export function lagrangeInterpolation(
  xs: number[],
  ys: number[],
  x: number
): number {
  const n = xs.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let term = ys[i] ?? 0;
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        term *= (x - (xs[j] ?? 0)) / ((xs[i] ?? 0) - (xs[j] ?? 0));
      }
    }
    result += term;
  }
  return result;
}

/** Newton's divided differences interpolation at x. */
export function newtonDividedDifference(
  xs: number[],
  ys: number[],
  x: number
): number {
  const n = xs.length;
  // Build divided difference table
  const dd = ys.map((y) => y);
  const coeffs = [dd[0] ?? 0];
  for (let j = 1; j < n; j++) {
    for (let i = n - 1; i >= j; i--) {
      dd[i] = ((dd[i] ?? 0) - (dd[i - 1] ?? 0)) / ((xs[i] ?? 0) - (xs[i - j] ?? 0));
    }
    coeffs.push(dd[j] ?? 0);
  }
  // Evaluate Newton's polynomial
  let result = coeffs[n - 1] ?? 0;
  for (let i = n - 2; i >= 0; i--) {
    result = result * (x - (xs[i] ?? 0)) + (coeffs[i] ?? 0);
  }
  return result;
}

/**
 * Natural cubic spline interpolation.
 * Returns a function that evaluates the spline at any x.
 * Natural boundary: S''(x0) = S''(xn) = 0.
 * Throws if xs not sorted or length < 2.
 */
export function cubicSplineNatural(
  xs: number[],
  ys: number[]
): (x: number) => number {
  const n = xs.length;
  if (n < 2) throw new Error("cubicSplineNatural: need at least 2 points");
  for (let i = 1; i < n; i++) {
    if ((xs[i] ?? 0) <= (xs[i - 1] ?? 0)) {
      throw new Error("cubicSplineNatural: xs must be strictly increasing");
    }
  }
  const m = n - 1; // number of intervals
  const h = new Array<number>(m);
  for (let i = 0; i < m; i++) {
    h[i] = (xs[i + 1] ?? 0) - (xs[i] ?? 0);
  }
  // Set up tridiagonal system for the second derivatives (sigma)
  const rhs = new Array<number>(n).fill(0);
  for (let i = 1; i < m; i++) {
    rhs[i] =
      3 *
      (((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / (h[i] ?? 1) -
        ((ys[i] ?? 0) - (ys[i - 1] ?? 0)) / (h[i - 1] ?? 1));
  }
  // Natural: sigma[0] = sigma[n-1] = 0
  const sigma = new Array<number>(n).fill(0);
  const diag = new Array<number>(n).fill(2);
  const lower = new Array<number>(n).fill(0);
  const upper = new Array<number>(n).fill(0);
  for (let i = 1; i < m; i++) {
    lower[i] = (h[i - 1] ?? 0) / ((h[i - 1] ?? 0) + (h[i] ?? 0));
    upper[i] = 1 - (lower[i] ?? 0);
  }
  // Thomas algorithm
  const c_ = new Array<number>(n).fill(0);
  const d_ = new Array<number>(n).fill(0);
  c_[0] = 0;
  d_[0] = 0;
  for (let i = 1; i < m; i++) {
    const w = lower[i]! / diag[i - 1]!;
    diag[i] = diag[i]! - w * upper[i - 1]!;
    d_[i] = rhs[i]! - w * d_[i - 1]!;
  }
  sigma[m - 1] = 0;
  for (let i = m - 2; i >= 1; i--) {
    sigma[i] = (d_[i]! - upper[i]! * sigma[i + 1]!) / diag[i]!;
  }
  // Build spline coefficients for each interval
  const a = ys;
  const b_ = new Array<number>(m);
  const c2 = new Array<number>(m);
  const d2 = new Array<number>(m);
  for (let i = 0; i < m; i++) {
    a[i] = ys[i] ?? 0;
    b_[i] =
      ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / (h[i] ?? 1) -
      ((h[i] ?? 0) * (2 * (sigma[i] ?? 0) + (sigma[i + 1] ?? 0))) / 3;
    c2[i] = sigma[i] ?? 0;
    d2[i] =
      ((sigma[i + 1] ?? 0) - (sigma[i] ?? 0)) / (3 * (h[i] ?? 1));
  }

  return (x: number): number => {
    // Find interval
    let lo = 0;
    let hi = m - 1;
    if (x <= (xs[0] ?? 0)) {
      // extrapolate left
      const dx = x - (xs[0] ?? 0);
      return (a[0] ?? 0) + (b_[0] ?? 0) * dx + (c2[0] ?? 0) * dx * dx + (d2[0] ?? 0) * dx * dx * dx;
    }
    if (x >= (xs[m] ?? 0)) {
      // extrapolate right
      const dx = x - (xs[m - 1] ?? 0);
      return (
        (a[m - 1] ?? 0) +
        (b_[m - 1] ?? 0) * dx +
        (c2[m - 1] ?? 0) * dx * dx +
        (d2[m - 1] ?? 0) * dx * dx * dx
      );
    }
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if ((xs[mid] ?? 0) <= x) lo = mid;
      else hi = mid - 1;
    }
    const dx = x - (xs[lo] ?? 0);
    return (
      (a[lo] ?? 0) +
      (b_[lo] ?? 0) * dx +
      (c2[lo] ?? 0) * dx * dx +
      (d2[lo] ?? 0) * dx * dx * dx
    );
  };
}

/**
 * Bilinear interpolation on a unit rectangle.
 * (x,y) in [x0,x1]×[y0,y1]; q00,q01,q10,q11 are values at corners.
 */
export function bilinearInterpolation(
  x: number,
  y: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  q00: number,
  q01: number,
  q10: number,
  q11: number
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (dx === 0 || dy === 0) return q00;
  const tx = (x - x0) / dx;
  const ty = (y - y0) / dy;
  return (
    q00 * (1 - tx) * (1 - ty) +
    q10 * tx * (1 - ty) +
    q01 * (1 - tx) * ty +
    q11 * tx * ty
  );
}

// ---------------------------------------------------------------------------
// 5. Numerical differentiation
// ---------------------------------------------------------------------------

/** Forward difference first derivative. h default 1e-5. */
export function forwardDiff(
  f: (x: number) => number,
  x: number,
  h = 1e-5
): number {
  return (f(x + h) - f(x)) / h;
}

/** Central difference first derivative. h default 1e-5. */
export function centralDiff(
  f: (x: number) => number,
  x: number,
  h = 1e-5
): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** Second derivative via central differences. h default 1e-5. */
export function secondDerivative(
  f: (x: number) => number,
  x: number,
  h = 1e-5
): number {
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

/** Partial derivative of f with respect to argument at index. h default 1e-5. */
export function partialDerivative(
  f: (...args: number[]) => number,
  args: number[],
  index: number,
  h = 1e-5
): number {
  const argsPlus = [...args];
  const argsMinus = [...args];
  argsPlus[index] = (argsPlus[index] ?? 0) + h;
  argsMinus[index] = (argsMinus[index] ?? 0) - h;
  return (f(...argsPlus) - f(...argsMinus)) / (2 * h);
}

/** Gradient of f at args. h default 1e-5. */
export function gradient(
  f: (...args: number[]) => number,
  args: number[],
  h = 1e-5
): number[] {
  return args.map((_, i) => partialDerivative(f, args, i, h));
}

/** Jacobian matrix of vector-valued function fs at args. h default 1e-5. */
export function jacobian(
  fs: Array<(...args: number[]) => number>,
  args: number[],
  h = 1e-5
): number[][] {
  return fs.map((f) => gradient(f, args, h));
}

// ---------------------------------------------------------------------------
// 6. Linear algebra (small, pure)
// ---------------------------------------------------------------------------

function makeMatrix(rows: number, cols: number, fill = 0): number[][] {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(fill));
}

/** Gaussian elimination with partial pivoting. Solve Ax=b. */
export function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix
  const aug = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row]?.[col] ?? 0);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    if (maxVal < 1e-14) throw new Error("gaussianElimination: singular matrix");
    [aug[col], aug[maxRow]] = [aug[maxRow]!, aug[col]!];
    const pivot = aug[col]?.[col] ?? 0;
    for (let row = col + 1; row < n; row++) {
      const factor = (aug[row]?.[col] ?? 0) / pivot;
      for (let j = col; j <= n; j++) {
        aug[row]![j] = (aug[row]?.[j] ?? 0) - factor * (aug[col]?.[j] ?? 0);
      }
    }
  }
  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i]?.[n] ?? 0;
    for (let j = i + 1; j < n; j++) {
      sum -= (aug[i]?.[j] ?? 0) * (x[j] ?? 0);
    }
    x[i] = sum / (aug[i]?.[i] ?? 1);
  }
  return x;
}

/** LU decomposition (Doolittle, with partial pivoting via permutation). */
export function luDecomposition(A: number[][]): { L: number[][]; U: number[][] } {
  const n = A.length;
  const L = makeMatrix(n, n);
  const U = A.map((row) => [...row]);
  for (let i = 0; i < n; i++) L[i]![i] = 1;
  for (let k = 0; k < n; k++) {
    const pivot = U[k]?.[k] ?? 0;
    if (Math.abs(pivot) < 1e-14) throw new Error("luDecomposition: singular matrix");
    for (let i = k + 1; i < n; i++) {
      const factor = (U[i]?.[k] ?? 0) / pivot;
      L[i]![k] = factor;
      for (let j = k; j < n; j++) {
        U[i]![j] = (U[i]?.[j] ?? 0) - factor * (U[k]?.[j] ?? 0);
      }
    }
  }
  return { L, U };
}

/** Solve Ax=b given LU decomposition via forward/backward substitution. */
export function luSolve(L: number[][], U: number[][], b: number[]): number[] {
  const n = L.length;
  // Forward substitution: Ly = b
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i] ?? 0;
    for (let j = 0; j < i; j++) {
      sum -= (L[i]?.[j] ?? 0) * (y[j] ?? 0);
    }
    y[i] = sum / (L[i]?.[i] ?? 1);
  }
  // Backward substitution: Ux = y
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i] ?? 0;
    for (let j = i + 1; j < n; j++) {
      sum -= (U[i]?.[j] ?? 0) * (x[j] ?? 0);
    }
    x[i] = sum / (U[i]?.[i] ?? 1);
  }
  return x;
}

/** Matrix multiplication A × B. */
export function matMul(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0]?.length ?? 0;
  const colsB = B[0]?.length ?? 0;
  const result = makeMatrix(rowsA, colsB);
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
      }
      result[i]![j] = sum;
    }
  }
  return result;
}

/** Matrix-vector multiplication A × v. */
export function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) =>
    row.reduce((sum, aij, j) => sum + aij * (v[j] ?? 0), 0)
  );
}

/** Matrix transpose. */
export function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const result = makeMatrix(cols, rows);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j]![i] = A[i]?.[j] ?? 0;
    }
  }
  return result;
}

/** Recursive cofactor expansion to compute determinant (good up to ~6×6). */
export function determinant(A: number[][]): number {
  const n = A.length;
  if (n === 1) return A[0]?.[0] ?? 0;
  if (n === 2) {
    return (A[0]?.[0] ?? 0) * (A[1]?.[1] ?? 0) - (A[0]?.[1] ?? 0) * (A[1]?.[0] ?? 0);
  }
  let det = 0;
  for (let j = 0; j < n; j++) {
    const minor = A.slice(1).map((row) => row.filter((_, k) => k !== j));
    det += (j % 2 === 0 ? 1 : -1) * (A[0]?.[j] ?? 0) * determinant(minor);
  }
  return det;
}

/** Matrix inverse via Gauss-Jordan elimination. Throws if singular. */
export function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  // Augment with identity
  const aug = A.map((row, i) => {
    const id = new Array<number>(n).fill(0);
    id[i] = 1;
    return [...row, ...id];
  });
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row]?.[col] ?? 0);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    if (maxVal < 1e-14) throw new Error("invertMatrix: singular matrix");
    [aug[col], aug[maxRow]] = [aug[maxRow]!, aug[col]!];
    const pivot = aug[col]?.[col] ?? 1;
    for (let j = 0; j < 2 * n; j++) {
      aug[col]![j] = (aug[col]?.[j] ?? 0) / pivot;
    }
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row]?.[col] ?? 0;
        for (let j = 0; j < 2 * n; j++) {
          aug[row]![j] = (aug[row]?.[j] ?? 0) - factor * (aug[col]?.[j] ?? 0);
        }
      }
    }
  }
  return aug.map((row) => row.slice(n));
}

// ---------------------------------------------------------------------------
// 7. Sports-specific applications
// ---------------------------------------------------------------------------

/**
 * Solve dP/dt = -lambda*P via Euler (exponential decay model for Poisson process).
 * h default 0.01.
 */
export function poissonODESolver(
  lambda: number,
  tMax: number,
  h = 0.01
): Array<{ t: number; prob: number }> {
  const steps = Math.round(tMax / h);
  const result: Array<{ t: number; prob: number }> = [{ t: 0, prob: 1 }];
  let t = 0;
  let prob = 1;
  for (let i = 0; i < steps; i++) {
    prob = prob + h * (-lambda * prob);
    t = t + h;
    result.push({ t, prob });
  }
  return result;
}

/**
 * Calibration curve: bin (confidence, outcome) pairs into equal-width bins
 * and compute the fraction of wins (calibrated probability) in each bin.
 * bins default 10.
 */
export function calibrationCurve(
  confidences: number[],
  outcomes: number[],
  bins = 10
): Array<{ midpoint: number; calibrated: number; count: number }> {
  const result: Array<{ midpoint: number; calibrated: number; count: number }> =
    [];
  const binWidth = 1 / bins;
  for (let b = 0; b < bins; b++) {
    const lo = b * binWidth;
    const hi = (b + 1) * binWidth;
    const midpoint = (lo + hi) / 2;
    let count = 0;
    let wins = 0;
    for (let i = 0; i < confidences.length; i++) {
      const c = confidences[i] ?? 0;
      if (c >= lo && (c < hi || (b === bins - 1 && c <= hi))) {
        count++;
        wins += outcomes[i] ?? 0;
      }
    }
    result.push({
      midpoint,
      calibrated: count > 0 ? wins / count : 0,
      count,
    });
  }
  return result;
}

/**
 * Smooth an array of spread values using natural cubic spline.
 * window param kept for API compatibility but unused.
 */
export function smoothSpread(spreads: number[], _window?: number): number[] {
  const n = spreads.length;
  if (n < 2) return [...spreads];
  const xs = Array.from({ length: n }, (_, i) => i);
  const spline = cubicSplineNatural(xs, spreads);
  return xs.map((x) => spline(x));
}
