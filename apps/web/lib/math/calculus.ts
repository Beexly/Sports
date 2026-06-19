/**
 * Pure TypeScript calculus and numerical analysis library for Galaxy Sports Edge.
 * Zero npm dependencies — Node/ES built-ins only.
 *
 * This module is COMPLEMENTARY to numerical-methods.ts, optimization.ts, and
 * signal-processing.ts. It focuses on:
 *  - Higher-order differentiation & Richardson extrapolation
 *  - Gauss-Legendre quadrature, double integrals, Simpson's 3/8
 *  - Series (Taylor, Fourier coefficients, geometric, power, Fibonacci, arithmetic)
 *  - Standalone optimization helpers (bounded gradient descent, constrained min)
 *  - DFT (O(n²) formulation) / inverse DFT separate from the FFT in signal-processing.ts
 *  - Laplacian smoother
 *  - Sports kinematics (velocity, acceleration, work, power, inertia, projectile, drag)
 *
 * NOTE: noUncheckedIndexedAccess is enabled — every array read uses `?? 0` or an
 * explicit bounds guard.
 */

// ---------------------------------------------------------------------------
// 1. Numerical differentiation
// ---------------------------------------------------------------------------

/**
 * First derivative via central difference: (f(x+h) - f(x-h)) / (2h).
 * Default h = 1e-5.
 */
export function derivative(
  f: (x: number) => number,
  x: number,
  h = 1e-5
): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/**
 * Second derivative: (f(x+h) - 2·f(x) + f(x-h)) / h².
 * Default h = 1e-5.
 */
export function derivative2(
  f: (x: number) => number,
  x: number,
  h = 1e-5
): number {
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

/**
 * Partial derivative of f with respect to args[index] via central difference.
 * Default h = 1e-5.
 */
export function partialDerivative(
  f: (...args: number[]) => number,
  args: number[],
  index: number,
  h = 1e-5
): number {
  const argsPlus = [...args];
  const argsMinus = [...args];
  argsPlus[index] = (args[index] ?? 0) + h;
  argsMinus[index] = (args[index] ?? 0) - h;
  return (f(...argsPlus) - f(...argsMinus)) / (2 * h);
}

/**
 * Gradient vector: vector of partial derivatives for each dimension.
 * Default h = 1e-5.
 */
export function gradient(
  f: (...args: number[]) => number,
  point: number[],
  h = 1e-5
): number[] {
  return point.map((_, i) => partialDerivative(f, point, i, h));
}

/**
 * Jacobian matrix (m × n) for a vector-valued function.
 * fns[i](x) is the i-th component; point is length n.
 * Returns J[i][j] = ∂fns[i]/∂x[j].
 * Default h = 1e-5.
 */
export function jacobian(
  fns: ((x: number[]) => number)[],
  point: number[],
  h = 1e-5
): number[][] {
  return fns.map((fi) =>
    point.map((_, j) => {
      const plus = [...point];
      const minus = [...point];
      plus[j] = (point[j] ?? 0) + h;
      minus[j] = (point[j] ?? 0) - h;
      return (fi(plus) - fi(minus)) / (2 * h);
    })
  );
}

/**
 * Richardson extrapolation for a more accurate first derivative.
 * Uses two step sizes: h and h/2.
 * Default h = 1e-3 (larger initial step for Richardson).
 */
export function richardsonExtrapolation(
  f: (x: number) => number,
  x: number,
  h = 1e-3
): number {
  const d1 = (f(x + h) - f(x - h)) / (2 * h);
  const h2 = h / 2;
  const d2 = (f(x + h2) - f(x - h2)) / (2 * h2);
  // Richardson: (4*D(h/2) - D(h)) / 3 eliminates O(h²) error term
  return (4 * d2 - d1) / 3;
}

// ---------------------------------------------------------------------------
// 2. Numerical integration
// ---------------------------------------------------------------------------

/**
 * Trapezoidal rule over [a, b] with n intervals.
 * Default n = 100.
 */
export function trapezoidalRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 100
): number {
  const h = (b - a) / n;
  let sum = 0.5 * (f(a) + f(b));
  for (let i = 1; i < n; i++) {
    sum += f(a + i * h);
  }
  return sum * h;
}

