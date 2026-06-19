/**
 * Linear algebra utilities — pure TypeScript, zero dependencies.
 *
 * Vectors (1D arrays), matrices (2D arrays), decompositions, solvers,
 * orthogonalization, special matrices, statistics-adjacent helpers,
 * and sports-specific applications.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 1-D numeric vector. */
export type Vec = number[];

/** 2-D numeric matrix (row-major). */
export type Mat = number[][];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertSameLength(a: Vec, b: Vec, fn: string): void {
  if (a.length !== b.length)
    throw new Error(`${fn}: length mismatch ${a.length} vs ${b.length}`);
}

function assertSquare(A: Mat, fn: string): void {
  const rows = A.length;
  const cols = A.length > 0 ? A[0].length : 0;
  if (rows !== cols)
    throw new Error(`${fn}: requires square matrix, got [${rows},${cols}]`);
}

function zeros2d(r: number, c: number): Mat {
  return Array.from({ length: r }, () => new Array<number>(c).fill(0));
}

function identity(n: number): Mat {
  const I = zeros2d(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function cloneMat(A: Mat): Mat {
  return A.map(row => [...row]);
}

// ---------------------------------------------------------------------------
// Vector operations
// ---------------------------------------------------------------------------

/** Element-wise addition of two vectors of equal length. */
export function vecAdd(a: Vec, b: Vec): Vec {
  assertSameLength(a, b, 'vecAdd');
  return a.map((v, i) => v + b[i]);
}

/** Element-wise subtraction of two vectors of equal length. */
export function vecSub(a: Vec, b: Vec): Vec {
  assertSameLength(a, b, 'vecSub');
  return a.map((v, i) => v - b[i]);
}

/** Multiply every element of v by scalar. */
export function vecScale(v: Vec, scalar: number): Vec {
  return v.map(x => x * scalar);
}

/** Dot product of two vectors of equal length. */
export function vecDot(a: Vec, b: Vec): number {
  assertSameLength(a, b, 'vecDot');
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Cross product; only defined for 3-D vectors. Throws otherwise. */
export function vecCross(a: Vec, b: Vec): Vec {
  if (a.length !== 3 || b.length !== 3)
    throw new Error(`vecCross: requires 3-D vectors, got ${a.length} and ${b.length}`);
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * p-norm of a vector.  Default p = 2 (Euclidean).
 * p = Infinity gives the Chebyshev / max norm.
 */
export function vecNorm(v: Vec, p = 2): number {
  if (!isFinite(p)) return Math.max(...v.map(Math.abs));
  if (p === 1) return v.reduce((s, x) => s + Math.abs(x), 0);
  if (p === 2) return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return Math.pow(v.reduce((s, x) => s + Math.pow(Math.abs(x), p), 0), 1 / p);
}

/**
 * Return the unit vector in the direction of v.
 * If v is all-zero, returns all-zero (no throw).
 */
export function vecNormalize(v: Vec): Vec {
  const n = vecNorm(v);
  if (n === 0) return new Array<number>(v.length).fill(0);
  return v.map(x => x / n);
}

/** Angle in radians between a and b, in [0, π]. */
export function vecAngle(a: Vec, b: Vec): number {
  assertSameLength(a, b, 'vecAngle');
  const na = vecNorm(a);
  const nb = vecNorm(b);
  if (na === 0 || nb === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, vecDot(a, b) / (na * nb)));
  return Math.acos(cosTheta);
}

/** Orthogonal projection of a onto b. */
export function vecProject(a: Vec, b: Vec): Vec {
  assertSameLength(a, b, 'vecProject');
  const nb2 = vecDot(b, b);
  if (nb2 === 0) return new Array<number>(a.length).fill(0);
  return vecScale(b, vecDot(a, b) / nb2);
}

/** Rejection of a from b  (a minus its projection onto b). */
export function vecReject(a: Vec, b: Vec): Vec {
  return vecSub(a, vecProject(a, b));
}

/** Outer product: returns m×n matrix where result[i][j] = a[i]*b[j]. */
export function vecOuter(a: Vec, b: Vec): Mat {
  return a.map(ai => b.map(bj => ai * bj));
}

/** Component-wise mean of a list of equal-length vectors. */
export function vecMean(vectors: Vec[]): Vec {
  if (vectors.length === 0) return [];
  const n = vectors[0].length;
  const sum = new Array<number>(n).fill(0);
  for (const v of vectors) for (let i = 0; i < n; i++) sum[i] += v[i];
  return sum.map(s => s / vectors.length);
}

/** Element-wise population variance across a list of equal-length vectors. */
export function vecVariance(vectors: Vec[]): Vec {
  if (vectors.length === 0) return [];
  const mu = vecMean(vectors);
  const n = mu.length;
  const v = new Array<number>(n).fill(0);
  for (const vec of vectors) for (let i = 0; i < n; i++) v[i] += (vec[i] - mu[i]) ** 2;
  return v.map(s => s / vectors.length);
}

/** Cosine similarity in [-1, 1].  Returns 0 if either vector is zero. */
export function cosineSimilarity(a: Vec, b: Vec): number {
  assertSameLength(a, b, 'cosineSimilarity');
  const na = vecNorm(a);
  const nb = vecNorm(b);
  if (na === 0 || nb === 0) return 0;
  return vecDot(a, b) / (na * nb);
}

/** Euclidean (L-2) distance between a and b. */
export function euclideanDistance(a: Vec, b: Vec): number {
  assertSameLength(a, b, 'euclideanDistance');
  return vecNorm(vecSub(a, b), 2);
}

/** Manhattan (L-1) distance between a and b. */
export function manhattanDistance(a: Vec, b: Vec): number {
  assertSameLength(a, b, 'manhattanDistance');
  return vecNorm(vecSub(a, b), 1);
}

/** Chebyshev (L-∞) distance: max |a_i - b_i|. */
export function chebyshevDistance(a: Vec, b: Vec): number {
  assertSameLength(a, b, 'chebyshevDistance');
  return vecNorm(vecSub(a, b), Infinity);
}

/** Minkowski distance with exponent p. */
export function minkowskiDistance(a: Vec, b: Vec, p: number): number {
  assertSameLength(a, b, 'minkowskiDistance');
  return vecNorm(vecSub(a, b), p);
}

// ---------------------------------------------------------------------------
// Matrix operations
// ---------------------------------------------------------------------------

function matShape(A: Mat): [number, number] {
  return [A.length, A.length > 0 ? A[0].length : 0];
}

function assertSameShape(A: Mat, B: Mat, fn: string): void {
  const [ra, ca] = matShape(A);
  const [rb, cb] = matShape(B);
  if (ra !== rb || ca !== cb)
    throw new Error(`${fn}: shape mismatch [${ra},${ca}] vs [${rb},${cb}]`);
}

/** Element-wise matrix addition. */
export function matAdd(A: Mat, B: Mat): Mat {
  assertSameShape(A, B, 'matAdd');
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

/** Element-wise matrix subtraction. */
export function matSub(A: Mat, B: Mat): Mat {
  assertSameShape(A, B, 'matSub');
  return A.map((row, i) => row.map((v, j) => v - B[i][j]));
}

/** Multiply every element of A by scalar. */
export function matScale(A: Mat, scalar: number): Mat {
  return A.map(row => row.map(v => v * scalar));
}

/** Matrix multiplication A (m×k) × B (k×n) → (m×n). */
export function matMul(A: Mat, B: Mat): Mat {
  const [ra, ca] = matShape(A);
  const [rb, cb] = matShape(B);
  if (ca !== rb)
    throw new Error(`matMul: incompatible shapes [${ra},${ca}] × [${rb},${cb}]`);
  const C = zeros2d(ra, cb);
  for (let i = 0; i < ra; i++)
    for (let k = 0; k < ca; k++)
      for (let j = 0; j < cb; j++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** Matrix-vector multiply: A (m×n) × v (n) → (m). */
export function matVecMul(A: Mat, v: Vec): Vec {
  const [ra, ca] = matShape(A);
  if (ca !== v.length)
    throw new Error(`matVecMul: A has ${ca} cols but v has length ${v.length}`);
  return A.map(row => row.reduce((s, aij, j) => s + aij * v[j], 0));
}

/** Transpose of A. */
export function matTranspose(A: Mat): Mat {
  const [r, c] = matShape(A);
  const T = zeros2d(c, r);
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      T[j][i] = A[i][j];
  return T;
}

/** Trace: sum of diagonal elements of a square matrix. */
export function matTrace(A: Mat): number {
  assertSquare(A, 'matTrace');
  return A.reduce((s, row, i) => s + row[i], 0);
}

/** Determinant via Gaussian elimination with partial pivoting. */
export function matDeterminant(A: Mat): number {
  assertSquare(A, 'matDeterminant');
  const n = A.length;
  const U = cloneMat(A);
  let sign = 1;

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(U[row][col]) > Math.abs(U[pivotRow][col])) pivotRow = row;

    if (Math.abs(U[pivotRow][col]) < 1e-12) return 0;

    if (pivotRow !== col) {
      [U[pivotRow], U[col]] = [U[col], U[pivotRow]];
      sign *= -1;
    }

    for (let row = col + 1; row < n; row++) {
      const f = U[row][col] / U[col][col];
      for (let k = col; k < n; k++) U[row][k] -= f * U[col][k];
    }
  }

  let det = sign;
  for (let i = 0; i < n; i++) det *= U[i][i];
  return det;
}

/**
 * Matrix inverse via Gauss-Jordan elimination.
 * Returns null if A is singular (or near-singular).
 */
export function matInverse(A: Mat): Mat | null {
  assertSquare(A, 'matInverse');
  const n = A.length;
  // Build augmented [A | I]
  const aug: Mat = A.map((row, i) => {
    const extra = new Array<number>(n).fill(0);
    extra[i] = 1;
    return [...row, ...extra];
  });

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivotRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) pivotRow = row;

    if (Math.abs(aug[pivotRow][col]) < 1e-12) return null;

    if (pivotRow !== col) [aug[pivotRow], aug[col]] = [aug[col], aug[pivotRow]];

    const pivot = aug[col][col];
    for (let k = 0; k < 2 * n; k++) aug[col][k] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let k = 0; k < 2 * n; k++) aug[row][k] -= f * aug[col][k];
    }
  }

  return aug.map(row => row.slice(n));
}

