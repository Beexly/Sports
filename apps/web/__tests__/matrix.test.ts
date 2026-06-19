import { describe, it, expect } from "vitest";
import {
  zeros,
  ones,
  identity,
  diagonal,
  shape,
  rows,
  cols,
  get,
  set,
  transpose,
  add,
  subtract,
  scalarMultiply,
  multiply,
  dotProduct,
  determinant,
  trace,
  frobenius,
  rowSwap,
  rowScale,
  rowAdd,
  luDecompose,
  solve,
  vectorNorm,
  vectorNormalize,
  cosineSimilarity,
  flatten,
  reshape,
  cloneMatrix,
  matrixEqual,
} from "@/lib/math/matrix";

// ---------------------------------------------------------------------------
// zeros
// ---------------------------------------------------------------------------
describe("zeros", () => {
  it("returns correct shape", () => {
    const m = zeros(3, 4);
    expect(m.length).toBe(3);
    expect(m[0]!.length).toBe(4);
  });

  it("all values are 0", () => {
    const m = zeros(2, 3);
    for (const row of m) for (const v of row) expect(v).toBe(0);
  });

  it("1×1 zero matrix", () => {
    expect(zeros(1, 1)).toEqual([[0]]);
  });
});

// ---------------------------------------------------------------------------
// ones
// ---------------------------------------------------------------------------
describe("ones", () => {
  it("returns correct shape", () => {
    const m = ones(2, 5);
    expect(m.length).toBe(2);
    expect(m[0]!.length).toBe(5);
  });

  it("all values are 1", () => {
    const m = ones(3, 3);
    for (const row of m) for (const v of row) expect(v).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// identity
// ---------------------------------------------------------------------------
describe("identity", () => {
  it("3×3 has ones on diagonal", () => {
    const I = identity(3);
    expect(I[0]![0]).toBe(1);
    expect(I[1]![1]).toBe(1);
    expect(I[2]![2]).toBe(1);
  });

  it("3×3 off-diagonal are zero", () => {
    const I = identity(3);
    expect(I[0]![1]).toBe(0);
    expect(I[1]![0]).toBe(0);
    expect(I[0]![2]).toBe(0);
  });

  it("1×1 identity", () => {
    expect(identity(1)).toEqual([[1]]);
  });

  it("is square with correct size", () => {
    const I = identity(4);
    expect(shape(I)).toEqual([4, 4]);
  });
});

// ---------------------------------------------------------------------------
// diagonal
// ---------------------------------------------------------------------------
describe("diagonal", () => {
  it("places values on diagonal", () => {
    const d = diagonal([2, 5, 7]);
    expect(d[0]![0]).toBe(2);
    expect(d[1]![1]).toBe(5);
    expect(d[2]![2]).toBe(7);
  });

  it("off-diagonal are zero", () => {
    const d = diagonal([2, 5, 7]);
    expect(d[0]![1]).toBe(0);
    expect(d[1]![0]).toBe(0);
    expect(d[2]![0]).toBe(0);
  });

  it("is square with correct size", () => {
    const d = diagonal([1, 2, 3, 4]);
    expect(shape(d)).toEqual([4, 4]);
  });
});

// ---------------------------------------------------------------------------
// shape / rows / cols
// ---------------------------------------------------------------------------
describe("shape", () => {
  it("2×3 matrix", () => {
    expect(shape([[1, 2, 3], [4, 5, 6]])).toEqual([2, 3]);
  });

  it("1×1 matrix", () => {
    expect(shape([[42]])).toEqual([1, 1]);
  });
});

describe("rows", () => {
  it("returns number of rows", () => {
    expect(rows([[1, 2], [3, 4], [5, 6]])).toBe(3);
  });
});

describe("cols", () => {
  it("returns number of columns", () => {
    expect(cols([[1, 2, 3, 4]])).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// get / set
// ---------------------------------------------------------------------------
describe("get", () => {
  it("returns correct element", () => {
    const m = [[1, 2], [3, 4]];
    expect(get(m, 0, 1)).toBe(2);
    expect(get(m, 1, 0)).toBe(3);
  });
});

describe("set", () => {
  it("returns a new matrix with value changed", () => {
    const m = [[1, 2], [3, 4]];
    const m2 = set(m, 0, 0, 99);
    expect(m2[0]![0]).toBe(99);
  });

  it("original matrix is not mutated", () => {
    const m = [[1, 2], [3, 4]];
    set(m, 0, 0, 99);
    expect(m[0]![0]).toBe(1);
  });

  it("other elements unchanged", () => {
    const m = [[1, 2], [3, 4]];
    const m2 = set(m, 1, 1, 7);
    expect(m2[0]![0]).toBe(1);
    expect(m2[0]![1]).toBe(2);
    expect(m2[1]![0]).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// transpose
// ---------------------------------------------------------------------------
describe("transpose", () => {
  it("2×3 becomes 3×2", () => {
    const m = [[1, 2, 3], [4, 5, 6]];
    const t = transpose(m);
    expect(shape(t)).toEqual([3, 2]);
  });

  it("values are correctly transposed", () => {
    const m = [[1, 2, 3], [4, 5, 6]];
    const t = transpose(m);
    expect(t[0]).toEqual([1, 4]);
    expect(t[1]).toEqual([2, 5]);
    expect(t[2]).toEqual([3, 6]);
  });

  it("transpose of identity is identity", () => {
    const I = identity(3);
    expect(matrixEqual(transpose(I), I)).toBe(true);
  });

  it("double transpose is original", () => {
    const m = [[1, 2, 3], [4, 5, 6]];
    expect(matrixEqual(transpose(transpose(m)), m)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------
describe("add", () => {
  it("adds element-wise", () => {
    const a = [[1, 2], [3, 4]];
    const b = [[5, 6], [7, 8]];
    expect(add(a, b)).toEqual([[6, 8], [10, 12]]);
  });

  it("throws on shape mismatch", () => {
    const a = [[1, 2]];
    const b = [[1, 2], [3, 4]];
    expect(() => add(a, b)).toThrow();
  });

  it("adding zeros returns same values", () => {
    const m = [[3, 5], [7, 11]];
    const z = zeros(2, 2);
    expect(matrixEqual(add(m, z), m)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// subtract
// ---------------------------------------------------------------------------
describe("subtract", () => {
  it("subtracts element-wise", () => {
    const a = [[5, 6], [7, 8]];
    const b = [[1, 2], [3, 4]];
    expect(subtract(a, b)).toEqual([[4, 4], [4, 4]]);
  });

  it("throws on shape mismatch", () => {
    const a = [[1, 2, 3]];
    const b = [[1, 2]];
    expect(() => subtract(a, b)).toThrow();
  });

  it("subtracting self gives zeros", () => {
    const m = [[3, 5], [7, 11]];
    expect(matrixEqual(subtract(m, m), zeros(2, 2))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scalarMultiply
// ---------------------------------------------------------------------------
describe("scalarMultiply", () => {
  it("scales all values", () => {
    const m = [[1, 2], [3, 4]];
    expect(scalarMultiply(m, 3)).toEqual([[3, 6], [9, 12]]);
  });

  it("multiply by 0 gives zeros", () => {
    const m = [[1, 2], [3, 4]];
    expect(matrixEqual(scalarMultiply(m, 0), zeros(2, 2))).toBe(true);
  });

  it("multiply by 1 returns same values", () => {
    const m = [[7, 8], [9, 10]];
    expect(matrixEqual(scalarMultiply(m, 1), m)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// multiply
// ---------------------------------------------------------------------------
describe("multiply", () => {
  it("2×3 × 3×2 → 2×2", () => {
    const a = [[1, 2, 3], [4, 5, 6]];
    const b = [[7, 8], [9, 10], [11, 12]];
    const c = multiply(a, b);
    expect(shape(c)).toEqual([2, 2]);
    expect(c[0]![0]).toBe(58);
    expect(c[0]![1]).toBe(64);
    expect(c[1]![0]).toBe(139);
    expect(c[1]![1]).toBe(154);
  });

  it("identity × M = M", () => {
    const m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const I = identity(3);
    expect(matrixEqual(multiply(I, m), m)).toBe(true);
  });

  it("M × identity = M", () => {
    const m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const I = identity(3);
    expect(matrixEqual(multiply(m, I), m)).toBe(true);
  });

  it("throws on shape mismatch", () => {
    const a = [[1, 2], [3, 4]];
    const b = [[1, 2], [3, 4], [5, 6]];
    expect(() => multiply(a, b)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// dotProduct
// ---------------------------------------------------------------------------
describe("dotProduct", () => {
  it("known value [1,2,3]·[4,5,6] = 32", () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it("orthogonal vectors → 0", () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it("throws on length mismatch", () => {
    expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// determinant
// ---------------------------------------------------------------------------
describe("determinant", () => {
  it("2×2 known value", () => {
    // [[1,2],[3,4]] → 1*4 - 2*3 = -2
    expect(determinant([[1, 2], [3, 4]])).toBeCloseTo(-2);
  });

  it("identity matrix → 1", () => {
    expect(determinant(identity(3))).toBeCloseTo(1);
  });

  it("singular matrix → 0", () => {
    const m = [[1, 2], [2, 4]];
    expect(determinant(m)).toBeCloseTo(0);
  });

  it("3×3 known value", () => {
    const m = [[1, 2, 3], [4, 5, 6], [7, 8, 10]];
    // det = -3
    expect(determinant(m)).toBeCloseTo(-3);
  });

  it("throws if not square", () => {
    expect(() => determinant([[1, 2, 3], [4, 5, 6]])).toThrow();
  });

  it("1×1 determinant is the element itself", () => {
    expect(determinant([[7]])).toBeCloseTo(7);
  });
});

// ---------------------------------------------------------------------------
// trace
// ---------------------------------------------------------------------------
describe("trace", () => {
  it("sum of diagonal for 3×3", () => {
    const m = [[1, 0, 0], [0, 2, 0], [0, 0, 3]];
    expect(trace(m)).toBe(6);
  });

  it("identity trace equals n", () => {
    expect(trace(identity(4))).toBe(4);
  });

  it("throws if not square", () => {
    expect(() => trace([[1, 2, 3]])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// frobenius
// ---------------------------------------------------------------------------
describe("frobenius", () => {
  it("[[1,0],[0,1]] → sqrt(2)", () => {
    expect(frobenius(identity(2))).toBeCloseTo(Math.sqrt(2));
  });

  it("[[3,4]] → 5", () => {
    expect(frobenius([[3, 4]])).toBeCloseTo(5);
  });

  it("[[0,0],[0,0]] → 0", () => {
    expect(frobenius(zeros(2, 2))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// rowSwap
// ---------------------------------------------------------------------------
describe("rowSwap", () => {
  it("swaps two rows", () => {
    const m = [[1, 2], [3, 4], [5, 6]];
    const r = rowSwap(m, 0, 2);
    expect(r[0]).toEqual([5, 6]);
    expect(r[2]).toEqual([1, 2]);
  });

  it("does not mutate original", () => {
    const m = [[1, 2], [3, 4]];
    rowSwap(m, 0, 1);
    expect(m[0]).toEqual([1, 2]);
  });

  it("middle row unchanged", () => {
    const m = [[1, 2], [3, 4], [5, 6]];
    const r = rowSwap(m, 0, 2);
    expect(r[1]).toEqual([3, 4]);
  });
});

// ---------------------------------------------------------------------------
// rowScale
// ---------------------------------------------------------------------------
describe("rowScale", () => {
  it("scales a row by scalar", () => {
    const m = [[1, 2], [3, 4]];
    const r = rowScale(m, 0, 5);
    expect(r[0]).toEqual([5, 10]);
  });

  it("other rows unchanged", () => {
    const m = [[1, 2], [3, 4]];
    const r = rowScale(m, 0, 5);
    expect(r[1]).toEqual([3, 4]);
  });

  it("does not mutate original", () => {
    const m = [[1, 2], [3, 4]];
    rowScale(m, 0, 5);
    expect(m[0]).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// rowAdd
// ---------------------------------------------------------------------------
describe("rowAdd", () => {
  it("adds k*row_j to row_i", () => {
    const m = [[1, 2], [3, 4]];
    // row0 += 2*row1 → [1+6, 2+8] = [7, 10]
    const r = rowAdd(m, 0, 1, 2);
    expect(r[0]).toEqual([7, 10]);
  });

  it("row_j unchanged", () => {
    const m = [[1, 2], [3, 4]];
    const r = rowAdd(m, 0, 1, 2);
    expect(r[1]).toEqual([3, 4]);
  });

  it("does not mutate original", () => {
    const m = [[1, 2], [3, 4]];
    rowAdd(m, 0, 1, 2);
    expect(m[0]).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// luDecompose
// ---------------------------------------------------------------------------
describe("luDecompose", () => {
  it("L*U = P*A for a regular matrix", () => {
    const A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
    const result = luDecompose(A);
    expect(result).not.toBeNull();
    const { L, U, P } = result!;
    // Verify P*A ≈ L*U
    const PA = multiply(P, A);
    const LU = multiply(L, U);
    expect(matrixEqual(PA, LU, 1e-9)).toBe(true);
  });

  it("L is lower triangular with ones on diagonal", () => {
    const A = [[2, 1], [4, 3]];
    const result = luDecompose(A);
    expect(result).not.toBeNull();
    const { L } = result!;
    expect(L[0]![0]).toBeCloseTo(1);
    expect(L[1]![1]).toBeCloseTo(1);
    expect(L[0]![1]).toBeCloseTo(0);
  });

  it("U is upper triangular", () => {
    const A = [[2, 1], [4, 3]];
    const result = luDecompose(A);
    expect(result).not.toBeNull();
    const { U } = result!;
    expect(U[1]![0]).toBeCloseTo(0);
  });

  it("returns null for singular matrix", () => {
    const A = [[1, 2], [2, 4]];
    expect(luDecompose(A)).toBeNull();
  });

  it("works for identity matrix", () => {
    const A = identity(3);
    const result = luDecompose(A);
    expect(result).not.toBeNull();
    const { L, U, P } = result!;
    const PA = multiply(P, A);
    const LU = multiply(L, U);
    expect(matrixEqual(PA, LU, 1e-9)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// solve
// ---------------------------------------------------------------------------
describe("solve", () => {
  it("solves 2×2 system", () => {
    // 2x + y = 5
    // x + 3y = 10  → x=1, y=3
    const A = [[2, 1], [1, 3]];
    const b = [5, 10];
    const x = solve(A, b);
    expect(x).not.toBeNull();
    expect(x![0]).toBeCloseTo(1);
    expect(x![1]).toBeCloseTo(3);
  });

  it("solves 3×3 system", () => {
    const A = [[1, 0, 0], [0, 2, 0], [0, 0, 3]];
    const b = [4, 10, 9];
    const x = solve(A, b);
    expect(x).not.toBeNull();
    expect(x![0]).toBeCloseTo(4);
    expect(x![1]).toBeCloseTo(5);
    expect(x![2]).toBeCloseTo(3);
  });

  it("returns null for singular matrix", () => {
    const A = [[1, 2], [2, 4]];
    const b = [3, 6];
    expect(solve(A, b)).toBeNull();
  });

  it("solution satisfies A*x = b", () => {
    const A = [[3, 1], [1, 2]];
    const b = [9, 8];
    const x = solve(A, b);
    expect(x).not.toBeNull();
    // Verify A*x = b
    const Ax = multiply(A, reshape(x!, 2, 1));
    expect(Ax[0]![0]).toBeCloseTo(b[0]!);
    expect(Ax[1]![0]).toBeCloseTo(b[1]!);
  });
});

// ---------------------------------------------------------------------------
// vectorNorm
// ---------------------------------------------------------------------------
describe("vectorNorm", () => {
  it("[3,4] → 5", () => {
    expect(vectorNorm([3, 4])).toBeCloseTo(5);
  });

  it("zero vector → 0", () => {
    expect(vectorNorm([0, 0, 0])).toBe(0);
  });

  it("unit vector → 1", () => {
    expect(vectorNorm([1, 0, 0])).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// vectorNormalize
// ---------------------------------------------------------------------------
describe("vectorNormalize", () => {
  it("[3,4] → [0.6, 0.8]", () => {
    const u = vectorNormalize([3, 4]);
    expect(u[0]).toBeCloseTo(0.6);
    expect(u[1]).toBeCloseTo(0.8);
  });

  it("zero vector → [0,0]", () => {
    expect(vectorNormalize([0, 0])).toEqual([0, 0]);
  });

  it("normalized vector has unit norm", () => {
    const u = vectorNormalize([1, 2, 3]);
    expect(vectorNorm(u)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// cosineSimilarity
// ---------------------------------------------------------------------------
describe("cosineSimilarity", () => {
  it("parallel vectors → 1", () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
  });

  it("orthogonal vectors → 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("anti-parallel vectors → -1", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("zero vector returns 0", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("both zero → 0", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// flatten
// ---------------------------------------------------------------------------
describe("flatten", () => {
  it("row-major order", () => {
    const m = [[1, 2, 3], [4, 5, 6]];
    expect(flatten(m)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("1×1 matrix", () => {
    expect(flatten([[42]])).toEqual([42]);
  });
});

// ---------------------------------------------------------------------------
// reshape
// ---------------------------------------------------------------------------
describe("reshape", () => {
  it("flat array → 2×3 matrix", () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const m = reshape(arr, 2, 3);
    expect(shape(m)).toEqual([2, 3]);
    expect(m[0]).toEqual([1, 2, 3]);
    expect(m[1]).toEqual([4, 5, 6]);
  });

  it("round-trip: flatten → reshape", () => {
    const m = [[1, 2, 3], [4, 5, 6]];
    expect(matrixEqual(reshape(flatten(m), 2, 3), m)).toBe(true);
  });

  it("throws on size mismatch", () => {
    expect(() => reshape([1, 2, 3, 4, 5], 2, 3)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// cloneMatrix
// ---------------------------------------------------------------------------
describe("cloneMatrix", () => {
  it("deep clone: modifying clone does not affect original", () => {
    const m = [[1, 2], [3, 4]];
    const clone = cloneMatrix(m);
    clone[0]![0] = 99;
    expect(m[0]![0]).toBe(1);
  });

  it("clone has same values", () => {
    const m = [[1, 2], [3, 4]];
    const clone = cloneMatrix(m);
    expect(matrixEqual(clone, m)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matrixEqual
// ---------------------------------------------------------------------------
describe("matrixEqual", () => {
  it("identical matrices → true", () => {
    const m = [[1, 2], [3, 4]];
    expect(matrixEqual(m, m)).toBe(true);
  });

  it("values within eps → true", () => {
    const a = [[1.0000000001]];
    const b = [[1.0]];
    expect(matrixEqual(a, b, 1e-9)).toBe(true);
  });

  it("values outside eps → false", () => {
    const a = [[1.0]];
    const b = [[1.01]];
    expect(matrixEqual(a, b, 1e-9)).toBe(false);
  });

  it("different shapes → false", () => {
    const a = [[1, 2]];
    const b = [[1], [2]];
    expect(matrixEqual(a, b)).toBe(false);
  });
});
