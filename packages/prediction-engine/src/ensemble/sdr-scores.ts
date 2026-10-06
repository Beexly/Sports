/**
 * Sliced inverse regression (SIR) sufficient-dimension-reduction scores.
 *
 * Given n x p features X and response y:
 *  1. Standardize: Z = (X - mean) * Sigma^{-1/2}, where Sigma^{-1/2} comes
 *     from a Newton-Schulz iteration for the inverse square root
 *     (Z <- Z (3I - Z^2 M Z^2)/2 style update converging to M^{-1/2}).
 *  2. Slice y into H bins; compute slice means m_h of Z and slice weights p_h.
 *  3. Form V = sum_h p_h m_h m_h' and take its top-d eigenvectors beta.
 *  4. EDR directions in X-space: eta_j = Sigma^{-1/2} beta_j; scores = Xc eta_j.
 *
 * Pure TypeScript, no I/O. Small self-contained Jacobi eigendecomposition.
 *
 * Reference: arXiv:2606.24171v1 — Predicting the 2026 FIFA World Cup with
 * Sufficient Dimension Reduction.
 *
 * ACCEPTANCE GATE: SDR scores improve the downstream win-probability model
 * versus raw features.
 */

function mean(v: readonly number[]): number {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function matVecMul(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((a, b, j) => a + (b * (x[j] ?? 0)), 0));
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = (B[0] ?? []).length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => A[i]!.reduce((a, b, k) => a + b * (B[k]?.[j] ?? 0), 0)),
  );
}

function transpose(A: number[][]): number[][] {
  return A[0]!.map((_, j) => A.map((row) => row[j]!));
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

/** Newton-Schulz iteration for the inverse square root M^{-1/2}. */
export function inverseSqrt(M: number[][], iters = 20): number[][] {
  const n = M.length;
  if (n === 0 || M.some((row) => row.length !== n)) {
    throw new Error("inverseSqrt: M must be a non-empty square matrix");
  }
  const frob = Math.sqrt(M.flat().reduce((a, b) => a + b * b, 0));
  if (!(frob > 0)) throw new Error("inverseSqrt: M must be non-zero");
  // Scale so eigenvalues of Y0*Z0 lie in (0, 2): start from M / frob.
  let Y: number[][] = M.map((row) => row.map((v) => v / frob));
  let Z: number[][] = identity(n);
  for (let t = 0; t < iters; t++) {
    // Coupled iteration: Y_{k+1} = Y_k (3I - Z_k Y_k)/2, Z_{k+1} = (3I - Z_k Y_k)/2 Z_k.
    // Limit: Y -> (M/f)^{1/2}, Z -> (M/f)^{-1/2} = sqrt(f) M^{-1/2}; rescale Z below.
    const ZY = matMul(Z, Y);
    const H = ZY.map((row, i) => row.map((v, j) => ((i === j ? 3 : 0) - v) / 2));
    Y = matMul(Y, H);
    Z = matMul(H, Z);
  }
  // Coupled Newton-Schulz: Y -> (M/frob)^{1/2}, Z -> (M/frob)^{-1/2}.
  // Hence Z / sqrt(frob) -> M^{-1/2}. (Returning Y here would give the
  // square root, not the inverse square root.)
  const s = 1 / Math.sqrt(frob);
  return Z.map((row) => row.map((v) => v * s));
}

/** Symmetric eigendecomposition via cyclic Jacobi rotations. */
export function jacobiEigen(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length;
  if (n === 0 || A.some((row) => row.length !== n)) {
    throw new Error("jacobiEigen: A must be a non-empty square matrix");
  }
  const a = A.map((row) => row.slice());
  const v = identity(n);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        off += (a[p]![q]!) ** 2;
        if (Math.abs(a[p]![q]!) < 1e-12) continue;
        const theta = ((a[q]![q]!) - (a[p]![p]!)) / (2 * (a[p]![q]!));
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
    if (off < 1e-20) break;
  }
  const values = a.map((row, i) => row[i]!);
  const order = values.map((_, i) => i).sort((x, y) => values[y]! - values[x]!);
  return {
    values: order.map((i) => values[i]!),
    vectors: order.map((i) => v.map((row) => row[i]!)),
  };
}

export interface SirResult {
  /** EDR directions in original X-space (p-vectors), eigenvalue order. */
  readonly directions: number[][];
  /** SDR scores: n x d projection of centered X onto directions. */
  readonly scores: number[][];
  /** Eigenvalues of the SIR kernel matrix. */
  readonly eigenvalues: number[];
}

/**
 * Sliced inverse regression.
 * @param X n x p feature matrix (rows = observations).
 * @param y length-n response.
 * @param nSlices number of y slices H (>= 2).
 * @param nDirs number of EDR directions to return (1..p).
 */
export function slicedInverseRegression(
  X: number[][],
  y: number[],
  nSlices: number,
  nDirs: number,
): SirResult {
  const n = X.length;
  if (n === 0) throw new Error("slicedInverseRegression: X must be non-empty");
  const p = X[0]!.length;
  if (X.some((row) => row.length !== p)) throw new Error("slicedInverseRegression: ragged X");
  if (y.length !== n) throw new Error("slicedInverseRegression: y length must match X rows");
  if (!(nSlices >= 2 && nSlices <= n)) throw new Error("slicedInverseRegression: nSlices in [2, n]");
  if (!(nDirs >= 1 && nDirs <= p)) throw new Error("slicedInverseRegression: nDirs in [1, p]");
  for (const row of X) for (const v of row) {
    if (!Number.isFinite(v)) throw new Error("slicedInverseRegression: X must be finite");
  }

  // Center X; covariance with a small ridge for numerical safety.
  const mu = Array.from({ length: p }, (_, j) => mean(X.map((row) => row[j]!)));
  const Xc = X.map((row) => row.map((v, j) => v - mu[j]!));
  const Xt = transpose(Xc);
  const Sigma = matMul(Xt, Xc).map((row) => row.map((v) => v / n));
  const ridge = 1e-8;
  const SigReg = Sigma.map((row, i) => row.map((v, j) => v + (i === j ? ridge : 0)));
  const invSqrt = inverseSqrt(SigReg);
  const Z = Xc.map((row) => matVecMul(invSqrt, row));

  // Slice y into H quantile bins.
  const order = y.map((v, i) => i).sort((a, b) => y[a]! - y[b]!);
  const H = nSlices;
  const V = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let h = 0; h < H; h++) {
    const lo = Math.floor((h * n) / H);
    const hi = Math.floor(((h + 1) * n) / H);
    const idx = order.slice(lo, hi);
    if (idx.length === 0) continue;
    const mh = Array.from({ length: p }, (_, j) => mean(idx.map((i) => Z[i]![j]!)));
    const ph = idx.length / n;
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) V[a]![b]! += ph * mh[a]! * mh[b]!;
    }
  }
  const { values, vectors } = jacobiEigen(V);
  const dirs = vectors.slice(0, nDirs).map((beta) => matVecMul(invSqrt, beta));
  const scores = Xc.map((row) => dirs.map((d) => row.reduce((a, v, j) => a + v * d[j]!, 0)));
  return { directions: dirs, eigenvalues: values, scores };
}
