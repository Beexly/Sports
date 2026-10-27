/**
 * arXiv:1807.09236 — Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs.
 *
 * gamma_SHR = (I - R) gamma_MLE + R u
 * R = (I + A S)^{-1}
 *
 * ENABLED = false until wired into the ratings layer.
 */
export const ENABLED = false;

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (x[j] ?? 0), 0));
}

function matMul(A: number[][], B: number[][]): number[][] {
  const rows = A.length;
  const inner = B.length;
  const cols = B[0]?.length ?? 0;
  const out: number[][] = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let k = 0; k < inner; k++) s += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
      out[i]![j] = s;
    }
  }
  return out;
}

function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + (B[i]?.[j] ?? 0)));
}

/** Gauss-Jordan inverse with partial pivoting. Throws on a singular matrix. */
function invert(M: number[][]): number[][] {
  const n = M.length;
  const I = identity(n);
  const aug: number[][] = M.map((row, i) => [...row, ...I[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r]![col]!) > Math.abs(aug[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(aug[pivot]![col]!) < 1e-12) {
      throw new Error("1807-09236: (I + A S) is singular and cannot be inverted");
    }
    if (pivot !== col) {
      const tmp = aug[pivot]!;
      aug[pivot] = aug[col]!;
      aug[col] = tmp;
    }
    const pv = aug[col]![col]!;
    aug[col] = aug[col]!.map((v) => v / pv);
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r]![col]!;
      if (f === 0) continue;
      aug[r] = aug[r]!.map((v, j) => v - f * aug[col]![j]!);
    }
  }
  return aug.map((row) => row.slice(n));
}

/**
 * Shrink BTL maximum-likelihood estimates.
 *
 * Implements the paper's empirical-Bayes form exactly:
 *   gamma_SHR = (I - R) gamma_MLE + R u,   R = (I + A S)^{-1}
 *
 * S may be a scalar precision (treated as S times the identity) or a full
 * matrix of data precisions. Larger S means more trust in the MLE; S = 0
 * collapses fully to the prior u. There is no hardcoded blend factor here —
 * the only shrinkage weight is R, derived from A and S.
 */
export function shrinkBtl(
  gammaMle: number[],
  A: number[][],
  S: number[][] | number,
  u: number[]
): number[] {
  const n = gammaMle.length;
  if (n === 0) return [];

  // The paper's form acts on one n-dimensional Bradley-Terry parameter vector,
  // so A, S and u must all be conformable with gamma_MLE's length n. Without
  // these guards a 3x3 A against a 2-vector silently returns garbage the
  // caller cannot distinguish from a correct shrinkage. Refuse instead.
  if (A.length !== n || A.some((row) => row.length !== n)) {
    throw new Error(
      `1807-09236: dimension mismatch — A must be n x n with n = gamma_MLE.length (${n})`,
    );
  }
  if (u.length !== n) {
    throw new Error(
      `1807-09236: dimension mismatch — prior mean u has length ${u.length}, expected ${n}`,
    );
  }
  if (typeof S !== "number" && (S.length !== n || S.some((row) => row.length !== n))) {
    throw new Error(
      `1807-09236: dimension mismatch — S must be n x n with n = ${n}, or a scalar precision`,
    );
  }

  const AS: number[][] =
    typeof S === "number"
      ? A.map((row) => row.map((v) => v * S))
      : matMul(A, S);

  const I = identity(n);
  const R = invert(matAdd(I, AS));
  const ImR = I.map((row, i) => row.map((v, j) => v - (R[i]?.[j] ?? 0)));

  const fromMle = matVec(ImR, gammaMle);
  const fromPrior = matVec(R, u);
  return fromMle.map((v, i) => v + (fromPrior[i] ?? 0));
}
