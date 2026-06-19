/**
 * Numerical optimization algorithms — pure TypeScript, zero dependencies.
 *
 * Univariate methods: golden section, bisection, Newton, secant, Brent.
 * Multivariate gradient methods: gradient descent, momentum, Adam, L-BFGS.
 * Line search: Armijo backtracking.
 * Metaheuristics: simulated annealing, genetic algorithm.
 * Constrained optimization: penalty method.
 * Portfolio optimization: mean-variance efficient frontier.
 * Hyperparameter search: grid search, random search.
 * Utilities: convergence check, decay schedules.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Objective function: maps a vector to a scalar. */
export type ObjectiveFn = (x: number[]) => number;

/** Gradient function: maps a vector to a gradient vector. */
export type GradientFn = (x: number[]) => number[];

/** Result of a multivariate optimization run. */
export interface OptimizeResult {
  x: number[];
  value: number;
  iterations: number;
  converged: boolean;
  /** Objective values per iteration when trackHistory=true. */
  history?: number[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] ?? 0));
}

function vecSub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - (b[i] ?? 0));
}

function vecScale(a: number[], s: number): number[] {
  return a.map((v) => v * s);
}

function vecDot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
}

function vecNorm(a: number[]): number {
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0));
}

function vecCopy(a: number[]): number[] {
  return [...a];
}

/** Linear congruential generator — deterministic pseudo-random numbers. */
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Univariate optimization
// ---------------------------------------------------------------------------

/**
 * Golden-section search for the minimum of a unimodal function on [lo, hi].
 */
export function goldenSectionSearch(
  fn: (x: number) => number,
  lo: number,
  hi: number,
  tol = 1e-8,
  maxIter = 1000,
): { x: number; value: number; iterations: number } {
  const phi = (Math.sqrt(5) - 1) / 2; // golden ratio conjugate ≈ 0.618
  let a = lo;
  let b = hi;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  let fc = fn(c);
  let fd = fn(d);
  let iter = 0;

  while (Math.abs(b - a) > tol && iter < maxIter) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      fc = fn(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      fd = fn(d);
    }
    iter++;
  }

  const x = (a + b) / 2;
  return { x, value: fn(x), iterations: iter };
}

/**
 * Bisection root-finding. Requires fn(lo) and fn(hi) to have opposite signs.
 */
export function bisectionRoot(
  fn: (x: number) => number,
  lo: number,
  hi: number,
  tol = 1e-8,
  maxIter = 1000,
): { x: number; iterations: number; converged: boolean } {
  let a = lo;
  let b = hi;
  let fa = fn(a);
  let iter = 0;

  if (fa * fn(b) > 0) {
    return { x: (a + b) / 2, iterations: 0, converged: false };
  }

  while ((b - a) / 2 > tol && iter < maxIter) {
    const mid = (a + b) / 2;
    const fm = fn(mid);
    if (Math.abs(fm) < tol) {
      return { x: mid, iterations: iter + 1, converged: true };
    }
    if (fa * fm < 0) {
      b = mid;
    } else {
      a = mid;
      fa = fm;
    }
    iter++;
  }

  const x = (a + b) / 2;
  return { x, iterations: iter, converged: Math.abs(fn(x)) < tol || (b - a) / 2 <= tol };
}

/**
 * Newton's method for root-finding using the function and its derivative.
 */
export function newtonRoot(
  fn: (x: number) => number,
  dfn: (x: number) => number,
  x0: number,
  tol = 1e-8,
  maxIter = 1000,
): { x: number; iterations: number; converged: boolean } {
  let x = x0;
  let iter = 0;

  while (iter < maxIter) {
    const fx = fn(x);
    if (Math.abs(fx) < tol) {
      return { x, iterations: iter, converged: true };
    }
    const dfx = dfn(x);
    if (Math.abs(dfx) < 1e-14) {
      break; // derivative too small, cannot continue
    }
    const xNext = x - fx / dfx;
    if (Math.abs(xNext - x) < tol) {
      return { x: xNext, iterations: iter + 1, converged: true };
    }
    x = xNext;
    iter++;
  }

  return { x, iterations: iter, converged: Math.abs(fn(x)) < tol };
}