/**
 * Simpson's 1/3 rule over [a, b] with n intervals (must be even; if odd, n+1 is used).
 * Default n = 100.
 */
export function simpsonsRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 100
): number {
  let intervals = n % 2 === 0 ? n : n + 1;
  if (intervals < 2) intervals = 2;
  const h = (b - a) / intervals;
  let sum = f(a) + f(b);
  for (let i = 1; i < intervals; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
  }
  return (h / 3) * sum;
}

/**
 * Simpson's 3/8 rule: n must be a multiple of 3; if not, rounds up to next multiple.
 * Default n = 99.
 */
export function simpsons38Rule(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 99
): number {
  let intervals = n;
  if (intervals % 3 !== 0) {
    intervals = intervals + (3 - (intervals % 3));
  }
  if (intervals < 3) intervals = 3;
  const h = (b - a) / intervals;
  let sum = f(a) + f(b);
  for (let i = 1; i < intervals; i++) {
    sum += (i % 3 === 0 ? 2 : 3) * f(a + i * h);
  }
  return (3 * h / 8) * sum;
}

// 5-point Gauss-Legendre nodes and weights on [-1, 1]
const GL5_NODES: readonly number[] = [
  -0.9061798459386640,
  -0.5384693101056831,
  0.0,
  0.5384693101056831,
  0.9061798459386640,
];
const GL5_WEIGHTS: readonly number[] = [
  0.2369268850561891,
  0.4786286704993665,
  0.5688888888888889,
  0.4786286704993665,
  0.2369268850561891,
];

/**
 * n-point Gauss-Legendre quadrature over [a, b].
 * Currently implements the 5-point rule regardless of n.
 * Default n = 5.
 */
export function gaussLegendreQuadrature(
  f: (x: number) => number,
  a: number,
  b: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _n = 5
): number {
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  let sum = 0;
  for (let i = 0; i < GL5_NODES.length; i++) {
    const node = GL5_NODES[i] ?? 0;
    const weight = GL5_WEIGHTS[i] ?? 0;
    sum += weight * f(mid + half * node);
  }
  return half * sum;
}

/**
 * Adaptive quadrature via recursive Simpson's with error control.
 * Default tolerance = 1e-6.
 */
export function adaptiveQuadrature(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-6
): number {
  function adaptSimpson(fa: number, fb: number, fc: number, lA: number, lB: number, whole: number, depth: number): number {
    const mid1 = (lA + (lA + lB) / 2) / 2;
    const mid2 = ((lA + lB) / 2 + lB) / 2;
    const fmid1 = f(mid1);
    const fmid2 = f(mid2);
    const c = (lA + lB) / 2;
    const left = ((c - lA) / 6) * (fa + 4 * fmid1 + fc);
    const right = ((lB - c) / 6) * (fc + 4 * fmid2 + fb);
    const delta = left + right - whole;
    if (depth >= 50 || Math.abs(delta) <= 15 * tol) {
      return left + right + delta / 15;
    }
    const fmidC = f(c);
    const leftHalf = ((c - lA) / 6) * (fa + 4 * fmid1 + fmidC);
    const rightHalf = ((lB - c) / 6) * (fmidC + 4 * fmid2 + fb);
    return (
      adaptSimpson(fa, fmidC, fmid1, lA, c, leftHalf, depth + 1) +
      adaptSimpson(fmidC, fb, fmid2, c, lB, rightHalf, depth + 1)
    );
  }
  const c = (a + b) / 2;
  const fa = f(a);
  const fb = f(b);
  const fc = f(c);
  const whole = ((b - a) / 6) * (fa + 4 * fc + fb);
  return adaptSimpson(fa, fb, fc, a, b, whole, 0);
}

/**
 * 2D trapezoidal integration of f(x, y) over [ax, bx] × [ay, by].
 * Default n = 20 (n² evaluations).
 */
export function doubleIntegral(
  f: (x: number, y: number) => number,
  ax: number,
  bx: number,
  ay: number,
  by: number,
  n = 20
): number {
  const hx = (bx - ax) / n;
  const hy = (by - ay) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const wx = i === 0 || i === n ? 0.5 : 1.0;
    const x = ax + i * hx;
    for (let j = 0; j <= n; j++) {
      const wy = j === 0 || j === n ? 0.5 : 1.0;
      const y = ay + j * hy;
      sum += wx * wy * f(x, y);
    }
  }
  return sum * hx * hy;
}

