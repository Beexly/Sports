import { describe, it, expect } from 'vitest';
import {
  vecAdd,
  vecSub,
  vecScale,
  vecDot,
  vecCross,
  vecNorm,
  vecNormalize,
  vecAngle,
  vecProject,
  vecReject,
  vecOuter,
  vecMean,
  vecVariance,
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  chebyshevDistance,
  minkowskiDistance,
  matAdd,
  matSub,
  matScale,
  matMul,
  matVecMul,
  matTranspose,
  matTrace,
  matDeterminant,
  matInverse,
  matRank,
  matNorm,
  luDecompose,
  choleskyDecompose,
  qrDecompose,
  svdLite,
  solveLinear,
  leastSquares,
  powerIteration,
  gramSchmidt,
  isOrthogonal,
  isOrthonormal,
  hilbertMatrix,
  vandermonde,
  householderReflection,
  covarianceMatrix,
  correlationMatrix,
  pca,
  playerSimilarityMatrix,
  featureWeighting,
  rankByProjection,
} from '../lib/math/linear-algebra';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NEAR = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

function approxEqVec(a: number[], b: number[], eps = 1e-7): boolean {
  return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) <= eps);
}

function approxEqMat(A: number[][], B: number[][], eps = 1e-7): boolean {
  return (
    A.length === B.length &&
    A.every((row, i) => row.every((v, j) => Math.abs(v - B[i]![j]!) <= eps))
  );
}

function identityMat(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)),
  );
}

function matMulHelper(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0]!.length, p = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (__, j) =>
      Array.from({ length: p }, (___, k) => A[i]![k]! * B[k]![j]!).reduce((s, v) => s + v, 0),
    ),
  );
}

// ---------------------------------------------------------------------------
// vecAdd
// ---------------------------------------------------------------------------