/**
 * Secant method for root-finding using two initial points.
 */
export function secantRoot(
  fn: (x: number) => number,
  x0: number,
  x1: number,
  tol = 1e-8,
  maxIter = 1000,
): { x: number; iterations: number; converged: boolean } {
  let a = x0;
  let b = x1;
  let fa = fn(a);
  let fb = fn(b);
  let iter = 0;

  while (iter < maxIter) {
    if (Math.abs(fb) < tol) {
      return { x: b, iterations: iter, converged: true };
    }
    const denom = fb - fa;
    if (Math.abs(denom) < 1e-14) {
      break;
    }
    const c = b - fb * (b - a) / denom;
    a = b;
    fa = fb;
    b = c;
    fb = fn(b);
    if (Math.abs(b - a) < tol) {
      return { x: b, iterations: iter + 1, converged: true };
    }
    iter++;
  }

  return { x: b, iterations: iter, converged: Math.abs(fn(b)) < tol };
}

/**
 * Brent's method: combines golden-section search with parabolic interpolation.
 * Finds the minimum of fn in [lo, hi].
 */
export function brentMinimize(
  fn: (x: number) => number,
  lo: number,
  hi: number,
  tol = 1e-8,
  maxIter = 1000,
): { x: number; value: number; iterations: number } {
  const phi = (3 - Math.sqrt(5)) / 2; // ≈ 0.382

  let a = lo;
  let b = hi;
  let x = a + phi * (b - a);
  let w = x;
  let v = x;
  let fx = fn(x);
  let fw = fx;
  let fv = fx;
  let d = 0;
  let e = 0;
  let iter = 0;

  while (iter < maxIter) {
    const mid = (a + b) / 2;
    const tol1 = tol * Math.abs(x) + 1e-10;
    const tol2 = 2 * tol1;

    if (Math.abs(x - mid) <= tol2 - (b - a) / 2) {
      return { x, value: fx, iterations: iter };
    }

    let useGolden = true;
    let p = 0;
    let q = 0;
    let r = 0;

    if (Math.abs(e) > tol1) {
      // Attempt parabolic interpolation
      r = (x - w) * (fx - fv);
      q = (x - v) * (fx - fw);
      p = (x - v) * q - (x - w) * r;
      q = 2 * (q - r);
      if (q > 0) {
        p = -p;
      } else {
        q = -q;
      }
      r = e;
      e = d;

      if (Math.abs(p) < Math.abs(0.5 * q * r) && p > q * (a - x) && p < q * (b - x)) {
        d = p / q;
        const u = x + d;
        if (u - a < tol2 || b - u < tol2) {
          d = x < mid ? tol1 : -tol1;
        }
        useGolden = false;
      }
    }

    if (useGolden) {
      e = x < mid ? b - x : a - x;
      d = phi * e;
    }

    const u = x + (Math.abs(d) >= tol1 ? d : d > 0 ? tol1 : -tol1);
    const fu = fn(u);

    if (fu <= fx) {
      if (u < x) { b = x; } else { a = x; }
      v = w; fv = fw;
      w = x; fw = fx;
      x = u; fx = fu;
    } else {
      if (u < x) { a = u; } else { b = u; }
      if (fu <= fw || w === x) {
        v = w; fv = fw;
        w = u; fw = fu;
      } else if (fu <= fv || v === x || v === w) {
        v = u; fv = fu;
      }
    }

    iter++;
  }

  return { x, value: fx, iterations: iter };
}

// ---------------------------------------------------------------------------
// Numerical gradient
// ---------------------------------------------------------------------------

/**
 * Numerical gradient via central differences.
 * h: step size (default 1e-5).
 */
export function numericalGradient(fn: ObjectiveFn, x: number[], h = 1e-5): number[] {
  return x.map((_, i) => {
    const xp = vecCopy(x);
    const xm = vecCopy(x);
    xp[i] = (xp[i] ?? 0) + h;
    xm[i] = (xm[i] ?? 0) - h;
    return (fn(xp) - fn(xm)) / (2 * h);
  });
}

