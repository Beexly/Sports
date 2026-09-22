
export interface TwoStepSimOptions {
  /** Mhat_{eta eta}: weight-block of the Hessian (d x d, positive definite). */
  readonly mEtaEta: readonly (readonly number[])[];
  /** Mhat_{eta gamma}: cross-block weight/model-parameter Hessian (d x q). */
  readonly mEtaGamma: readonly (readonly number[])[];
  /** P/R: out-of-sample over in-sample size ratio. */
  readonly prRatio: number;
  readonly draws?: number;
  readonly alpha?: number;
  readonly seed?: number;
}

function solveLinear(A: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = A.length;
  const m = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    }
    if (Math.abs(m[piv]![col]!) < 1e-12) throw new Error("two-step-aware-test: singular Mhat_{eta eta}");
    const tmp = m[col]!;
    m[col] = m[piv]!;
    m[piv] = tmp;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (m[r]![col] ?? 0) / (m[col]![col] ?? 1);
      for (let c = col; c <= n; c++) m[r]![c] = (m[r]![c] ?? 0) - f * (m[col]![c] ?? 0);
    }
  }
  return m.map((row, i) => (row[n] ?? 0) / (row[i] ?? 1));
}

function matVec(A: readonly (readonly number[])[], x: readonly number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (x[j] ?? 0), 0));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randnVec(rng: () => number, d: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < d; i += 2) {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    out.push(r * Math.cos(2 * Math.PI * u2));
    if (out.length < d) out.push(r * Math.sin(2 * Math.PI * u2));
  }
  return out;
}

/**
 * Simulate the conservative two-step-aware critical value (paper eq. 10):
 * cv_{(1-alpha)H} of Delta^{(h)} = 1/2 ||X^{(h)} + (P/R)^{1/2} Mhat_{eta gamma} Z^{(h)}||^2_{Mhat_{eta eta}^{-1}}.
 */
export function twoStepAwareCriticalValue(o: TwoStepSimOptions): number {
  const d = o.mEtaEta.length;
  if (d === 0) throw new Error("two-step-aware-test: mEtaEta must be non-empty");
  const draws = o.draws ?? 10000;
  const alpha = o.alpha ?? 0.05;
  if (draws < 1) throw new Error("two-step-aware-test: draws >= 1 required");
  const rng = mulberry32(o.seed ?? 1172);
  const q = o.mEtaGamma.length > 0 ? (o.mEtaGamma[0]?.length ?? d) : d;
  const scale = Math.sqrt(Math.max(o.prRatio, 0));
  const stats: number[] = new Array(draws);
  for (let h = 0; h < draws; h++) {
    const x = randnVec(rng, d);
    const z = randnVec(rng, q);
    const mgz = matVec(o.mEtaGamma, z);
    const w = x.map((xi, i) => xi + scale * (mgz[i] ?? 0));
    const minvW = solveLinear(o.mEtaEta, w);
    const quad = w.reduce((s, wi, i) => s + wi * (minvW[i] ?? 0), 0);
    stats[h] = 0.5 * quad;
  }
  stats.sort((a, b) => a - b);
  const idx = Math.min(draws - 1, Math.max(0, Math.floor((1 - alpha) * draws)));
  return stats[idx] ?? 0;
}

/** Reject H0 (benchmark at least as good) when P * Delta_P > cv (paper eq. 10). */
export function twoStepAwareReject(pTimesDeltaP: number, criticalValue: number): boolean {
  return pTimesDeltaP > criticalValue;
}

/** Weight-distance bar: weights within O(T^{-1/4}) are indistinguishable (Theorem 4.1). */
export function weightDistanceBar(T: number): number {
  if (!(T > 0)) throw new Error("two-step-aware-test: T must be positive");
  return Math.pow(T, -0.25);
}

/** True when two weighting schemes are far enough apart that a test could separate them. */
export function weightsDistinguishable(wA: readonly number[], wB: readonly number[], T: number): boolean {
  const dist = Math.sqrt(wA.reduce((s, a, i) => s + (a - (wB[i] ?? 0)) ** 2, 0));
  return dist >= weightDistanceBar(T);
}
