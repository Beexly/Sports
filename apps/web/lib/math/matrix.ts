/**
 * 2D matrix math utilities — pure, zero dependencies.
 *
 * Matrix creation, arithmetic, decomposition, and linear algebra
 * primitives for statistical modeling and data analysis.
 */

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

/** Returns a rows×cols matrix of all zeros. */
export function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0) as number[]);
}

/** Returns a rows×cols matrix of all ones. */
export function ones(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(1) as number[]);
}

/** Returns an n×n identity matrix. */
export function identity(n: number): number[][] {
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

/** Returns a square diagonal matrix whose diagonal entries are `values`. */
export function diagonal(values: readonly number[]): number[][] {
  const n = values.length;
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = values[i];
  return m;
}

// ---------------------------------------------------------------------------
// Shape queries
// ---------------------------------------------------------------------------

/** Returns [rows, cols] of matrix m. */
export function shape(m: number[][]): [number, number] {
  return [m.length, m.length > 0 ? m[0].length : 0];
}

/** Number of rows. */
export function rows(m: number[][]): number {
  return m.length;
}

/** Number of columns. */
export function cols(m: number[][]): number {
  return m.length > 0 ? m[0].length : 0;
}

// ---------------------------------------------------------------------------
// Element access
// ---------------------------------------------------------------------------

/** Returns element at row r, column c. */
export function get(m: number[][], r: number, c: number): number {
  return m[r][c];
}

/** Returns a new matrix with element (r, c) set to v. */
export function set(m: number[][], r: number, c: number, v: number): number[][] {
  const clone = cloneMatrix(m);
  clone[r][c] = v;
  return clone;
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/** Transpose of m. */
export function transpose(m: number[][]): number[][] {
  const [r, c] = shape(m);
  const t = zeros(c, r);
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      t[j][i] = m[i][j];
  return t;
}

/** Element-wise addition. Throws if shapes differ. */
export function add(a: number[][], b: number[][]): number[][] {
  const [ra, ca] = shape(a);
  const [rb, cb] = shape(b);
  if (ra !== rb || ca !== cb)
    throw new Error(`Shape mismatch: [${ra},${ca}] vs [${rb},${cb}]`);
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

/** Element-wise subtraction. Throws if shapes differ. */
export function subtract(a: number[][], b: number[][]): number[][] {
  const [ra, ca] = shape(a);
  const [rb, cb] = shape(b);
  if (ra !== rb || ca !== cb)
    throw new Error(`Shape mismatch: [${ra},${ca}] vs [${rb},${cb}]`);
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

/** Multiply every element of m by scalar k. */
export function scalarMultiply(m: number[][], k: number): number[][] {
  return m.map(row => row.map(v => v * k));
}

/** Matrix multiplication. Throws if a.cols !== b.rows. */
export function multiply(a: number[][], b: number[][]): number[][] {
  const [ra, ca] = shape(a);
  const [rb, cb] = shape(b);
  if (ca !== rb)
    throw new Error(`Shape mismatch for multiply: a.cols=${ca}, b.rows=${rb}`);
  const result = zeros(ra, cb);
  for (let i = 0; i < ra; i++)
    for (let k = 0; k < ca; k++)
      for (let j = 0; j < cb; j++)
        result[i][j] += a[i][k] * b[k][j];
  return result;
}

/** Dot product of two vectors. Throws if lengths differ. */
export function dotProduct(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length)
    throw new Error(`Length mismatch: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

/** Determinant via Gaussian elimination (partial pivot). Throws if not square. */
export function determinant(m: number[][]): number {
  const [r, c] = shape(m);
  if (r !== c) throw new Error(`determinant requires square matrix, got [${r},${c}]`);
  const n = r;
  // Work on a copy
  const A = m.map(row => [...row]);
  let det = 1;
  let sign = 1;

  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = -1;
    let pivotVal = 0;
    for (let row = col; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(pivotVal)) {
        pivotVal = A[row][col];
        pivotRow = row;
      }
    }
    if (pivotRow === -1 || pivotVal === 0) return 0;
    if (pivotRow !== col) {
      [A[pivotRow], A[col]] = [A[col], A[pivotRow]];
      sign *= -1;
    }
    det *= A[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = A[row][col] / A[col][col];
      for (let k = col; k < n; k++) {
        A[row][k] -= factor * A[col][k];
      }
    }
  }
  return sign * det;
}

/** Sum of diagonal elements. Throws if not square. */
export function trace(m: number[][]): number {
  const [r, c] = shape(m);
  if (r !== c) throw new Error(`trace requires square matrix, got [${r},${c}]`);
  let sum = 0;
  for (let i = 0; i < r; i++) sum += m[i][i];
  return sum;
}

/** Frobenius norm: sqrt of sum of squares of all elements. */
export function frobenius(m: number[][]): number {
  let sumSq = 0;
  for (const row of m) for (const v of row) sumSq += v * v;
  return Math.sqrt(sumSq);
}

// ---------------------------------------------------------------------------
// Row operations (return new matrix)
// ---------------------------------------------------------------------------

/** Swap rows i and j. Returns a new matrix. */
export function rowSwap(m: number[][], i: number, j: number): number[][] {
  const clone = cloneMatrix(m);
  [clone[i], clone[j]] = [clone[j], clone[i]];
  return clone;
}

/** Multiply row i by scalar k. Returns a new matrix. */
export function rowScale(m: number[][], i: number, k: number): number[][] {
  const clone = cloneMatrix(m);
  clone[i] = clone[i].map(v => v * k);
  return clone;
}

/** Add k * row j to row i. Returns a new matrix. */
export function rowAdd(m: number[][], i: number, j: number, k: number): number[][] {
  const clone = cloneMatrix(m);
  clone[i] = clone[i].map((v, col) => v + k * m[j][col]);
  return clone;
}

// ---------------------------------------------------------------------------
// Decomposition
// ---------------------------------------------------------------------------

/**
 * Partial-pivot LU decomposition.
 * Returns { L, U, P } where P*A = L*U, or null if singular.
 */
export function luDecompose(
  m: number[][]
): { L: number[][]; U: number[][]; P: number[][] } | null {
  const [r, c] = shape(m);
  if (r !== c) throw new Error(`LU decomposition requires square matrix, got [${r},${c}]`);
  const n = r;

  const U = m.map(row => [...row]);
  const L = zeros(n, n);
  const P = identity(n);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = col;
    let pivotVal = Math.abs(U[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(U[row][col]) > pivotVal) {
        pivotVal = Math.abs(U[row][col]);
        pivotRow = row;
      }
    }

    if (Math.abs(U[pivotRow][col]) < 1e-12) return null; // singular

    if (pivotRow !== col) {
      [U[pivotRow], U[col]] = [U[col], U[pivotRow]];
      [P[pivotRow], P[col]] = [P[col], P[pivotRow]];
      // swap already-computed L entries
      for (let k = 0; k < col; k++) {
        [L[pivotRow][k], L[col][k]] = [L[col][k], L[pivotRow][k]];
      }
    }

    L[col][col] = 1;
    for (let row = col + 1; row < n; row++) {
      const factor = U[row][col] / U[col][col];
      L[row][col] = factor;
      for (let k = col; k < n; k++) {
        U[row][k] -= factor * U[col][k];
      }
    }
  }
  L[n - 1][n - 1] = 1;

  return { L, U, P };
}

// ---------------------------------------------------------------------------
// Linear solver
// ---------------------------------------------------------------------------

/**
 * Solve Ax = b via Gaussian elimination with partial pivoting.
 * Returns null if no unique solution exists.
 */
export function solve(A: number[][], b: readonly number[]): number[] | null {
  const [r, c] = shape(A);
  if (r !== c) throw new Error(`solve requires square matrix, got [${r},${c}]`);
  const n = r;

  // Build augmented matrix [A | b]
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) {
        pivotRow = row;
      }
    }
    if (Math.abs(aug[pivotRow][col]) < 1e-12) return null; // singular
    if (pivotRow !== col) [aug[pivotRow], aug[col]] = [aug[col], aug[pivotRow]];

    const pivot = aug[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-12) return null;
    let s = aug[i][n];
    for (let j = i + 1; j < n; j++) s -= aug[i][j] * x[j];
    x[i] = s / aug[i][i];
  }
  return x;
}

// ---------------------------------------------------------------------------
// Vector operations
// ---------------------------------------------------------------------------

/** Euclidean norm of vector v. */
export function vectorNorm(v: readonly number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/** Unit vector. Returns zero vector if norm is 0. */
export function vectorNormalize(v: readonly number[]): number[] {
  const n = vectorNorm(v);
  if (n === 0) return Array(v.length).fill(0) as number[];
  return v.map(x => x / n);
}

/**
 * Cosine similarity between two vectors.
 * Returns 0 if either vector is a zero vector.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const na = vectorNorm(a);
  const nb = vectorNorm(b);
  if (na === 0 || nb === 0) return 0;
  return dotProduct(a, b) / (na * nb);
}

// ---------------------------------------------------------------------------
// Reshape / utility
// ---------------------------------------------------------------------------

/** Row-major flatten of a matrix. */
export function flatten(m: number[][]): number[] {
  return m.reduce<number[]>((acc, row) => acc.concat(row), []);
}

/** Reshape a flat array into a rows×cols matrix (row-major). Throws on size mismatch. */
export function reshape(arr: readonly number[], rows: number, cols: number): number[][] {
  if (arr.length !== rows * cols)
    throw new Error(`Cannot reshape length ${arr.length} into [${rows},${cols}]`);
  const m: number[][] = [];
  for (let i = 0; i < rows; i++) {
    m.push(arr.slice(i * cols, i * cols + cols) as number[]);
  }
  return m;
}

/** Deep clone a matrix. */
export function cloneMatrix(m: number[][]): number[][] {
  return m.map(row => [...row]);
}

/** Element-wise equality within tolerance eps (default 1e-9). */
export function matrixEqual(a: number[][], b: number[][], eps = 1e-9): boolean {
  const [ra, ca] = shape(a);
  const [rb, cb] = shape(b);
  if (ra !== rb || ca !== cb) return false;
  for (let i = 0; i < ra; i++)
    for (let j = 0; j < ca; j++)
      if (Math.abs(a[i][j] - b[i][j]) > eps) return false;
  return true;
}