/**
 * Rank of a matrix via row reduction.
 * @param tol  Threshold for treating a pivot as zero. Default 1e-10.
 */
export function matRank(A: Mat, tol = 1e-10): number {
  const [r, c] = matShape(A);
  const U = cloneMat(A);
  let rank = 0;

  for (let col = 0; col < c && rank < r; col++) {
    // Find pivot in this column at or below `rank`
    let pivotRow = -1;
    for (let row = rank; row < r; row++) {
      if (Math.abs(U[row][col]) > tol) {
        pivotRow = row;
        break;
      }
    }
    if (pivotRow === -1) continue;

    [U[rank], U[pivotRow]] = [U[pivotRow], U[rank]];

    const pivot = U[rank][col];
    for (let k = col; k < c; k++) U[rank][k] /= pivot;

    for (let row = 0; row < r; row++) {
      if (row === rank) continue;
      const f = U[row][col];
      for (let k = col; k < c; k++) U[row][k] -= f * U[rank][k];
    }
    rank++;
  }
  return rank;
}

/**
 * Matrix norm.
 * 'frobenius': sqrt(sum of squares).
 * 'max': largest absolute element.
 * Default: 'frobenius'.
 */
export function matNorm(A: Mat, type: 'frobenius' | 'max' = 'frobenius'): number {
  let acc = 0;
  for (const row of A)
    for (const v of row)
      acc = type === 'max' ? Math.max(acc, Math.abs(v)) : acc + v * v;
  return type === 'max' ? acc : Math.sqrt(acc);
}