// ---------------------------------------------------------------------------
// Line search
// ---------------------------------------------------------------------------

/**
 * Armijo backtracking line search.
 * Returns a step size satisfying the sufficient decrease (Armijo) condition.
 */
export function armijoLineSearch(
  fn: ObjectiveFn,
  x: number[],
  direction: number[],
  gradAtX: number[],
  opts?: { alpha0?: number; c?: number; rho?: number; maxIter?: number },
): number {
  const alpha0 = opts?.alpha0 ?? 1.0;
  const c = opts?.c ?? 1e-4;
  const rho = opts?.rho ?? 0.5;
  const maxIter = opts?.maxIter ?? 100;

  const f0 = fn(x);
  const slope = vecDot(gradAtX, direction);
  let alpha = alpha0;

  for (let i = 0; i < maxIter; i++) {
    const xNew = vecAdd(x, vecScale(direction, alpha));
    if (fn(xNew) <= f0 + c * alpha * slope) {
      return alpha;
    }
    alpha *= rho;
  }

  return alpha;
}

// ---------------------------------------------------------------------------
// Gradient descent (plain)
// ---------------------------------------------------------------------------

/**
 * Gradient descent with fixed learning rate.
 */
export function gradientDescent(
  fn: ObjectiveFn,
  grad: GradientFn,
  x0: number[],
  opts?: {
    lr?: number;
    maxIter?: number;
    tol?: number;
    trackHistory?: boolean;
  },
): OptimizeResult {
  const lr = opts?.lr ?? 0.01;
  const maxIter = opts?.maxIter ?? 1000;
  const tol = opts?.tol ?? 1e-6;
  const trackHistory = opts?.trackHistory ?? false;

  let x = vecCopy(x0);
  const history: number[] = [];
  let iter = 0;
  let converged = false;

  for (iter = 0; iter < maxIter; iter++) {
    const g = grad(x);
    const xNext = vecSub(x, vecScale(g, lr));

    if (trackHistory) history.push(fn(x));

    if (isConverged(xNext, x, tol)) {
      x = xNext;
      converged = true;
      iter++;
      break;
    }
    x = xNext;
  }

  const result: OptimizeResult = {
    x,
    value: fn(x),
    iterations: iter,
    converged,
  };
  if (trackHistory) result.history = history;
  return result;
}

// ---------------------------------------------------------------------------
// Gradient descent with momentum
// ---------------------------------------------------------------------------

/**
 * Gradient descent with Polyak heavy-ball momentum.
 */
export function gradientDescentMomentum(
  fn: ObjectiveFn,
  grad: GradientFn,
  x0: number[],
  opts?: {
    lr?: number;
    momentum?: number;
    maxIter?: number;
    tol?: number;
    trackHistory?: boolean;
  },
): OptimizeResult {
  const lr = opts?.lr ?? 0.01;
  const momentum = opts?.momentum ?? 0.9;
  const maxIter = opts?.maxIter ?? 1000;
  const tol = opts?.tol ?? 1e-6;
  const trackHistory = opts?.trackHistory ?? false;

  let x = vecCopy(x0);
  let velocity = new Array<number>(x0.length).fill(0);
  const history: number[] = [];
  let iter = 0;
  let converged = false;

  for (iter = 0; iter < maxIter; iter++) {
    const g = grad(x);
    velocity = vecAdd(vecScale(velocity, momentum), vecScale(g, lr));
    const xNext = vecSub(x, velocity);

    if (trackHistory) history.push(fn(x));

    if (isConverged(xNext, x, tol)) {
      x = xNext;
      converged = true;
      iter++;
      break;
    }
    x = xNext;
  }

  const result: OptimizeResult = {
    x,
    value: fn(x),
    iterations: iter,
    converged,
  };
  if (trackHistory) result.history = history;
  return result;
}

// ---------------------------------------------------------------------------
// Adam optimizer
// ---------------------------------------------------------------------------