// ---------------------------------------------------------------------------
// 3. Series and sequences
// ---------------------------------------------------------------------------

/**
 * Taylor series expansion of f about a, evaluated at x.
 * Uses numerical derivatives to compute f^(n)(a).
 * Default terms = 5.
 */
export function taylorExpansion(
  f: (x: number) => number,
  a: number,
  x: number,
  terms = 5
): number {
  let sum = 0;
  let factorial = 1;
  // Iteratively compute higher derivatives numerically
  // We approximate f^(k)(a) by repeated application of central difference
  // For stability, we use decreasing step sizes
  const h = 1e-3;

  // Build derivative approximations via finite differences
  // Use the fact that the k-th derivative can be approximated via
  // the k-th order finite difference formula
  function nthDerivative(n: number): number {
    if (n === 0) return f(a);
    // Use central finite differences for the n-th derivative
    // f^(n)(a) ≈ (1/h^n) * sum_{k=0}^{n} (-1)^k * C(n,k) * f(a + (n/2 - k)*h)
    let result = 0;
    for (let k = 0; k <= n; k++) {
      const sign = k % 2 === 0 ? 1 : -1;
      const binom = binomialCoeff(n, k);
      result += sign * binom * f(a + (n / 2 - k) * h);
    }
    return result / Math.pow(h, n);
  }

  for (let k = 0; k < terms; k++) {
    if (k > 0) factorial *= k;
    const coeff = k === 0 ? 1 : factorial;
    sum += (nthDerivative(k) / coeff) * Math.pow(x - a, k);
  }
  return sum;
}

/** Binomial coefficient C(n, k) used internally. */
function binomialCoeff(n: number, k: number): number {
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/**
 * Fourier cosine coefficient a_n = (2/T) ∫₀ᵀ f(x) cos(2πnx/T) dx.
 * Default period T = 2π.
 */
export function fouriercoefficientA(
  f: (x: number) => number,
  n: number,
  period = 2 * Math.PI
): number {
  const T = period;
  const integrand = (x: number): number => f(x) * Math.cos((2 * Math.PI * n * x) / T);
  return (2 / T) * simpsonsRule(integrand, 0, T, 200);
}

/**
 * Fourier sine coefficient b_n = (2/T) ∫₀ᵀ f(x) sin(2πnx/T) dx.
 * Default period T = 2π.
 */
export function fouriercoefficientB(
  f: (x: number) => number,
  n: number,
  period = 2 * Math.PI
): number {
  const T = period;
  const integrand = (x: number): number => f(x) * Math.sin((2 * Math.PI * n * x) / T);
  return (2 / T) * simpsonsRule(integrand, 0, T, 200);
}

/**
 * Sum of n terms of a geometric series: a + ar + ar² + ... + ar^(n-1).
 * If |r| = 1, returns a * n.
 */
export function geometricSeries(a: number, r: number, n: number): number {
  if (Math.abs(r - 1) < 1e-14) return a * n;
  return a * (1 - Math.pow(r, n)) / (1 - r);
}

/**
 * Evaluate a power series: sum_{k=0}^{N-1} coefficients[k] * x^k.
 */
export function powerSeries(coefficients: number[], x: number): number {
  let sum = 0;
  let xk = 1;
  for (let k = 0; k < coefficients.length; k++) {
    sum += (coefficients[k] ?? 0) * xk;
    xk *= x;
  }
  return sum;
}

/**
 * First n Fibonacci numbers: [0, 1, 1, 2, 3, 5, ...].
 * Returns [] for n ≤ 0.
 */
export function fibonacciSequence(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0];
  const seq: number[] = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push((seq[i - 1] ?? 0) + (seq[i - 2] ?? 0));
  }
  return seq;
}

/**
 * Sum of n terms of an arithmetic series: S_n = n/2 * (2a + (n-1)d).
 */
export function arithmeticSeriesSum(a: number, d: number, n: number): number {
  return (n / 2) * (2 * a + (n - 1) * d);
}

// ---------------------------------------------------------------------------
// 4. Optimization
// ---------------------------------------------------------------------------

/**
 * Golden-section search: find minimum of unimodal f in [a, b].
 * Default tolerance = 1e-5.
 */