// ---------------------------------------------------------------------------
// Decompositions
// ---------------------------------------------------------------------------

/**
 * LU decomposition with partial pivoting.
 * Returns { L, U, P } such that P * A = L * U.
 * L is lower-triangular with unit diagonal; U is upper-triangular.
 */
export function luDecompose(A: Mat): { L: Mat; U: Mat; P: Mat } {
  assertSquare(A, 'luDecompose');
  const n = A.length;
  const U = cloneMat(A);
  const L = zeros2d(n, n);
  const P = identity(n);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivotRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(U[row][col]) > Math.abs(U[pivotRow][col])) pivotRow = row;

    if (pivotRow !== col) {
      [U[pivotRow], U[col]] = [U[col], U[pivotRow]];
      [P[pivotRow], P[col]] = [P[col], P[pivotRow]];
      for (let k = 0; k < col; k++)
        [L[pivotRow][k], L[col][k]] = [L[col][k], L[pivotRow][k]];
    }

    L[col][col] = 1;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(U[col][col]) < 1e-14) { L[row][col] = 0; continue; }
      const f = U[row][col] / U[col][col];
      L[row][col] = f;
      for (let k = col; k < n; k++) U[row][k] -= f * U[col][k];
    }
  }
  L[n - 1][n - 1] = 1;
  return { L, U, P };
}