describe('vecAdd', () => {
  it('adds two vectors element-wise', () => {
    expect(vecAdd([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });
  it('works with negatives', () => {
    expect(vecAdd([-1, -2], [1, 2])).toEqual([0, 0]);
  });
  it('throws on length mismatch', () => {
    expect(() => vecAdd([1, 2], [1, 2, 3])).toThrow();
  });
  it('handles zero vectors', () => {
    expect(vecAdd([0, 0], [0, 0])).toEqual([0, 0]);
  });
});

// ---------------------------------------------------------------------------
// vecSub
// ---------------------------------------------------------------------------

describe('vecSub', () => {
  it('subtracts element-wise', () => {
    expect(vecSub([5, 7, 9], [4, 5, 6])).toEqual([1, 2, 3]);
  });
  it('throws on length mismatch', () => {
    expect(() => vecSub([1], [1, 2])).toThrow();
  });
  it('self-subtraction gives zero', () => {
    expect(vecSub([3, 4], [3, 4])).toEqual([0, 0]);
  });
});

// ---------------------------------------------------------------------------
// vecScale
// ---------------------------------------------------------------------------

describe('vecScale', () => {
  it('scales by a positive scalar', () => {
    expect(vecScale([1, 2, 3], 2)).toEqual([2, 4, 6]);
  });
  it('scales by zero', () => {
    expect(vecScale([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });
  it('scales by negative', () => {
    expect(vecScale([1, -1], -1)).toEqual([-1, 1]);
  });
});

// ---------------------------------------------------------------------------
// vecDot
// ---------------------------------------------------------------------------

describe('vecDot', () => {
  it('computes dot product', () => {
    expect(vecDot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it('orthogonal vectors give 0', () => {
    expect(vecDot([1, 0], [0, 1])).toBe(0);
  });
  it('throws on length mismatch', () => {
    expect(() => vecDot([1, 2], [1])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// vecCross
// ---------------------------------------------------------------------------

describe('vecCross', () => {
  it('[1,0,0] × [0,1,0] = [0,0,1]', () => {
    expect(vecCross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it('[0,1,0] × [0,0,1] = [1,0,0]', () => {
    expect(vecCross([0, 1, 0], [0, 0, 1])).toEqual([1, 0, 0]);
  });
  it('[0,0,1] × [1,0,0] = [0,1,0]', () => {
    expect(vecCross([0, 0, 1], [1, 0, 0])).toEqual([0, 1, 0]);
  });
  it('v × v = [0,0,0]', () => {
    expect(vecCross([3, 4, 5], [3, 4, 5])).toEqual([0, 0, 0]);
  });
  it('anti-commutative: a×b = -(b×a)', () => {
    const a = [1, 2, 3], b = [4, 5, 6];
    const ab = vecCross(a, b);
    const ba = vecCross(b, a);
    expect(approxEqVec(ab, ba.map(x => -x))).toBe(true);
  });
  it('throws for non-3D vectors', () => {
    expect(() => vecCross([1, 2], [3, 4])).toThrow();
    expect(() => vecCross([1, 2, 3, 4], [1, 2, 3, 4])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// vecNorm
// ---------------------------------------------------------------------------

describe('vecNorm', () => {
  it('L2 norm: [3,4] → 5', () => {
    expect(NEAR(vecNorm([3, 4]), 5)).toBe(true);
  });
  it('L1 norm: [3,4] → 7', () => {
    expect(NEAR(vecNorm([3, 4], 1), 7)).toBe(true);
  });
  it('L∞ norm (Infinity): [3,4] → 4', () => {
    expect(NEAR(vecNorm([3, 4], Infinity), 4)).toBe(true);
  });
  it('L2 norm of zero vector is 0', () => {
    expect(vecNorm([0, 0, 0])).toBe(0);
  });
  it('L3 norm example', () => {
    const v = [1, 1, 1];
    expect(NEAR(vecNorm(v, 3), Math.cbrt(3), 1e-7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// vecNormalize
// ---------------------------------------------------------------------------

describe('vecNormalize', () => {
  it('returns unit vector', () => {
    const u = vecNormalize([3, 4]);
    expect(NEAR(vecNorm(u), 1)).toBe(true);
  });
  it('[1,0,0] unchanged', () => {
    expect(approxEqVec(vecNormalize([1, 0, 0]), [1, 0, 0])).toBe(true);
  });
  it('all-zero → all-zero (no throw)', () => {
    expect(vecNormalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
  it('negative vector still unit length', () => {
    const u = vecNormalize([-3, -4]);
    expect(NEAR(vecNorm(u), 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// vecAngle
// ---------------------------------------------------------------------------

describe('vecAngle', () => {
  it('parallel vectors → 0', () => {
    expect(NEAR(vecAngle([1, 0], [2, 0]), 0)).toBe(true);
  });
  it('orthogonal vectors → π/2', () => {
    expect(NEAR(vecAngle([1, 0], [0, 1]), Math.PI / 2)).toBe(true);
  });
  it('opposite vectors → π', () => {
    expect(NEAR(vecAngle([1, 0], [-1, 0]), Math.PI)).toBe(true);
  });
  it('45° angle', () => {
    expect(NEAR(vecAngle([1, 0], [1, 1]), Math.PI / 4, 1e-7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// vecProject / vecReject
// ---------------------------------------------------------------------------

describe('vecProject', () => {
  it('project onto itself returns itself', () => {
    const v = [3, 4, 5];
    expect(approxEqVec(vecProject(v, v), v)).toBe(true);
  });
  it('project onto orthogonal → zero', () => {
    expect(approxEqVec(vecProject([1, 0, 0], [0, 1, 0]), [0, 0, 0])).toBe(true);
  });
  it('[1,1] project onto [1,0] → [1,0]', () => {
    expect(approxEqVec(vecProject([1, 1], [1, 0]), [1, 0])).toBe(true);
  });
  it('projection onto zero vector → zero', () => {
    expect(vecProject([1, 2], [0, 0])).toEqual([0, 0]);
  });
});

describe('vecReject', () => {
  it('reject of x onto x is zero', () => {
    expect(approxEqVec(vecReject([3, 4], [3, 4]), [0, 0])).toBe(true);
  });
  it('project + reject = original', () => {
    const a = [1, 2, 3], b = [4, 5, 6];
    const proj = vecProject(a, b);
    const rej = vecReject(a, b);
    expect(approxEqVec(proj.map((v, i) => v + rej[i]!), a)).toBe(true);
  });
  it('rejection is perpendicular to b', () => {
    const a = [1, 2], b = [1, 0];
    const rej = vecReject(a, b);
    expect(NEAR(vecDot(rej, b), 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// vecOuter
// ---------------------------------------------------------------------------

describe('vecOuter', () => {
  it('2-vec outer 3-vec → 2×3 matrix', () => {
    const a = [1, 2], b = [3, 4, 5];
    const O = vecOuter(a, b);
    expect(O).toHaveLength(2);
    expect(O[0]).toHaveLength(3);
    expect(O[0]).toEqual([3, 4, 5]);
    expect(O[1]).toEqual([6, 8, 10]);
  });
  it('outer of unit vectors gives projection matrix', () => {
    const e = [1, 0, 0];
    const O = vecOuter(e, e);
    expect(O[0]![0]).toBe(1);
    expect(O[0]![1]).toBe(0);
    expect(O[1]![1]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// vecMean / vecVariance
// ---------------------------------------------------------------------------

describe('vecMean', () => {
  it('mean of identical vectors is that vector', () => {
    const vs = [[1, 2], [1, 2], [1, 2]];
    expect(approxEqVec(vecMean(vs), [1, 2])).toBe(true);
  });
  it('mean of symmetric vectors', () => {
    expect(approxEqVec(vecMean([[1, 0], [-1, 0]]), [0, 0])).toBe(true);
  });
  it('empty → empty', () => {
    expect(vecMean([])).toEqual([]);
  });
});

describe('vecVariance', () => {
  it('identical vectors → zero variance', () => {
    const vs = [[1, 2], [1, 2]];
    expect(approxEqVec(vecVariance(vs), [0, 0])).toBe(true);
  });
  it('[0] and [2] → variance 1', () => {
    const vs = [[0], [2]];
    expect(NEAR(vecVariance(vs)[0]!, 1)).toBe(true);
  });
  it('empty → empty', () => {
    expect(vecVariance([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Distance functions
// ---------------------------------------------------------------------------

describe('cosineSimilarity', () => {
  it('identical vectors → 1', () => {
    expect(NEAR(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1)).toBe(true);
  });
  it('opposite vectors → -1', () => {
    expect(NEAR(cosineSimilarity([1, 0], [-1, 0]), -1)).toBe(true);
  });
  it('orthogonal vectors → 0', () => {
    expect(NEAR(cosineSimilarity([1, 0], [0, 1]), 0)).toBe(true);
  });
  it('zero vector → 0', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

describe('euclideanDistance', () => {
  it('[0,0] to [3,4] = 5', () => {
    expect(NEAR(euclideanDistance([0, 0], [3, 4]), 5)).toBe(true);
  });
  it('self-distance = 0', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe('manhattanDistance', () => {
  it('[0,0] to [3,4] = 7', () => {
    expect(NEAR(manhattanDistance([0, 0], [3, 4]), 7)).toBe(true);
  });
  it('self-distance = 0', () => {
    expect(manhattanDistance([5, 6], [5, 6])).toBe(0);
  });
});

describe('chebyshevDistance', () => {
  it('[0,0] to [3,4] = 4', () => {
    expect(NEAR(chebyshevDistance([0, 0], [3, 4]), 4)).toBe(true);
  });
  it('[1,5] to [4,2] = 3', () => {
    expect(NEAR(chebyshevDistance([1, 5], [4, 2]), 3)).toBe(true);
  });
});

describe('minkowskiDistance', () => {
  it('p=2 matches euclidean', () => {
    expect(NEAR(minkowskiDistance([0, 0], [3, 4], 2), 5)).toBe(true);
  });
  it('p=1 matches manhattan', () => {
    expect(NEAR(minkowskiDistance([0, 0], [3, 4], 1), 7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matAdd / matSub / matScale
// ---------------------------------------------------------------------------

describe('matAdd', () => {
  it('2×2 addition', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(matAdd(A, B)).toEqual([[6, 8], [10, 12]]);
  });
  it('throws on shape mismatch', () => {
    expect(() => matAdd([[1, 2]], [[1, 2], [3, 4]])).toThrow();
  });
});

describe('matSub', () => {
  it('2×2 subtraction', () => {
    const A = [[5, 6], [7, 8]];
    const B = [[1, 2], [3, 4]];
    expect(matSub(A, B)).toEqual([[4, 4], [4, 4]]);
  });
});

describe('matScale', () => {
  it('scalar multiplication', () => {
    expect(matScale([[1, 2], [3, 4]], 3)).toEqual([[3, 6], [9, 12]]);
  });
  it('scale by zero', () => {
    expect(matScale([[1, 2], [3, 4]], 0)).toEqual([[0, 0], [0, 0]]);
  });
});

// ---------------------------------------------------------------------------
// matMul
// ---------------------------------------------------------------------------

describe('matMul', () => {
  it('2×2 × 2×2', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    const C = matMul(A, B);
    expect(C[0]![0]).toBe(19); // 1*5+2*7
    expect(C[0]![1]).toBe(22); // 1*6+2*8
    expect(C[1]![0]).toBe(43); // 3*5+4*7
    expect(C[1]![1]).toBe(50); // 3*6+4*8
  });
  it('A × I = A', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    expect(approxEqMat(matMul(A, I3), A)).toBe(true);
  });
  it('throws on shape mismatch', () => {
    expect(() => matMul([[1, 2]], [[1, 2]])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// matVecMul
// ---------------------------------------------------------------------------

describe('matVecMul', () => {
  it('2×2 matrix times vector', () => {
    const A = [[1, 2], [3, 4]];
    const v = [5, 6];
    const result = matVecMul(A, v);
    expect(result[0]).toBe(17); // 1*5+2*6
    expect(result[1]).toBe(39); // 3*5+4*6
  });
  it('throws on dimension mismatch', () => {
    expect(() => matVecMul([[1, 2]], [1, 2, 3])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// matTranspose
// ---------------------------------------------------------------------------

describe('matTranspose', () => {
  it('rows become cols', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const T = matTranspose(A);
    expect(T).toHaveLength(3);
    expect(T[0]).toHaveLength(2);
    expect(T[0]).toEqual([1, 4]);
    expect(T[1]).toEqual([2, 5]);
    expect(T[2]).toEqual([3, 6]);
  });
  it('transpose of transpose = original', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    expect(approxEqMat(matTranspose(matTranspose(A)), A)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matTrace
// ---------------------------------------------------------------------------

describe('matTrace', () => {
  it('2×2 trace = a+d', () => {
    expect(matTrace([[1, 2], [3, 4]])).toBe(5);
  });
  it('3×3 trace = 1+5+9', () => {
    expect(matTrace([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toBe(15);
  });
  it('throws if not square', () => {
    expect(() => matTrace([[1, 2, 3], [4, 5, 6]])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// matDeterminant
// ---------------------------------------------------------------------------

describe('matDeterminant', () => {
  it('2×2: ad - bc', () => {
    expect(NEAR(matDeterminant([[2, 3], [1, 4]]), 5)).toBe(true);
  });
  it('singular 2×2 → 0', () => {
    expect(NEAR(matDeterminant([[1, 2], [2, 4]]), 0)).toBe(true);
  });
  it('3×3 known value', () => {
    // [[1,2,3],[4,5,6],[7,8,9]] is singular
    expect(NEAR(matDeterminant([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), 0)).toBe(true);
  });
  it('3×3 non-singular', () => {
    // det([[2,1,0],[1,3,1],[0,1,2]]) = 2*(6-1)-1*(2-0)+0 = 10-2=8
    expect(NEAR(matDeterminant([[2, 1, 0], [1, 3, 1], [0, 1, 2]]), 8)).toBe(true);
  });
  it('identity det = 1', () => {
    expect(NEAR(matDeterminant([[1, 0, 0], [0, 1, 0], [0, 0, 1]]), 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matInverse
// ---------------------------------------------------------------------------

describe('matInverse', () => {
  it('A * inv(A) ≈ I', () => {
    const A = [[2, 1], [5, 3]];
    const inv = matInverse(A)!;
    const prod = matMulHelper(A, inv);
    expect(approxEqMat(prod, [[1, 0], [0, 1]])).toBe(true);
  });
  it('inv(I) = I', () => {
    const I = [[1, 0], [0, 1]];
    expect(approxEqMat(matInverse(I)!, I)).toBe(true);
  });
  it('singular matrix → null', () => {
    expect(matInverse([[1, 2], [2, 4]])).toBeNull();
  });
  it('3×3 inverse × original ≈ I', () => {
    const A = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
    const inv = matInverse(A)!;
    expect(inv).not.toBeNull();
    const prod = matMulHelper(A, inv);
    const I = identityMat(3);
    expect(approxEqMat(prod, I)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matRank
// ---------------------------------------------------------------------------

describe('matRank', () => {
  it('2×2 full rank = 2', () => {
    expect(matRank([[1, 0], [0, 1]])).toBe(2);
  });
  it('2×2 rank-1', () => {
    expect(matRank([[1, 2], [2, 4]])).toBe(1);
  });
  it('zero matrix → rank 0', () => {
    expect(matRank([[0, 0], [0, 0]])).toBe(0);
  });
  it('3×3 full rank', () => {
    expect(matRank([[1, 2, 3], [0, 1, 4], [5, 6, 0]])).toBe(3);
  });
  it('3×3 rank-deficient', () => {
    expect(matRank([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// matNorm
// ---------------------------------------------------------------------------

describe('matNorm', () => {
  it('frobenius norm: [[1,0],[0,1]] = sqrt(2)', () => {
    expect(NEAR(matNorm([[1, 0], [0, 1]]), Math.sqrt(2))).toBe(true);
  });
  it('max norm: largest abs element', () => {
    expect(matNorm([[3, -5], [1, 2]], 'max')).toBe(5);
  });
  it('frobenius of [[3,4]] = 5', () => {
    expect(NEAR(matNorm([[3, 4]]), 5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// luDecompose
// ---------------------------------------------------------------------------

describe('luDecompose', () => {
  it('P*A = L*U reconstruction', () => {
    const A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
    const { L, U, P } = luDecompose(A);
    const PA = matMulHelper(P, A);
    const LU = matMulHelper(L, U);
    expect(approxEqMat(PA, LU)).toBe(true);
  });
  it('L has unit diagonal', () => {
    const { L } = luDecompose([[1, 2], [3, 4]]);
    expect(NEAR(L[0]![0]!, 1)).toBe(true);
    expect(NEAR(L[1]![1]!, 1)).toBe(true);
  });
  it('L is lower triangular', () => {
    const { L } = luDecompose([[1, 2], [3, 4]]);
    expect(NEAR(L[0]![1]!, 0)).toBe(true);
  });
  it('U is upper triangular', () => {
    const { U } = luDecompose([[1, 2], [3, 4]]);
    expect(NEAR(U[1]![0]!, 0)).toBe(true);
  });
  it('3×3 reconstruction', () => {
    const A = [[2, 0, 2], [6, 1, 8], [4, 0, 6]];
    const { L, U, P } = luDecompose(A);
    const LU = matMulHelper(L, U);
    const PA = matMulHelper(P, A);
    expect(approxEqMat(LU, PA)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// choleskyDecompose
// ---------------------------------------------------------------------------

describe('choleskyDecompose', () => {
  it('A = L * L^T reconstruction', () => {
    const A = [[4, 2], [2, 3]];
    const L = choleskyDecompose(A)!;
    expect(L).not.toBeNull();
    const Lt = matTranspose(L);
    const LLt = matMulHelper(L, Lt);
    expect(approxEqMat(LLt, A)).toBe(true);
  });
  it('3×3 SPD matrix', () => {
    const A = [[4, 2, 2], [2, 5, 3], [2, 3, 6]];
    const L = choleskyDecompose(A)!;
    expect(L).not.toBeNull();
    const LLt = matMulHelper(L, matTranspose(L));
    expect(approxEqMat(LLt, A)).toBe(true);
  });
  it('non-positive-definite → null', () => {
    // Indefinite matrix
    expect(choleskyDecompose([[1, 0], [0, -1]])).toBeNull();
  });
  it('L is lower triangular', () => {
    const L = choleskyDecompose([[4, 2], [2, 3]])!;
    expect(NEAR(L[0]![1]!, 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// qrDecompose
// ---------------------------------------------------------------------------

describe('qrDecompose', () => {
  it('Q has orthonormal columns', () => {
    const A = [[1, 1], [1, 0], [0, 1]];
    const { Q } = qrDecompose(A);
    // Q^T * Q should be identity
    const QtQ = matMulHelper(matTranspose(Q), Q);
    expect(approxEqMat(QtQ, identityMat(2), 1e-6)).toBe(true);
  });
  it('A = Q * R reconstruction', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    const { Q, R } = qrDecompose(A);
    const QR = matMulHelper(Q, R);
    expect(approxEqMat(QR, A, 1e-6)).toBe(true);
  });
  it('R is upper triangular', () => {
    const { R } = qrDecompose([[1, 2], [3, 4]]);
    expect(NEAR(R[1]![0]!, 0, 1e-10)).toBe(true);
  });
  it('square 2×2 QR', () => {
    const A = [[1, 2], [3, 4]];
    const { Q, R } = qrDecompose(A);
    const QR = matMulHelper(Q, R);
    expect(approxEqMat(QR, A, 1e-6)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// svdLite
// ---------------------------------------------------------------------------

describe('svdLite', () => {
  it('singular values are positive', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    const { S } = svdLite(A);
    for (const s of S) expect(s).toBeGreaterThan(0);
  });
  it('singular values are descending', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    const { S } = svdLite(A);
    for (let i = 0; i < S.length - 1; i++) expect(S[i]).toBeGreaterThanOrEqual(S[i + 1]!);
  });
  it('A ≈ U * diag(S) * Vt reconstruction', () => {
    const A = [[3, 2, 2], [2, 3, -2]];
    const { U, S, Vt } = svdLite(A, 200);
    const k = S.length;
    // Build diag(S) as k×k
    const diagS = Array.from({ length: k }, (_, i) =>
      Array.from({ length: k }, (__, j) => (i === j ? S[i]! : 0)),
    );
    const USigma = matMulHelper(U, diagS);
    const approx = matMulHelper(USigma, Vt);
    expect(approxEqMat(approx, A, 0.5)).toBe(true);
  });
  it('U has unit-norm columns', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    const { U } = svdLite(A);
    const [m, k] = [U.length, U[0]!.length];
    for (let j = 0; j < k; j++) {
      const col = Array.from({ length: m }, (_, i) => U[i]![j]!);
      expect(NEAR(col.reduce((s, x) => s + x * x, 0), 1, 1e-6)).toBe(true);
    }
  });
  it('number of singular values = min(m,n)', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const { S } = svdLite(A);
    expect(S).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// solveLinear
// ---------------------------------------------------------------------------

describe('solveLinear', () => {
  it('2×2 system', () => {
    const A = [[2, 1], [5, 3]];
    const b = [1, 2];
    const x = solveLinear(A, b)!;
    expect(x).not.toBeNull();
    // Check A*x ≈ b
    const Ax = [A[0]![0]! * x[0]! + A[0]![1]! * x[1]!, A[1]![0]! * x[0]! + A[1]![1]! * x[1]!];
    expect(NEAR(Ax[0]!, b[0]!)).toBe(true);
    expect(NEAR(Ax[1]!, b[1]!)).toBe(true);
  });
  it('3×3 system Ax ≈ b', () => {
    const A = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
    const b = [1, 0, 1];
    const x = solveLinear(A, b)!;
    expect(x).not.toBeNull();
    for (let i = 0; i < 3; i++) {
      const s = A[i]!.reduce((acc, v, j) => acc + v * x[j]!, 0);
      expect(NEAR(s, b[i]!, 1e-7)).toBe(true);
    }
  });
  it('singular system → null', () => {
    expect(solveLinear([[1, 2], [2, 4]], [1, 2])).toBeNull();
  });
  it('identity system → b itself', () => {
    const x = solveLinear([[1, 0], [0, 1]], [3, 7])!;
    expect(NEAR(x[0]!, 3)).toBe(true);
    expect(NEAR(x[1]!, 7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// leastSquares
// ---------------------------------------------------------------------------

describe('leastSquares', () => {
  it('exactly determined system gives same solution as solveLinear', () => {
    const A = [[2, 1], [5, 3]];
    const b = [1, 2];
    const x1 = solveLinear(A, b)!;
    const x2 = leastSquares(A, b);
    expect(approxEqVec(x1, x2, 1e-7)).toBe(true);
  });
  it('overdetermined system minimises residual', () => {
    // y ≈ a*x + b: 3 points, fit line
    const A = [[1, 1], [2, 1], [3, 1]];
    const b = [2, 4, 5]; // roughly y = 1.5x + 0.5
    const x = leastSquares(A, b);
    // Should return valid coefficient vector
    expect(x).toHaveLength(2);
    // Residual check: ||Ax - b||^2 should be small for a linear fit
    const res = A.map((row, i) => row[0]! * x[0]! + row[1]! * x[1]! - b[i]!);
    const resNorm2 = res.reduce((s, r) => s + r * r, 0);
    expect(resNorm2).toBeLessThan(1); // rough sanity
  });
});

// ---------------------------------------------------------------------------
// gramSchmidt
// ---------------------------------------------------------------------------

describe('gramSchmidt', () => {
  it('output is orthonormal', () => {
    const vs = [[1, 1, 0], [1, 0, 1], [0, 1, 1]];
    const basis = gramSchmidt(vs);
    expect(isOrthonormal(basis, 1e-7)).toBe(true);
  });
  it('linearly dependent vectors: fewer output vectors', () => {
    const basis = gramSchmidt([[1, 0], [2, 0], [0, 1]]);
    expect(basis).toHaveLength(2);
  });
  it('single vector: normalised', () => {
    const basis = gramSchmidt([[3, 4]]);
    expect(basis).toHaveLength(1);
    expect(NEAR(vecNorm(basis[0]!), 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isOrthogonal / isOrthonormal
// ---------------------------------------------------------------------------

describe('isOrthogonal', () => {
  it('standard basis vectors are orthogonal', () => {
    expect(isOrthogonal([[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBe(true);
  });
  it('non-orthogonal fails', () => {
    expect(isOrthogonal([[1, 1], [0, 1]])).toBe(false);
  });
  it('single vector is trivially orthogonal', () => {
    expect(isOrthogonal([[1, 2, 3]])).toBe(true);
  });
});

describe('isOrthonormal', () => {
  it('standard basis is orthonormal', () => {
    expect(isOrthonormal([[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBe(true);
  });
  it('orthogonal but not unit length → false', () => {
    expect(isOrthonormal([[1, 0], [0, 2]])).toBe(false);
  });
  it('unit vectors that are not orthogonal → false', () => {
    expect(isOrthonormal([[1, 0], [Math.SQRT1_2, Math.SQRT1_2]])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// powerIteration
// ---------------------------------------------------------------------------

describe('powerIteration', () => {
  it('dominant eigenvalue of diagonal matrix is the largest diagonal', () => {
    const A = [[3, 0], [0, 1]];
    const { eigenvalue } = powerIteration(A);
    expect(NEAR(eigenvalue, 3, 1e-6)).toBe(true);
  });
  it('eigenvector satisfies A*v ≈ lambda*v', () => {
    const A = [[4, 1], [2, 3]];
    const { eigenvalue, eigenvector } = powerIteration(A);
    const Av = matVecMul(A, eigenvector);
    const lv = vecScale(eigenvector, eigenvalue);
    expect(approxEqVec(Av, lv, 1e-5)).toBe(true);
  });
  it('symmetric 3×3: eigenvalue matches expected', () => {
    const A = [[2, 1, 0], [1, 2, 1], [0, 1, 2]];
    const { eigenvalue } = powerIteration(A);
    // Dominant eigenvalue is 2 + sqrt(2) ≈ 3.414
    expect(NEAR(eigenvalue, 2 + Math.sqrt(2), 1e-4)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hilbertMatrix / vandermonde / householderReflection
// ---------------------------------------------------------------------------

describe('hilbertMatrix', () => {
  it('H[i][j] = 1/(i+j+1)', () => {
    const H = hilbertMatrix(3);
    expect(NEAR(H[0]![0]!, 1)).toBe(true);
    expect(NEAR(H[0]![1]!, 1 / 2)).toBe(true);
    expect(NEAR(H[1]![0]!, 1 / 2)).toBe(true);
    expect(NEAR(H[2]![2]!, 1 / 5)).toBe(true);
  });
  it('symmetric', () => {
    const H = hilbertMatrix(4);
    expect(approxEqMat(H, matTranspose(H))).toBe(true);
  });
});

describe('vandermonde', () => {
  it('V[i][j] = x[i]^j', () => {
    const V = vandermonde([1, 2, 3]);
    expect(V[0]).toEqual([1, 1, 1]);
    expect(V[1]).toEqual([1, 2, 4]);
    expect(V[2]).toEqual([1, 3, 9]);
  });
  it('custom n cols', () => {
    const V = vandermonde([2, 3], 4);
    expect(V[0]).toHaveLength(4);
    expect(NEAR(V[1]![3]!, 27)).toBe(true); // 3^3
  });
});

describe('householderReflection', () => {
  it('H is symmetric', () => {
    const v = [1, 2, 3];
    const H = householderReflection(v);
    expect(approxEqMat(H, matTranspose(H))).toBe(true);
  });
  it('H is orthogonal: H*H = I', () => {
    const v = [1, 0, 0];
    const H = householderReflection(v);
    const HH = matMulHelper(H, H);
    expect(approxEqMat(HH, identityMat(3), 1e-10)).toBe(true);
  });
  it('reflects v to -v (for unit v)', () => {
    const v = [1, 0, 0];
    const H = householderReflection(v);
    const Hv = matVecMul(H, v);
    expect(approxEqVec(Hv, [-1, 0, 0])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// covarianceMatrix / correlationMatrix
// ---------------------------------------------------------------------------

describe('covarianceMatrix', () => {
  it('diagonal is variance of each feature', () => {
    const data = [[1, 2], [3, 4], [5, 6]];
    // Feature 0: mean=3, vals=[1,3,5], pop var = (4+0+4)/3 = 8/3
    // Feature 1: mean=4, vals=[2,4,6], pop var = (4+0+4)/3 = 8/3
    const C = covarianceMatrix(data);
    expect(NEAR(C[0]![0]!, 8 / 3, 1e-9)).toBe(true);
    expect(NEAR(C[1]![1]!, 8 / 3, 1e-9)).toBe(true);
  });
  it('symmetric', () => {
    const data = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
    const C = covarianceMatrix(data);
    expect(approxEqMat(C, matTranspose(C))).toBe(true);
  });
  it('single observation → zero variance', () => {
    const C = covarianceMatrix([[1, 2, 3]]);
    expect(C[0]![0]).toBe(0);
  });
});

describe('correlationMatrix', () => {
  it('diagonal entries = 1', () => {
    const data = [[1, 2], [3, 4], [5, 6]];
    const R = correlationMatrix(data);
    expect(NEAR(R[0]![0]!, 1)).toBe(true);
    expect(NEAR(R[1]![1]!, 1)).toBe(true);
  });
  it('off-diagonal bounded by [-1,1]', () => {
    const data = [[1, 3], [2, 2], [3, 1]];
    const R = correlationMatrix(data);
    expect(R[0]![1]).toBeGreaterThanOrEqual(-1 - 1e-9);
    expect(R[0]![1]).toBeLessThanOrEqual(1 + 1e-9);
  });
  it('perfectly anti-correlated features → -1', () => {
    const data = [[1, 3], [2, 2], [3, 1]];
    const R = correlationMatrix(data);
    expect(NEAR(R[0]![1]!, -1, 1e-9)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pca
// ---------------------------------------------------------------------------

describe('pca', () => {
  it('returns nComponents components', () => {
    const data = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [2, 5, 8]];
    const { components } = pca(data, 2);
    expect(components).toHaveLength(2);
  });
  it('components are unit vectors', () => {
    const data = [[1, 0], [0, 1], [1, 1], [0, 0]];
    const { components } = pca(data, 2);
    for (const c of components) expect(NEAR(vecNorm(c), 1, 1e-7)).toBe(true);
  });
  it('first component has highest explained variance', () => {
    const data = [[10, 1], [20, 2], [30, 3], [40, 0], [50, 1]];
    const { explainedVariance } = pca(data, 2);
    expect(explainedVariance[0]).toBeGreaterThan(explainedVariance[1]!);
  });
  it('empty data → empty result', () => {
    const { components, explainedVariance } = pca([], 2);
    expect(components).toHaveLength(0);
    expect(explainedVariance).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Sports applications
// ---------------------------------------------------------------------------

describe('playerSimilarityMatrix', () => {
  it('diagonal entries = 1', () => {
    const players = [[1, 0, 0], [0, 1, 0], [1, 1, 0]];
    const M = playerSimilarityMatrix(players);
    expect(NEAR(M[0]![0]!, 1)).toBe(true);
    expect(NEAR(M[1]![1]!, 1)).toBe(true);
  });
  it('symmetric: M[i][j] = M[j][i]', () => {
    const players = [[1, 2], [3, 4], [5, 0]];
    const M = playerSimilarityMatrix(players);
    expect(NEAR(M[0]![1]!, M[1]![0]!)).toBe(true);
    expect(NEAR(M[0]![2]!, M[2]![0]!)).toBe(true);
  });
  it('orthogonal players have similarity 0', () => {
    const players = [[1, 0], [0, 1]];
    const M = playerSimilarityMatrix(players);
    expect(NEAR(M[0]![1]!, 0)).toBe(true);
  });
  it('identical players have similarity 1', () => {
    const players = [[1, 2, 3], [1, 2, 3]];
    const M = playerSimilarityMatrix(players);
    expect(NEAR(M[0]![1]!, 1)).toBe(true);
  });
});

describe('featureWeighting', () => {
  it('returns unit-norm vector', () => {
    const result = featureWeighting([2, 3, 4], [1, 1, 1]);
    expect(NEAR(vecNorm(result), 1, 1e-9)).toBe(true);
  });
  it('negative products are clamped to 0', () => {
    const result = featureWeighting([1, 2], [-1, 1]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeGreaterThan(0);
  });
  it('all-zero result stays zero', () => {
    const result = featureWeighting([-1, -2], [1, 1]);
    expect(result).toEqual([0, 0]);
  });
});

describe('rankByProjection', () => {
  it('correct ordering: highest score first', () => {
    const players = [[1, 0], [3, 0], [2, 0]];
    const dir = [1, 0];
    const ranked = rankByProjection(players, dir);
    expect(ranked[0]).toBe(1); // score 3
    expect(ranked[1]).toBe(2); // score 2
    expect(ranked[2]).toBe(0); // score 1
  });
  it('returns all indices', () => {
    const players = [[1, 2], [3, 4], [5, 6]];
    const ranked = rankByProjection(players, [1, 0]);
    expect(ranked).toHaveLength(3);
    expect([...ranked].sort()).toEqual([0, 1, 2]);
  });
  it('equal scores preserve stability (at least valid indices)', () => {
    const players = [[1, 0], [1, 0]];
    const ranked = rankByProjection(players, [1, 0]);
    expect(ranked).toHaveLength(2);
  });
});