/**
 * Adam optimizer (Adaptive Moment Estimation).
 */
export function adam(
  fn: ObjectiveFn,
  grad: GradientFn,
  x0: number[],
  opts?: {
    lr?: number;
    beta1?: number;
    beta2?: number;
    epsilon?: number;
    maxIter?: number;
    tol?: number;
    trackHistory?: boolean;
  },
): OptimizeResult {
  const lr = opts?.lr ?? 0.001;
  const beta1 = opts?.beta1 ?? 0.9;
  const beta2 = opts?.beta2 ?? 0.999;
  const epsilon = opts?.epsilon ?? 1e-8;
  const maxIter = opts?.maxIter ?? 1000;
  const tol = opts?.tol ?? 1e-6;
  const trackHistory = opts?.trackHistory ?? false;

  let x = vecCopy(x0);
  let m = new Array<number>(x0.length).fill(0); // first moment
  let v = new Array<number>(x0.length).fill(0); // second moment
  const history: number[] = [];
  let iter = 0;
  let converged = false;

  for (iter = 1; iter <= maxIter; iter++) {
    const g = grad(x);

    m = vecAdd(vecScale(m, beta1), vecScale(g, 1 - beta1));
    v = vecAdd(vecScale(v, beta2), g.map((gi) => (1 - beta2) * gi * gi));

    const mHat = vecScale(m, 1 / (1 - Math.pow(beta1, iter)));
    const vHat = v.map((vi) => vi / (1 - Math.pow(beta2, iter)));

    const update = mHat.map((mi, i) => (lr * mi) / (Math.sqrt(vHat[i] ?? 0) + epsilon));
    const xNext = vecSub(x, update);

    if (trackHistory) history.push(fn(x));

    if (isConverged(xNext, x, tol)) {
      x = xNext;
      converged = true;
      break;
    }
    x = xNext;
  }

  const result: OptimizeResult = {
    x,
    value: fn(x),
    iterations: iter,
    converged,
  };
  if (trackHistory) result.history = history;
  return result;
}

// ---------------------------------------------------------------------------
// L-BFGS
// ---------------------------------------------------------------------------

/**
 * L-BFGS (Limited-memory Broyden–Fletcher–Goldfarb–Shanno).
 * Uses the two-loop recursion to approximate the Hessian inverse.
 */
export function lbfgs(
  fn: ObjectiveFn,
  grad: GradientFn,
  x0: number[],
  opts?: { maxIter?: number; tol?: number; m?: number },
): OptimizeResult {
  const maxIter = opts?.maxIter ?? 1000;
  const tol = opts?.tol ?? 1e-6;
  const m = opts?.m ?? 10; // history size

  let x = vecCopy(x0);
  let g = grad(x);

  // Circular buffers for curvature pairs
  const sHistory: number[][] = [];
  const yHistory: number[][] = [];
  const rhoHistory: number[] = [];

  let iter = 0;
  let converged = false;

  for (iter = 0; iter < maxIter; iter++) {
    const gNorm = vecNorm(g);
    if (gNorm < tol) {
      converged = true;
      break;
    }

    // Two-loop L-BFGS recursion to compute search direction
    const k = sHistory.length;
    let q = vecCopy(g);
    const alpha: number[] = new Array(k).fill(0);

    for (let i = k - 1; i >= 0; i--) {
      const si = sHistory[i] ?? [];
      const yi = yHistory[i] ?? [];
      alpha[i] = (rhoHistory[i] ?? 0) * vecDot(si, q);
      q = vecSub(q, vecScale(yi, alpha[i] ?? 0));
    }

    // Initial Hessian approximation (scaled identity)
    let r: number[];
    if (k > 0) {
      const ys = vecDot(yHistory[k - 1] ?? [], sHistory[k - 1] ?? []);
      const yy = vecDot(yHistory[k - 1] ?? [], yHistory[k - 1] ?? []);
      const gamma = yy > 0 ? ys / yy : 1;
      r = vecScale(q, gamma);
    } else {
      r = vecCopy(q);
    }

    for (let i = 0; i < k; i++) {
      const si = sHistory[i] ?? [];
      const yi = yHistory[i] ?? [];
      const beta = (rhoHistory[i] ?? 0) * vecDot(yi, r);
      r = vecAdd(r, vecScale(si, (alpha[i] ?? 0) - beta));
    }

    // Search direction is -r
    const direction = vecScale(r, -1);

    // Line search
    const alpha_ls = armijoLineSearch(fn, x, direction, g, { alpha0: 1.0, c: 1e-4, rho: 0.5 });
    const s = vecScale(direction, alpha_ls);
    const xNext = vecAdd(x, s);
    const gNext = grad(xNext);
    const y = vecSub(gNext, g);

    const ys = vecDot(y, s);
    if (ys > 1e-14) {
      sHistory.push(s);
      yHistory.push(y);
      rhoHistory.push(1 / ys);

      if (sHistory.length > m) {
        sHistory.shift();
        yHistory.shift();
        rhoHistory.shift();
      }
    }

    if (isConverged(xNext, x, tol)) {
      x = xNext;
      g = gNext;
      converged = true;
      iter++;
      break;
    }

    x = xNext;
    g = gNext;
  }

  return { x, value: fn(x), iterations: iter, converged };
}