/**
 * Cholesky decomposition.
 * Returns lower-triangular L such that A = L * L^T,
 * or null if A is not symmetric positive-definite.
 */
export function choleskyDecompose(A: Mat): Mat | null {
  assertSquare(A, 'choleskyDecompose');
  const n = A.length;
  const L = zeros2d(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum <= 0) return null; // not positive-definite
        L[i][j] = Math.sqrt(sum);
      } else {
        if (Math.abs(L[j][j]) < 1e-14) return null;
        L[i][j] = sum / L[j][j];
      }
    }
  }
  return L;
}

/**
 * QR decomposition via modified Gram-Schmidt.
 * Returns { Q, R } where Q has orthonormal columns and R is upper-triangular,
 * and A = Q * R.
 */
export function qrDecompose(A: Mat): { Q: Mat; R: Mat } {
  const [m, n] = matShape(A);
  const Q = zeros2d(m, n);
  const R = zeros2d(n, n);

  // Copy columns of A into working array
  const V: Vec[] = Array.from({ length: n }, (_, j) => A.map(row => row[j]));

  for (let j = 0; j < n; j++) {
    // Modified Gram-Schmidt: subtract projections onto already-computed Q cols
    let v = [...V[j]];
    for (let i = 0; i < j; i++) {
      const qi = Array.from({ length: m }, (_, r) => Q[r][i]);
      const rij = vecDot(qi, v);
      R[i][j] = rij;
      v = vecSub(v, vecScale(qi, rij));
    }
    const norm = vecNorm(v);
    R[j][j] = norm;
    const qj = norm < 1e-14 ? new Array<number>(m).fill(0) : v.map(x => x / norm);
    for (let r = 0; r < m; r++) Q[r][j] = qj[r];
  }

  return { Q, R };
}

/**
 * Power-iteration SVD (truncated to first min(m,n) singular values).
 *
 * Returns { U, S, Vt } where:
 *   - S is an array of singular values (descending)
 *   - U  is (m × k), columns are left singular vectors
 *   - Vt is (k × n), rows are right singular vectors
 *   - A ≈ U * diag(S) * Vt
 *
 * @param maxIter  Maximum power-iteration steps per singular value. Default 100.
 */