export function goldenSectionSearch(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-5
): number {
  const phi = (Math.sqrt(5) - 1) / 2; // ≈ 0.618
  let lo = a;
  let hi = b;
  let c = hi - phi * (hi - lo);
  let d = lo + phi * (hi - lo);
  while (Math.abs(hi - lo) > tol) {
    if (f(c) < f(d)) {
      hi = d;
    } else {
      lo = c;
    }
    c = hi - phi * (hi - lo);
    d = lo + phi * (hi - lo);
  }
  return (lo + hi) / 2;
}

/**
 * Multivariate gradient descent.
 * Default: learningRate=0.01, maxIter=1000, tol=1e-6.
 */
export function gradientDescent(
  f: (...x: number[]) => number,
  initial: number[],
  learningRate = 0.01,
  maxIter = 1000,
  tol = 1e-6
): number[] {
  let current = [...initial];
  const h = 1e-5;
  for (let iter = 0; iter < maxIter; iter++) {
    const grad = current.map((_, i) => partialDerivative(f, current, i, h));
    const next = current.map((v, i) => v - learningRate * (grad[i] ?? 0));
    const norm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
    current = next;
    if (norm < tol) break;
  }
  return current;
}

/**
 * Newton-Raphson optimization: find critical point of f by iterating
 * x_{n+1} = x_n - f'(x_n) / f''(x_n).
 * Default maxIter=100, tol=1e-8.
 */
export function newtonRaphsonOpt(
  f: (x: number) => number,
  x0: number,
  maxIter = 100,
  tol = 1e-8
): number {
  let x = x0;
  const h = 1e-5;
  for (let i = 0; i < maxIter; i++) {
    const fp = derivative(f, x, h);
    const fpp = derivative2(f, x, h);
    if (Math.abs(fpp) < 1e-14) break;
    const xNext = x - fp / fpp;
    if (Math.abs(xNext - x) < tol) {
      return xNext;
    }
    x = xNext;
  }
  return x;
}

/**
 * Constrained minimum: gradient descent with per-dimension bounds clipping.
 * bounds[i] = [lower, upper].
 */
export function constrainedMinimum(
  f: (...x: number[]) => number,
  initial: number[],
  bounds: [number, number][]
): number[] {
  const clip = (v: number, i: number): number => {
    const lb = bounds[i]?.[0] ?? -Infinity;
    const ub = bounds[i]?.[1] ?? Infinity;
    return Math.max(lb, Math.min(ub, v));
  };
  let current = initial.map(clip);
  const lr = 0.01;
  const maxIter = 1000;
  const h = 1e-5;
  for (let iter = 0; iter < maxIter; iter++) {
    const grad = current.map((_, i) => partialDerivative(f, current, i, h));
    const next = current.map((v, i) => clip(v - lr * (grad[i] ?? 0), i));
    const norm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
    current = next;
    if (norm < 1e-6) break;
  }
  return current;
}

/**
 * Nelder-Mead simplex method for unconstrained minimization.
 * Default maxIter = 500.
 */
export function nelderMead(
  f: (x: number[]) => number,
  initial: number[],
  maxIter = 500
): number[] {
  const n = initial.length;
  const alpha = 1.0; // reflection
  const gamma = 2.0; // expansion
  const rho = 0.5;   // contraction
  const sigma = 0.5; // shrink

  // Build initial simplex: one vertex per dimension + 1
  const simplex: number[][] = [initial.slice()];
  for (let i = 0; i < n; i++) {
    const v = initial.slice();
    v[i] = (v[i] ?? 0) + (Math.abs(v[i] ?? 0) > 1e-10 ? 0.05 * (v[i] ?? 0) : 0.00025);
    simplex.push(v);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    // Sort by f value
    simplex.sort((a, b) => f(a) - f(b));

    // Check convergence
    const fBest = f(simplex[0] ?? []);
    const fWorst = f(simplex[simplex.length - 1] ?? []);
    if (Math.abs(fWorst - fBest) < 1e-10) break;

    // Centroid of all but worst
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] = (centroid[j] ?? 0) + (simplex[i]?.[j] ?? 0) / n;
      }
    }

    const worst = simplex[n] ?? simplex[simplex.length - 1] ?? [];

    // Reflection
    const reflected = centroid.map((c, j) => c + alpha * (c - (worst[j] ?? 0)));
    const fReflected = f(reflected);
    const fBestVal = f(simplex[0] ?? []);
    const fSecondWorst = f(simplex[n - 1] ?? []);

    if (fBestVal <= fReflected && fReflected < fSecondWorst) {
      simplex[n] = reflected;
    } else if (fReflected < fBestVal) {
      // Expansion
      const expanded = centroid.map((c, j) => c + gamma * (reflected[j]! - c));
      simplex[n] = f(expanded) < fReflected ? expanded : reflected;
    } else {
      // Contraction
      const contracted = centroid.map((c, j) => c + rho * ((worst[j] ?? 0) - c));
      if (f(contracted) < fWorst) {
        simplex[n] = contracted;
      } else {
        // Shrink
        const best = simplex[0] ?? [];
        for (let i = 1; i <= n; i++) {
          simplex[i] = best.map((b, j) => b + sigma * ((simplex[i]?.[j] ?? 0) - b));
        }
      }
    }
  }

  return simplex[0] ?? initial.slice();
}