// ---------------------------------------------------------------------------
// Simulated annealing
// ---------------------------------------------------------------------------

/**
 * Simulated annealing metaheuristic for global minimization.
 */
export function simulatedAnnealing(
  fn: ObjectiveFn,
  x0: number[],
  opts?: {
    initialTemp?: number;
    coolingRate?: number;
    minTemp?: number;
    perturbScale?: number;
    maxIter?: number;
    seed?: number;
    trackHistory?: boolean;
  },
): OptimizeResult {
  const initialTemp = opts?.initialTemp ?? 1.0;
  const coolingRate = opts?.coolingRate ?? 0.95;
  const minTemp = opts?.minTemp ?? 1e-10;
  const perturbScale = opts?.perturbScale ?? 0.1;
  const maxIter = opts?.maxIter ?? 10000;
  const trackHistory = opts?.trackHistory ?? false;

  const rng = makeLCG(opts?.seed ?? 42);

  // Box-Muller for normal samples
  function randn(): number {
    const u1 = rng();
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1 + 1e-15)) * Math.cos(2 * Math.PI * u2);
  }

  let x = vecCopy(x0);
  let fx = fn(x);
  let best = vecCopy(x);
  let bestFx = fx;
  let temp = initialTemp;
  const history: number[] = [];
  let iter = 0;

  for (iter = 0; iter < maxIter && temp > minTemp; iter++) {
    // Gaussian perturbation
    const candidate = x.map((xi) => xi + perturbScale * randn());
    const fc = fn(candidate);
    const delta = fc - fx;

    if (delta < 0 || rng() < Math.exp(-delta / temp)) {
      x = candidate;
      fx = fc;
      if (fx < bestFx) {
        best = vecCopy(x);
        bestFx = fx;
      }
    }

    if (trackHistory) history.push(bestFx);
    temp *= coolingRate;
  }

  const result: OptimizeResult = {
    x: best,
    value: bestFx,
    iterations: iter,
    converged: temp <= minTemp || iter >= maxIter,
  };
  if (trackHistory) result.history = history;
  return result;
}

// ---------------------------------------------------------------------------
// Genetic algorithm
// ---------------------------------------------------------------------------

/**
 * Genetic algorithm for global minimization within box constraints.
 */