export function svdLite(
  A: Mat,
  maxIter = 100,
): { U: Mat; S: number[]; Vt: Mat } {
  const [m, n] = matShape(A);
  const k = Math.min(m, n);

  // We work with A^T*A (n×n) for right singular vectors,
  // then U_i = A * v_i / sigma_i for left singular vectors.
  const At = matTranspose(A);
  const AtA = matMul(At, A);

  // Deflate and find k singular values
  const deflated = cloneMat(AtA);
  const Vrows: Vec[] = []; // right singular vectors (will become rows of Vt)
  const singularValues: number[] = [];
  const Ucols: Vec[] = []; // left singular vectors

  for (let idx = 0; idx < k; idx++) {
    // Power iteration on deflated matrix to find dominant eigenvector
    let v: Vec = new Array<number>(n).fill(0).map((_, i) => (i === idx ? 1 : 0.1));
    v = vecNormalize(v);

    for (let iter = 0; iter < maxIter; iter++) {
      const w = matVecMul(deflated, v);
      const wNorm = vecNorm(w);
      if (wNorm < 1e-14) break;
      const vNext = w.map(x => x / wNorm);
      const diff = vecNorm(vecSub(vNext, v));
      v = vNext;
      if (diff < 1e-12) break;
    }

    // Eigenvalue of AtA = sigma^2
    const Av = matVecMul(deflated, v);
    const sigma2 = vecDot(v, Av);
    const sigma = Math.sqrt(Math.max(0, sigma2));

    // Left singular vector
    const u_unnorm = matVecMul(A, v);
    const uNorm = vecNorm(u_unnorm);
    const u = uNorm < 1e-14 ? new Array<number>(m).fill(0) : u_unnorm.map(x => x / uNorm);

    singularValues.push(sigma);
    Vrows.push(v);
    Ucols.push(u);

    // Deflate: remove rank-1 component  sigma * u * v^T from AtA representation
    // i.e. deflated -= sigma^2 * outer(v, v)
    const vv = vecOuter(v, v);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        deflated[i][j] -= sigma2 * vv[i][j];
  }

  // Build U (m × k): each column is a left singular vector
  const U = zeros2d(m, k);
  for (let col = 0; col < k; col++)
    for (let row = 0; row < m; row++)
      U[row][col] = Ucols[col][row];

  // Build Vt (k × n): each row is a right singular vector
  const Vt = zeros2d(k, n);
  for (let row = 0; row < k; row++)
    for (let col = 0; col < n; col++)
      Vt[row][col] = Vrows[row][col];

  return { U, S: singularValues, Vt };
}

// ---------------------------------------------------------------------------
// Solvers
// ---------------------------------------------------------------------------

/**
 * Solve the linear system A x = b via Gaussian elimination with partial
 * pivoting.  Returns null if A is singular (or near-singular).
 */
export function solveLinear(A: Mat, b: Vec): Vec | null {
  assertSquare(A, 'solveLinear');
  const n = A.length;
  if (b.length !== n)
    throw new Error(`solveLinear: b has length ${b.length}, expected ${n}`);

  const aug: Mat = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) pivotRow = row;

    if (Math.abs(aug[pivotRow][col]) < 1e-12) return null;

    if (pivotRow !== col) [aug[pivotRow], aug[col]] = [aug[col], aug[pivotRow]];

    const pivot = aug[col][col];
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) aug[row][k] -= f * aug[col][k];
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-12) return null;
    let s = aug[i][n];
    for (let j = i + 1; j < n; j++) s -= aug[i][j] * x[j];
    x[i] = s / aug[i][i];
  }
  return x;
}

/**
 * Least-squares solution to the over-determined system A x ≈ b
 * using the normal equations: x = (A^T A)^{-1} A^T b.
 */
export function leastSquares(A: Mat, b: Vec): Vec {
  const At = matTranspose(A);
  const AtA = matMul(At, A);
  const Atb = matVecMul(At, b);
  const x = solveLinear(AtA, Atb);
  if (x === null)
    throw new Error('leastSquares: A^T A is singular; no unique solution');
  return x;
}

