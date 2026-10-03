// ============================================================
// Multivariate Kelly Newton-CG slate solver (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2604.24723v2 — "Efficient Multivariate Kelly Optimization Reveals Sigmoidal Scaling Laws"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: efficient O(TN) multivariate Kelly optimization —
 * joint log-growth maximization over up to ~10 simultaneous picks via
 * Newton-CG: Newton steps whose Hessian system is solved with conjugate
 * gradients using Hessian-vector products (O(TN) per matvec over T
 * scenarios), avoiding the O(N³) factorization. A correlation guard
 * measures how far the independence-assuming solver over-bets on
 * same-game correlated slates.
 *
 * IMPROVEMENT (from ledger): Replace per-pick fractional Kelly on weekly slates with the O(TN) multivariate Kelly Newton-CG solver (joint log-growth maximization over up to ~10 simultaneous picks), and measure how far the independence-assuming solver over-bets on same-game correlated slates to calibrate a correlation guard.
 *
 * ACCEPTANCE GATE: At N = 10 over 100 random instances: max relative error vs brute force ≤ 10⁻⁶; Newton-CG optimum ≥ greedy lower bound on every instance; adopt as the slate stake allocator if it beats current per-pick fractional Kelly on realized log-wealth and max drawdown on Neon picks slates.
 */

/** Mean log-growth objective over T scenarios (rows) for weights f. */
export function kellyObjective(f: number[], scenarios: number[][]): number {
  const T = scenarios.length;
  if (T === 0) return 0;
  let sum = 0;
  for (const r of scenarios) {
    let dot = 0;
    for (let i = 0; i < f.length; i++) dot += f[i]! * r[i]!;
    sum += Math.log(Math.max(1 + dot, 1e-12));
  }
  return sum / T;
}

/** Gradient of the mean log-growth objective. */
export function kellyGradient(f: number[], scenarios: number[][]): number[] {
  const N = f.length;
  const T = scenarios.length;
  const g = new Array<number>(N).fill(0);
  for (const r of scenarios) {
    let dot = 0;
    for (let i = 0; i < N; i++) dot += f[i]! * r[i]!;
    const w = 1 / Math.max(1 + dot, 1e-12);
    for (let i = 0; i < N; i++) g[i]! += (r[i]! * w) / T;
  }
  return g;
}

/** Hessian-vector product H(f)·v in O(TN) — the Newton-CG inner kernel. */
export function kellyHessianVec(f: number[], v: number[], scenarios: number[][]): number[] {
  const N = f.length;
  const T = scenarios.length;
  const Hv = new Array<number>(N).fill(0);
  for (const r of scenarios) {
    let dot = 0;
    let rdotv = 0;
    for (let i = 0; i < N; i++) {
      dot += f[i]! * r[i]!;
      rdotv += v[i]! * r[i]!;
    }
    const w = 1 / Math.max(1 + dot, 1e-12) ** 2 / T;
    for (let i = 0; i < N; i++) Hv[i]! -= r[i]! * rdotv * w;
  }
  return Hv;
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i]!, 0);
}

/** Conjugate-gradient solve of H·x = b via Hessian-vector products. */
export function conjugateGradient(
  hessVec: (v: number[]) => number[],
  b: number[],
  maxIter = 200,
  tol = 1e-10,
): number[] {
  const N = b.length;
  const x = new Array<number>(N).fill(0);
  let r = b.slice();
  let p = b.slice();
  let rsold = dot(r, r);
  for (let it = 0; it < Math.min(maxIter, N * 4); it++) {
    const Ap = hessVec(p);
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-18) break;
    const alpha = rsold / pAp;
    for (let i = 0; i < N; i++) {
      x[i]! += alpha * p[i]!;
      r[i]! -= alpha * Ap[i]!;
    }
    const rsnew = dot(r, r);
    if (Math.sqrt(rsnew) < tol) break;
    const beta = rsnew / Math.max(rsold, 1e-300);
    for (let i = 0; i < N; i++) p[i] = r[i]! + beta * p[i]!;
    rsold = rsnew;
  }
  return x;
}

/**
 * Newton-CG multivariate Kelly: Newton steps with CG inner solves,
 * backtracking line search, projected to f ≥ 0 with Σf ≤ 1.
 */
export function newtonCgKelly(
  scenarios: number[][],
  nAssets: number,
  maxNewtonIter = 50,
): number[] {
  let f = new Array<number>(nAssets).fill(0);
  for (let iter = 0; iter < maxNewtonIter; iter++) {
    const g = kellyGradient(f, scenarios);
    const hv = (v: number[]) => {
      const out = kellyHessianVec(f, v, scenarios);
      // Damped Hessian for positive-definiteness of the CG system (-H + λI).
      return out.map((x, i) => -x + 1e-8 * v[i]!);
    };
    const step = conjugateGradient(hv, g);
    // Project step to a feasible descent direction (keep f ≥ 0).
    let alpha = 1;
    const f0 = kellyObjective(f, scenarios);
    let improved = false;
    for (let ls = 0; ls < 40; ls++) {
      const cand = f.map((x, i) => Math.max(0, x + alpha * step[i]!));
      const s = cand.reduce((a, b) => a + b, 0);
      const proj = s > 1 ? cand.map((x) => x / s) : cand;
      if (kellyObjective(proj, scenarios) > f0 + 1e-12) {
        f = proj;
        improved = true;
        break;
      }
      alpha *= 0.5;
    }
    if (!improved) break;
    if (Math.sqrt(dot(g, g)) < 1e-9) break;
  }
  return f;
}

/** Greedy coordinate-ascent Kelly (lower-bound baseline for the gate). */
export function greedyKelly(scenarios: number[][], nAssets: number): number[] {
  const f = new Array<number>(nAssets).fill(0);
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < nAssets; i++) {
      const base = kellyObjective(f, scenarios);
      let bestD = 0;
      let bestObj = base;
      for (const d of [0.02, 0.05, 0.1]) {
        for (const sgn of [1, -1]) {
          const cand = f.slice();
          cand[i] = Math.max(0, Math.min(1, cand[i]! + sgn * d));
          const o = kellyObjective(cand, scenarios);
          if (o > bestObj + 1e-12) {
            bestObj = o;
            bestD = sgn * d;
          }
        }
      }
      if (bestD !== 0) {
        f[i] = Math.max(0, Math.min(1, f[i]! + bestD));
        moved = true;
      }
    }
    if (!moved) break;
  }
  return f;
}

export interface NewtonCgGate {
  maxRelError: number;
  newtonCgBeatsGreedy: boolean;
  passes: boolean;
}

/**
 * Acceptance-gate helper (unit-test scale): max relative error vs brute
 * force ≤ 1e-6 and Newton-CG optimum ≥ greedy lower bound.
 */
export function newtonCgGatePasses(maxRelError: number, newtonCgBeatsGreedy: boolean): NewtonCgGate {
  const passes = maxRelError <= 1e-6 && newtonCgBeatsGreedy;
  return { maxRelError, newtonCgBeatsGreedy, passes };
}
