
/** Build the library row: 2nd-order polynomials + abs terms over the state vector. */
export function gameStateLibraryRow(state: readonly number[]): number[] {
  const terms: number[] = [1, ...state];
  for (let i = 0; i < state.length; i++) {
    terms.push(Math.abs(state[i] ?? 0));
    for (let j = i; j < state.length; j++) terms.push((state[i] ?? 0) * (state[j] ?? 0));
  }
  return terms;
}

export function stlsqFit(
  Theta: readonly (readonly number[])[],
  dXdt: readonly number[],
  lambda: number,
  iters = 10,
): number[] {
  const cols = Theta.length === 0 ? 0 : (Theta[0]?.length ?? 0);
  let active = Array.from({ length: cols }, (_, j) => j);
  let xi = leastSquares(Theta, dXdt, active);
  for (let it = 0; it < iters; it++) {
    const next = active.filter((j) => Math.abs(xi[j] ?? 0) >= lambda);
    if (next.length === active.length) break;
    active = next;
    xi = leastSquares(Theta, dXdt, active);
    if (active.length === 0) break;
  }
  return xi;
}

function leastSquares(
  Theta: readonly (readonly number[])[],
  dXdt: readonly number[],
  active: readonly number[],
): number[] {
  const p = active.length;
  const cols = Theta.length === 0 ? 0 : (Theta[0]?.length ?? 0);
  const xi = new Array<number>(cols).fill(0);
  if (p === 0 || Theta.length === 0) return xi;
  const AtA: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Aty = new Array<number>(p).fill(0);
  for (let r = 0; r < Theta.length; r++) {
    const row = Theta[r] ?? [];
    const y = dXdt[r] ?? 0;
    for (let a = 0; a < p; a++) {
      const va = row[active[a] ?? 0] ?? 0;
      Aty[a] = (Aty[a] ?? 0) + va * y;
      for (let bIdx = 0; bIdx < p; bIdx++) AtA[a]![bIdx] = (AtA[a]![bIdx] ?? 0) + va * (row[active[bIdx] ?? 0] ?? 0);
    }
  }
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

/** Open-loop forecast score: 1 - NMSE, floored at 0 (the BFR-style gate metric). */
export function openLoopBfr(actual: readonly number[], predicted: readonly number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    throw new Error("sindy-dynamics: aligned non-empty series required");
  }
  const mean = actual.reduce((s, v) => s + v, 0) / actual.length;
  const denom = actual.reduce((s, v) => s + (v - mean) ** 2, 0);
  if (denom < 1e-12) return 1;
  const num = actual.reduce((s, v, i) => s + (v - (predicted[i] ?? 0)) ** 2, 0);
  return Math.max(0, 1 - num / denom);
}

export function nonzeroCount(xi: readonly number[], tol = 1e-9): number {
  return xi.filter((v) => Math.abs(v) > tol).length;
}