/**
 * Power iteration for the dominant eigenvalue/eigenvector pair.
 * @param maxIter Maximum iterations. Default 1000.
 * @param tol     Convergence tolerance. Default 1e-10.
 */
export function powerIteration(
  A: Mat,
  maxIter = 1000,
  tol = 1e-10,
): { eigenvalue: number; eigenvector: Vec } {
  assertSquare(A, 'powerIteration');
  const n = A.length;
  // Start with a non-trivial vector
  let v: Vec = new Array<number>(n).fill(0).map((_, i) => (i === 0 ? 1 : 0.5));
  v = vecNormalize(v);

  let lambda = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    const w = matVecMul(A, v);
    const wNorm = vecNorm(w);
    if (wNorm < 1e-14) break;
    const vNext = w.map(x => x / wNorm);
    const lambdaNext = vecDot(vNext, matVecMul(A, vNext));
    if (Math.abs(lambdaNext - lambda) < tol && iter > 0) {
      lambda = lambdaNext;
      v = vNext;
      break;
    }
    lambda = lambdaNext;
    v = vNext;
  }

  return { eigenvalue: lambda, eigenvector: v };
}

// ---------------------------------------------------------------------------
// Orthogonalization
// ---------------------------------------------------------------------------

/**
 * Gram-Schmidt orthonormalization.
 * Returns an orthonormal basis; near-zero vectors (after projection) are dropped.
 */
export function gramSchmidt(vectors: Vec[]): Vec[] {
  const result: Vec[] = [];
  for (const v of vectors) {
    let u = [...v];
    for (const q of result) u = vecSub(u, vecScale(q, vecDot(q, u)));
    const n = vecNorm(u);
    if (n < 1e-10) continue; // drop nearly-dependent vector
    result.push(u.map(x => x / n));
  }
  return result;
}

/**
 * Return true if the given vectors are mutually orthogonal (pairwise dot ≈ 0).
 */
export function isOrthogonal(vectors: Vec[], tol = 1e-9): boolean {
  for (let i = 0; i < vectors.length; i++)
    for (let j = i + 1; j < vectors.length; j++)
      if (Math.abs(vecDot(vectors[i], vectors[j])) > tol) return false;
  return true;
}

/**
 * Return true if the given vectors are orthonormal
 * (mutually orthogonal AND each has unit norm).
 */
export function isOrthonormal(vectors: Vec[], tol = 1e-9): boolean {
  if (!isOrthogonal(vectors, tol)) return false;
  for (const v of vectors)
    if (Math.abs(vecNorm(v) - 1) > tol) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Special matrices
// ---------------------------------------------------------------------------

/** Hilbert matrix: H[i][j] = 1/(i+j+1), 0-indexed. */
export function hilbertMatrix(n: number): Mat {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => 1 / (i + j + 1)),
  );
}

/**
 * Vandermonde matrix: V[i][j] = x[i]^j.
 * @param x  Evaluation points.
 * @param n  Number of columns. Default x.length.
 */
export function vandermonde(x: number[], n = x.length): Mat {
  return x.map(xi => Array.from({ length: n }, (_, j) => Math.pow(xi, j)));
}

/**
 * Householder reflection matrix H = I - 2 v v^T / |v|^2.
 * Reflects across the hyperplane orthogonal to v.
 */
export function householderReflection(v: Vec): Mat {
  const n = v.length;
  const norm2 = vecDot(v, v);
  if (norm2 === 0) return identity(n);
  const outer = vecOuter(v, v);
  const I = identity(n);
  return I.map((row, i) => row.map((val, j) => val - (2 / norm2) * outer[i][j]));
}

// ---------------------------------------------------------------------------
// Statistics-adjacent
// ---------------------------------------------------------------------------

/**
 * Covariance matrix from an array of observation vectors.
 * data[i] is the i-th observation; returns (d×d) matrix where d is feature count.
 */
