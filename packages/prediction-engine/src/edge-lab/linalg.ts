/**
 * Small dense linear algebra — Gauss-Jordan elimination with partial
 * pivoting. Pure, deterministic, no external dependencies. Scoped to the
 * sizes this codebase actually needs (inverting a handful of regression
 * coefficients' Fisher information matrix for standard errors), not a
 * general numerical-linear-algebra library.
 */

/**
 * Invert a square matrix via Gauss-Jordan elimination on the augmented
 * [A | I] system, with partial pivoting (largest-magnitude pivot in the
 * remaining column, swapped to the diagonal) for numerical stability.
 * Returns `null` — never a garbage result — when the matrix is singular or
 * numerically indistinguishable from singular (pivot magnitude below 1e-12
 * after scaling). Throws on a non-square input; that is a caller bug, not a
 * numerical condition to fail closed on.
 */
export function invertMatrix(matrix: ReadonlyArray<readonly number[]>): number[][] | null {
  const n = matrix.length;
  if (n === 0) {
    throw new RangeError("invertMatrix: matrix must be non-empty");
  }
  for (const row of matrix) {
    if (row.length !== n) {
      throw new RangeError(`invertMatrix: matrix must be square (got ${n} rows, a row with ${row.length} columns)`);
    }
  }

  // Augmented [A | I], worked entirely in a fresh copy.
  const aug: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotVal = Math.abs(aug[col]![col]!);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(aug[r]![col]!);
      if (v > pivotVal) {
        pivotVal = v;
        pivotRow = r;
      }
    }
    if (pivotVal < 1e-12) return null; // singular

    if (pivotRow !== col) {
      const tmp = aug[col]!;
      aug[col] = aug[pivotRow]!;
      aug[pivotRow] = tmp;
    }

    const pivot = aug[col]![col]!;
    for (let j = 0; j < 2 * n; j++) aug[col]![j] = aug[col]![j]! / pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r]![col]!;
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[r]![j] = aug[r]![j]! - factor * aug[col]![j]!;
    }
  }

  return aug.map((row) => row.slice(n));
}