export function geneticAlgorithm(
  fn: ObjectiveFn,
  bounds: Array<[number, number]>,
  opts?: {
    populationSize?: number;
    generations?: number;
    mutationRate?: number;
    crossoverRate?: number;
    seed?: number;
    trackHistory?: boolean;
  },
): OptimizeResult {
  const popSize = opts?.populationSize ?? 50;
  const generations = opts?.generations ?? 100;
  const mutationRate = opts?.mutationRate ?? 0.1;
  const crossoverRate = opts?.crossoverRate ?? 0.7;
  const trackHistory = opts?.trackHistory ?? false;

  const rng = makeLCG(opts?.seed ?? 42);
  const history: number[] = [];

  // Initialize population within bounds
  let population: number[][] = Array.from({ length: popSize }, () =>
    bounds.map(([lo, hi]) => lo + rng() * (hi - lo)),
  );

  let fitnesses = population.map((ind) => fn(ind));

  const bestIdx = fitnesses.indexOf(Math.min(...fitnesses));
  let bestX = vecCopy(population[bestIdx] ?? []);
  let bestFx = fitnesses[bestIdx] ?? Infinity;

  for (let gen = 0; gen < generations; gen++) {
    // Tournament selection (size 2)
    function select(): number[] {
      const i = Math.floor(rng() * popSize);
      const j = Math.floor(rng() * popSize);
      return vecCopy((fitnesses[i] ?? Infinity) <= (fitnesses[j] ?? Infinity) ? (population[i] ?? []) : (population[j] ?? []));
    }

    const newPop: number[][] = [];

    for (let i = 0; i < popSize; i++) {
      const parent1 = select();
      const parent2 = select();

      // Uniform crossover
      let child: number[];
      if (rng() < crossoverRate) {
        child = parent1.map((v, d) => (rng() < 0.5 ? v : (parent2[d] ?? v)));
      } else {
        child = vecCopy(parent1);
      }

      // Gaussian mutation
      child = child.map((v, d) => {
        if (rng() < mutationRate) {
          const bound = bounds[d];
          if (bound === undefined) return v;
          const [lo, hi] = bound;
          const scale = (hi - lo) * 0.1;
          const u1 = rng();
          const u2 = rng();
          const noise = Math.sqrt(-2 * Math.log(u1 + 1e-15)) * Math.cos(2 * Math.PI * u2) * scale;
          return Math.max(lo, Math.min(hi, v + noise));
        }
        return v;
      });

      newPop.push(child);
    }

    // Elitism: keep best individual
    newPop[0] = vecCopy(bestX);

    population = newPop;
    fitnesses = population.map((ind) => fn(ind));

    const idx = fitnesses.indexOf(Math.min(...fitnesses));
    if ((fitnesses[idx] ?? Infinity) < bestFx) {
      bestX = vecCopy(population[idx] ?? []);
      bestFx = fitnesses[idx] ?? bestFx;
    }

    if (trackHistory) history.push(bestFx);
  }

  const result: OptimizeResult = {
    x: bestX,
    value: bestFx,
    iterations: generations,
    converged: true,
  };
  if (trackHistory) result.history = history;
  return result;
}

// ---------------------------------------------------------------------------
// Penalty method (constrained optimization)
// ---------------------------------------------------------------------------

/**
 * Penalty method: minimize fn subject to constraints via augmented objective.
 * Inequality constraints g(x) <= 0, equality constraints h(x) = 0.
 */
export function penaltyMethod(
  fn: ObjectiveFn,
  grad: GradientFn,
  x0: number[],
  constraints: Array<{ fn: (x: number[]) => number; type: 'equality' | 'inequality' }>,
  opts?: { penaltyFactor?: number; maxIter?: number; tol?: number },
): OptimizeResult {
  const penaltyFactor = opts?.penaltyFactor ?? 100;
  const maxIter = opts?.maxIter ?? 1000;
  const tol = opts?.tol ?? 1e-6;

  const augmented: ObjectiveFn = (x: number[]) => {
    let penalty = 0;
    for (const con of constraints) {
      const val = con.fn(x);
      if (con.type === 'equality') {
        penalty += val * val;
      } else {
        penalty += Math.max(0, val) ** 2;
      }
    }
    return fn(x) + penaltyFactor * penalty;
  };

  const augmentedGrad: GradientFn = (x: number[]) =>
    numericalGradient(augmented, x);

  return gradientDescent(augmented, augmentedGrad, x0, { maxIter, tol });
}

// ---------------------------------------------------------------------------
// Portfolio optimization (mean-variance)
// ---------------------------------------------------------------------------

