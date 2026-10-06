
export function leastSquaresActive(
  Theta: readonly (readonly number[])[],
  dXdt: readonly number[],
  active: readonly number[],
): number[] {
  const p = active.length;
  const cols = Theta.length === 0 ? 0 : (Theta[0]?.length ?? 0);
  const xi = new Array<number>(cols).fill(0);
  if (p === 0 || Theta.length === 0) return xi;
  // Normal equations on the active set: (A'A) w = A'y
  const AtA: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Aty = new Array<number>(p).fill(0);
  for (let r = 0; r < Theta.length; r++) {
    const row = Theta[r] ?? [];
    const y = dXdt[r] ?? 0;
    for (let a = 0; a < p; a++) {
      const va = row[active[a] ?? 0] ?? 0;
      Aty[a] = (Aty[a] ?? 0) + va * y;
      for (let b = 0; b < p; b++) AtA[a]![b] = (AtA[a]![b] ?? 0) + va * (row[active[b] ?? 0] ?? 0);
    }
  }
  // Gaussian elimination with partial pivot
  const m = AtA.map((row, i) => [...row, Aty[i] ?? 0]);
  for (let col = 0; col < p; col++) {
    let piv = col;
    for (let r = col + 1; r < p; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    if (Math.abs(m[piv]![col]!) < 1e-12) continue;
    const tmp = m[col]!;
    m[col] = m[piv]!;
    m[piv] = tmp;
    for (let r = 0; r < p; r++) {
      if (r === col) continue;
      const f = (m[r]![col] ?? 0) / (m[col]![col] ?? 1);
      for (let c = col; c <= p; c++) m[r]![c] = (m[r]![c] ?? 0) - f * (m[col]![c] ?? 0);
    }
  }
  const w = m.map((row, i) => (row[p] ?? 0) / (Math.abs(row[i] ?? 0) < 1e-12 ? 1 : (row[i] ?? 1)));
  for (let a = 0; a < p; a++) xi[active[a] ?? 0] = w[a] ?? 0;
  return xi;
}

/** Sequentially thresholded least squares: the SINDy sparsification loop. */
export function stlsq(
  Theta: readonly (readonly number[])[],
  dXdt: readonly number[],
  lambda: number,
  iters = 10,
): number[] {
  const cols = Theta.length === 0 ? 0 : (Theta[0]?.length ?? 0);
  let active = Array.from({ length: cols }, (_, j) => j);
  let xi = leastSquaresActive(Theta, dXdt, active);
  for (let it = 0; it < iters; it++) {
    const next = active.filter((j) => Math.abs(xi[j] ?? 0) >= lambda);
    if (next.length === active.length) break;
    active = next;
    xi = leastSquaresActive(Theta, dXdt, active);
    if (active.length === 0) break;
  }
  return xi;
}

export interface SideInfoSpec {
  /** Index of the score-differential library term (d f / d score_diff >= 0 there). */
  readonly scoreDiffTerm?: number;
  /** Index of the win-prob state in the library (boundedness target). */
  readonly bounded?: boolean;
}

export interface SideInfoReport {
  readonly bounded: boolean;
  readonly equilibrium: boolean;
  readonly monotone: boolean;
}

/**
 * Verify side information on a sample grid. NOTE: the paper's gate requires an SOS
 * certificate, not sampling; this verifier is the cheap pre-check before certification.
 */
export function verifySideInfo(
  f: (x: readonly number[]) => number,
  dfdScore: (x: readonly number[]) => number,
  grid: readonly (readonly number[])[],
): SideInfoReport {
  let bounded = true;
  let equilibrium = true;
  let monotone = true;
  for (const x of grid) {
    const v = f(x);
    if (!(v >= -1e-9 && v <= 1 + 1e-9)) bounded = false;
    const tied = x.every((xi) => Math.abs(xi) < 1e-12);
    if (tied && Math.abs(v) > 1e-9) equilibrium = false;
    if (dfdScore(x) < -1e-9) monotone = false;
  }
  return { bounded, equilibrium, monotone };
}

/** Drop the intercept column (index 0 by convention) to enforce the t=0 equilibrium. */
export function dropIntercept(xi: readonly number[]): number[] {
  return xi.map((v, j) => (j === 0 ? 0 : v));
}