// ---------------------------------------------------------------------------
// 5. Transforms (DFT — distinct from the FFT in signal-processing.ts)
// ---------------------------------------------------------------------------

/**
 * Discrete Fourier Transform (O(n²)).
 * Returns separate real and imaginary arrays.
 */
export function discreteFourierTransform(signal: number[]): { re: number[]; im: number[] } {
  const N = signal.length;
  const re: number[] = new Array<number>(N).fill(0);
  const im: number[] = new Array<number>(N).fill(0);
  for (let k = 0; k < N; k++) {
    let sumRe = 0;
    let sumIm = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      sumRe += (signal[n] ?? 0) * Math.cos(angle);
      sumIm -= (signal[n] ?? 0) * Math.sin(angle);
    }
    re[k] = sumRe;
    im[k] = sumIm;
  }
  return { re, im };
}

/**
 * Inverse DFT: returns the real part of the reconstructed signal.
 */
export function inverseDFT(re: number[], im: number[]): number[] {
  const N = re.length;
  const output: number[] = new Array<number>(N).fill(0);
  for (let n = 0; n < N; n++) {
    let sumRe = 0;
    for (let k = 0; k < N; k++) {
      const angle = (2 * Math.PI * k * n) / N;
      sumRe += (re[k] ?? 0) * Math.cos(angle) - (im[k] ?? 0) * Math.sin(angle);
    }
    output[n] = sumRe / N;
  }
  return output;
}

/**
 * DFT magnitude: sqrt(re[k]² + im[k]²) per bin.
 */
export function dftMagnitude(re: number[], im: number[]): number[] {
  return re.map((r, k) => Math.sqrt(r * r + (im[k] ?? 0) ** 2));
}

/**
 * DFT phase: atan2(im[k], re[k]) per bin.
 */
export function dftPhase(re: number[], im: number[]): number[] {
  return re.map((r, k) => Math.atan2(im[k] ?? 0, r));
}

/**
 * Laplacian smoother: minimise ||x - signal||² + λ||Dx||² iteratively.
 * Uses Gauss-Seidel-style iterative update.
 * Default lambda = 0.1.
 */
export function laplacianSmoother(signal: number[], lambda = 0.1): number[] {
  const N = signal.length;
  if (N === 0) return [];
  let x = signal.slice();
  const maxIter = 100;
  for (let iter = 0; iter < maxIter; iter++) {
    const prev = x.slice();
    for (let i = 0; i < N; i++) {
      const s = signal[i] ?? 0;
      if (i === 0) {
        // Boundary: D^T D x at boundary = x[0] - x[1]
        const xNext = x[1] ?? x[0] ?? 0;
        x[i] = (s + lambda * xNext) / (1 + lambda);
      } else if (i === N - 1) {
        // Boundary: D^T D x at boundary = x[N-1] - x[N-2]
        const xPrev = x[N - 2] ?? x[N - 1] ?? 0;
        x[i] = (s + lambda * xPrev) / (1 + lambda);
      } else {
        // Interior: D^T D x = -x[i-1] + 2x[i] - x[i+1]
        const xPrev = x[i - 1] ?? 0;
        const xNext = x[i + 1] ?? 0;
        x[i] = (s + lambda * (xPrev + xNext)) / (1 + 2 * lambda);
      }
    }
    // Check convergence
    const diff = x.reduce((acc, v, i) => acc + Math.abs(v - (prev[i] ?? 0)), 0);
    if (diff < 1e-10 * N) break;
  }
  return x;
}