/**
 * Mean-variance portfolio optimization (Markowitz).
 * Minimizes portfolio variance subject to target return, weights summing to 1,
 * and non-negativity. Uses projected gradient descent.
 *
 * If targetReturn is omitted, finds the maximum-Sharpe-ratio portfolio.
 */
export function meanVarianceOptimize(
  expectedReturns: number[],
  covMatrix: number[][],
  targetReturn?: number,
  riskFreeRate = 0,
): { weights: number[]; expectedReturn: number; variance: number; sharpeRatio: number } {
  const n = expectedReturns.length;

  /** Portfolio variance: w^T Sigma w */
  function portfolioVariance(w: number[]): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const row = covMatrix[i] ?? [];
      for (let j = 0; j < n; j++) {
        v += (w[i] ?? 0) * (row[j] ?? 0) * (w[j] ?? 0);
      }
    }
    return v;
  }

  /** Gradient of variance: 2 Sigma w */
  function varGrad(w: number[]): number[] {
    return w.map((_, i) => {
      const row = covMatrix[i] ?? [];
      return 2 * w.reduce((s, wj, j) => s + (row[j] ?? 0) * wj, 0);
    });
  }

  /** Project onto simplex (sum=1, w>=0) via Duchi et al. O(n log n) algorithm. */
  function projectSimplex(v: number[]): number[] {
    const sorted = [...v].sort((a, b) => b - a);
    let rho = 0;
    let cumSum = 0;
    for (let i = 0; i < n; i++) {
      cumSum += sorted[i] ?? 0;
      if ((sorted[i] ?? 0) - (cumSum - 1) / (i + 1) > 0) rho = i;
    }
    let cumSumRho = 0;
    for (let i = 0; i <= rho; i++) cumSumRho += sorted[i] ?? 0;
    const theta = (cumSumRho - 1) / (rho + 1);
    return v.map((vi) => Math.max(0, vi - theta));
  }

  // Projected gradient descent for minimum-variance portfolio
  function solveMinVar(returnTarget?: number): number[] {
    let w = new Array(n).fill(1 / n);
    const lr = 0.01;
    const maxIter = 5000;

    for (let iter = 0; iter < maxIter; iter++) {
      let g = varGrad(w);

      if (returnTarget !== undefined) {
        // Augmented objective: var + penalty*(w·mu - target)^2
        const retErr = w.reduce((s, wi, i) => s + wi * (expectedReturns[i] ?? 0), 0) - returnTarget;
        const penalty = 200;
        g = g.map((gi, i) => gi + 2 * penalty * retErr * (expectedReturns[i] ?? 0));
      }

      const wNext = projectSimplex(w.map((wi, i) => wi - lr * (g[i] ?? 0)));

      let maxDiff = 0;
      for (let i = 0; i < n; i++) maxDiff = Math.max(maxDiff, Math.abs((wNext[i] ?? 0) - (w[i] ?? 0)));
      w = wNext;
      if (maxDiff < 1e-8) break;
    }
    return w;
  }

  let weights: number[];

  if (targetReturn !== undefined) {
    weights = solveMinVar(targetReturn);
  } else {
    // Find max-Sharpe portfolio via parametric scan then refine
    let bestSharpe = -Infinity;
    let bestW = new Array(n).fill(1 / n);

    const muMin = Math.min(...expectedReturns);
    const muMax = Math.max(...expectedReturns);
    const steps = 50;

    for (let k = 0; k <= steps; k++) {
      const target = muMin + (k / steps) * (muMax - muMin);
      const w = solveMinVar(target);
      const ret = w.reduce((s, wi, i) => s + wi * (expectedReturns[i] ?? 0), 0);
      const varP = portfolioVariance(w);
      const sharpe = varP > 1e-12 ? (ret - riskFreeRate) / Math.sqrt(varP) : 0;
      if (sharpe > bestSharpe) {
        bestSharpe = sharpe;
        bestW = w;
      }
    }
    weights = bestW;
  }

  const expectedReturn = weights.reduce((s, wi, i) => s + wi * (expectedReturns[i] ?? 0), 0);
  const variance = portfolioVariance(weights);
  const sharpeRatio = variance > 1e-12 ? (expectedReturn - riskFreeRate) / Math.sqrt(variance) : 0;

  return { weights, expectedReturn, variance, sharpeRatio };
}