export function covarianceMatrix(data: Vec[]): Mat {
  if (data.length === 0) return [];
  const d = data[0].length;
  const mu = vecMean(data);
  const C = zeros2d(d, d);
  for (const obs of data) {
    const diff = vecSub(obs, mu);
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++)
        C[i][j] += diff[i] * diff[j];
  }
  return C.map(row => row.map(v => v / data.length));
}

/**
 * Pearson correlation matrix.
 * Diagonal entries are 1; off-diagonal entries are in [-1, 1].
 */
export function correlationMatrix(data: Vec[]): Mat {
  const C = covarianceMatrix(data);
  const d = C.length;
  const stdDevs = C.map((row, i) => Math.sqrt(row[i]));
  return C.map((row, i) =>
    row.map((v, j) => {
      const denom = stdDevs[i] * stdDevs[j];
      return denom < 1e-14 ? (i === j ? 1 : 0) : v / denom;
    }),
  );
}

/**
 * Principal Component Analysis.
 * Centers data, computes covariance, then uses power iteration to extract
 * top nComponents eigenvectors.
 *
 * Returns:
 *   - components: array of nComponents unit vectors (principal directions)
 *   - explainedVariance: variance explained by each component
 */
export function pca(
  data: Vec[],
  nComponents: number,
): { components: Vec[]; explainedVariance: number[] } {
  if (data.length === 0) return { components: [], explainedVariance: [] };
  const d = data[0].length;
  const mu = vecMean(data);
  const centered = data.map(obs => vecSub(obs, mu));
  const C = covarianceMatrix(centered);

  const components: Vec[] = [];
  const explainedVariance: number[] = [];
  const deflated = cloneMat(C);

  for (let idx = 0; idx < Math.min(nComponents, d); idx++) {
    // Power iteration on deflated covariance matrix
    let v: Vec = new Array<number>(d).fill(0).map((_, i) => (i === idx % d ? 1 : 0.01));
    v = vecNormalize(v);

    for (let iter = 0; iter < 1000; iter++) {
      const w = matVecMul(deflated, v);
      const wNorm = vecNorm(w);
      if (wNorm < 1e-14) break;
      const vNext = w.map(x => x / wNorm);
      const diff = vecNorm(vecSub(vNext, v));
      v = vNext;
      if (diff < 1e-10) break;
    }

    const eigenvalue = Math.max(0, vecDot(v, matVecMul(deflated, v)));
    components.push(v);
    explainedVariance.push(eigenvalue);

    // Deflate
    const outer = vecOuter(v, v);
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++)
        deflated[i][j] -= eigenvalue * outer[i][j];
  }

  return { components, explainedVariance };
}

// ---------------------------------------------------------------------------
// Sports applications
// ---------------------------------------------------------------------------

/**
 * Pairwise cosine-similarity matrix for a list of player feature vectors.
 * Result[i][j] = cosineSimilarity(players[i], players[j]).
 * Diagonal entries are 1; matrix is symmetric.
 */
export function playerSimilarityMatrix(players: Vec[]): Mat {
  const n = players.length;
  const M = zeros2d(n, n);
  for (let i = 0; i < n; i++) {
    M[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const s = cosineSimilarity(players[i], players[j]);
      M[i][j] = s;
      M[j][i] = s;
    }
  }
  return M;
}

/**
 * Element-wise multiply features by weights, clamp negatives to zero,
 * and return the L2-normalised result.
 * Returns zero vector if everything is non-positive.
 */
export function featureWeighting(features: Vec, weights: Vec): Vec {
  assertSameLength(features, weights, 'featureWeighting');
  const weighted = features.map((f, i) => Math.max(0, f * weights[i]));
  return vecNormalize(weighted);
}

/**
 * Score each player as dot(player, direction) and return indices sorted by
 * descending score (rank 0 = highest score).
 */
export function rankByProjection(players: Vec[], direction: Vec): number[] {
  const scores = players.map((p, i) => ({ i, score: vecDot(p, direction) }));
  scores.sort((a, b) => b.score - a.score);
  return scores.map(s => s.i);
}