/**
 * Causal moving-average filter.
 * The first windowSize-1 points are averaged over available samples only.
 */
export function movingAverageFilter(signal: number[], windowSize: number): number[] {
  if (signal.length === 0 || windowSize <= 0) return [];
  const ws = Math.max(1, Math.round(windowSize));
  return signal.map((_, i) => {
    const start = Math.max(0, i - ws + 1);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= i; j++) {
      sum += signal[j] ?? 0;
      count++;
    }
    return count > 0 ? sum / count : 0;
  });
}

// ---------------------------------------------------------------------------
// 6. Sports applications
// ---------------------------------------------------------------------------

/**
 * Numerical velocity from position samples.
 * Central difference in the interior; forward/backward at the ends.
 * positions and times must have the same length ≥ 2.
 */
export function velocityFromPosition(positions: number[], times: number[]): number[] {
  const n = positions.length;
  if (n < 2) return positions.map(() => 0);
  return positions.map((_, i) => {
    if (i === 0) {
      const dp = (positions[1] ?? 0) - (positions[0] ?? 0);
      const dt = (times[1] ?? 0) - (times[0] ?? 0);
      return dt !== 0 ? dp / dt : 0;
    }
    if (i === n - 1) {
      const dp = (positions[n - 1] ?? 0) - (positions[n - 2] ?? 0);
      const dt = (times[n - 1] ?? 0) - (times[n - 2] ?? 0);
      return dt !== 0 ? dp / dt : 0;
    }
    const dp = (positions[i + 1] ?? 0) - (positions[i - 1] ?? 0);
    const dt = (times[i + 1] ?? 0) - (times[i - 1] ?? 0);
    return dt !== 0 ? dp / dt : 0;
  });
}

/**
 * Numerical acceleration from velocity samples (same central difference scheme).
 */
export function accelerationFromVelocity(velocities: number[], times: number[]): number[] {
  return velocityFromPosition(velocities, times);
}

/**
 * Work ≈ ∫ F ds via trapezoidal rule.
 * forces and displacements must have the same length.
 */
export function workFromForce(forces: number[], displacements: number[]): number {
  const n = forces.length;
  if (n < 2) return 0;
  let work = 0;
  for (let i = 1; i < n; i++) {
    const f0 = forces[i - 1] ?? 0;
    const f1 = forces[i] ?? 0;
    const ds = (displacements[i] ?? 0) - (displacements[i - 1] ?? 0);
    work += 0.5 * (f0 + f1) * ds;
  }
  return work;
}

/**
 * Power curve: instantaneous power = dWork/dt at each time point.
 * Uses the same central/forward/backward difference as velocityFromPosition.
 */
export function powerCurve(work: number[], times: number[]): number[] {
  return velocityFromPosition(work, times);
}

/**
 * Moment of inertia: I = Σ mᵢ rᵢ².
 */
export function momentOfInertia(masses: number[], radii: number[]): number {
  return masses.reduce((sum, m, i) => {
    const r = radii[i] ?? 0;
    return sum + m * r * r;
  }, 0);
}

/**
 * Projectile range on flat ground: R = v₀² · sin(2θ) / g.
 * angle_deg is in degrees. Default g = 9.81 m/s².
 */
export function trajectoryRange(v0: number, angle_deg: number, g = 9.81): number {
  const theta = (angle_deg * Math.PI) / 180;
  return (v0 * v0 * Math.sin(2 * theta)) / g;
}

/**
 * Convert RPM to radians per second: ω = rpm · 2π / 60.
 */
export function spinRPMToRad(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60;
}

/**
 * Aerodynamic drag force: F = 0.5 · Cd · A · ρ · v².
 * Defaults: Cd = 0.47, A = 0.045 m², ρ = 1.225 kg/m³.
 */
export function dragForce(
  velocity: number,
  Cd = 0.47,
  area = 0.045,
  density = 1.225
): number {
  return 0.5 * Cd * area * density * velocity * velocity;
}