// ---------------------------------------------------------------------------
// Grid search
// ---------------------------------------------------------------------------

/**
 * Exhaustive grid search over a Cartesian product of parameter grids.
 */
export function gridSearch(
  fn: (...params: number[]) => number,
  paramGrids: number[][],
  opts?: { maximize?: boolean },
): { params: number[]; value: number; evaluations: number } {
  const maximize = opts?.maximize ?? false;
  let bestParams: number[] = [];
  let bestValue = maximize ? -Infinity : Infinity;
  let evaluations = 0;

  function recurse(depth: number, current: number[]): void {
    if (depth === paramGrids.length) {
      const val = fn(...current);
      evaluations++;
      if (maximize ? val > bestValue : val < bestValue) {
        bestValue = val;
        bestParams = [...current];
      }
      return;
    }
    for (const v of paramGrids[depth] ?? []) {
      recurse(depth + 1, [...current, v]);
    }
  }

  recurse(0, []);
  return { params: bestParams, value: bestValue, evaluations };
}

// ---------------------------------------------------------------------------
// Random search
// ---------------------------------------------------------------------------

/**
 * Random search over a box-constrained domain.
 */
export function randomSearch(
  fn: ObjectiveFn,
  bounds: Array<[number, number]>,
  opts?: {
    iterations?: number;
    seed?: number;
    maximize?: boolean;
  },
): OptimizeResult {
  const iterations = opts?.iterations ?? 100;
  const maximize = opts?.maximize ?? false;
  const rng = makeLCG(opts?.seed ?? 42);

  let bestX = bounds.map(([lo, hi]) => lo + rng() * (hi - lo));
  let bestFx = fn(bestX);

  for (let i = 1; i < iterations; i++) {
    const x = bounds.map(([lo, hi]) => lo + rng() * (hi - lo));
    const fx = fn(x);
    if (maximize ? fx > bestFx : fx < bestFx) {
      bestX = x;
      bestFx = fx;
    }
  }

  return { x: bestX, value: bestFx, iterations, converged: true };
}

// ---------------------------------------------------------------------------
// Convergence utilities
// ---------------------------------------------------------------------------

/**
 * Returns true if the max absolute difference between current and previous
 * is below tol.
 */
export function isConverged(current: number[], previous: number[], tol: number): boolean {
  for (let i = 0; i < current.length; i++) {
    if (Math.abs((current[i] ?? 0) - (previous[i] ?? 0)) >= tol) return false;
  }
  return true;
}

/**
 * Returns a learning rate according to a decay schedule.
 *
 * - step: piecewise constant, lr * decayFactor^floor(step/stepSize)
 * - exponential: lr * decayFactor^step
 * - cosine: lr * 0.5 * (1 + cos(pi * step / totalSteps))
 * - warmup: linear ramp from 0 to lr over totalSteps
 */
export function decaySchedule(
  initialLr: number,
  step: number,
  decayType: 'step' | 'exponential' | 'cosine' | 'warmup',
  opts?: { stepSize?: number; decayFactor?: number; totalSteps?: number },
): number {
  const stepSize = opts?.stepSize ?? 100;
  const decayFactor = opts?.decayFactor ?? 0.1;
  const totalSteps = opts?.totalSteps ?? 1000;

  switch (decayType) {
    case 'step':
      return initialLr * Math.pow(decayFactor, Math.floor(step / stepSize));
    case 'exponential':
      return initialLr * Math.pow(decayFactor, step);
    case 'cosine':
      return initialLr * 0.5 * (1 + Math.cos(Math.PI * step / totalSteps));
    case 'warmup':
      if (totalSteps <= 0) return initialLr;
      return initialLr * Math.min(1, step / totalSteps);
  }
}
