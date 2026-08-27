import { describe, it, expect } from "vitest";
import { invertMatrix } from "../linalg.js";

function multiply(a: ReadonlyArray<readonly number[]>, b: ReadonlyArray<readonly number[]>): number[][] {
  const n = a.length;
  const m = b[0]!.length;
  const k = b.length;
  const out: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) sum += a[i]![p]! * b[p]![j]!;
      out[i]![j] = sum;
    }
  }
  return out;
}

function expectApproxIdentity(m: ReadonlyArray<readonly number[]>, digits = 8) {
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m.length; j++) {
      expect(m[i]![j]!).toBeCloseTo(i === j ? 1 : 0, digits);
    }
  }
}

describe("invertMatrix", () => {
  it("inverts the identity matrix to itself", () => {
    const inv = invertMatrix([[1, 0], [0, 1]]);
    expect(inv).not.toBeNull();
    expectApproxIdentity(multiply([[1, 0], [0, 1]], inv!));
  });

  it("matches a hand-computed 2x2 inverse exactly", () => {
    // [[4,7],[2,6]]: det = 24-14 = 10; inverse = 1/10 * [[6,-7],[-2,4]]
    const inv = invertMatrix([[4, 7], [2, 6]]);
    expect(inv).not.toBeNull();
    expect(inv![0]![0]).toBeCloseTo(0.6, 10);
    expect(inv![0]![1]).toBeCloseTo(-0.7, 10);
    expect(inv![1]![0]).toBeCloseTo(-0.2, 10);
    expect(inv![1]![1]).toBeCloseTo(0.4, 10);
  });

  it("inverts a diagonal 3x3 matrix to the reciprocal diagonal", () => {
    const inv = invertMatrix([[2, 0, 0], [0, 3, 0], [0, 0, 4]]);
    expect(inv).not.toBeNull();
    expect(inv![0]![0]).toBeCloseTo(0.5, 10);
    expect(inv![1]![1]).toBeCloseTo(1 / 3, 10);
    expect(inv![2]![2]).toBeCloseTo(0.25, 10);
    expect(inv![0]![1]).toBeCloseTo(0, 10);
  });

  it("A * A^-1 = I for a general, non-trivial 4x4 matrix (validates without a hand-derived inverse)", () => {
    const a = [
      [4, 2, 1, 0],
      [1, 3, 0, 1],
      [0, 1, 5, 2],
      [2, 0, 1, 6],
    ];
    const inv = invertMatrix(a);
    expect(inv).not.toBeNull();
    expectApproxIdentity(multiply(a, inv!), 8);
    expectApproxIdentity(multiply(inv!, a), 8); // both sides — inverse is two-sided for a square matrix
  });

  it("returns null for a singular matrix instead of a garbage result", () => {
    // row 2 is exactly 2x row 1
    expect(invertMatrix([[1, 2], [2, 4]])).toBeNull();
  });

  it("inverts a uniformly tiny but well-conditioned matrix -- the singularity threshold is relative to the matrix's own scale, not a fixed absolute cutoff", () => {
    // [[1e-13]]: condition number 1, trivially invertible (inverse [[1e13]]).
    // A fixed absolute 1e-12 cutoff would wrongly reject this as singular
    // (its pivot, 1e-13, is below 1e-12). The product A*A^-1 is back at O(1)
    // scale regardless of A's own scale, so a normal-precision identity check applies.
    const inv = invertMatrix([[1e-13]]);
    expect(inv).not.toBeNull();
    expectApproxIdentity(multiply([[1e-13]], inv!), 6);

    // The same relative-scale argument for a uniformly-scaled identity.
    const scale = 1e-10;
    const scaledIdentity = [[scale, 0], [0, scale]];
    const invScaled = invertMatrix(scaledIdentity);
    expect(invScaled).not.toBeNull();
    expectApproxIdentity(multiply(scaledIdentity, invScaled!), 6);
  });

  it("returns null for an all-zero matrix", () => {
    expect(invertMatrix([[0, 0], [0, 0]])).toBeNull();
  });

  it("requires partial pivoting to succeed (a zero on the natural diagonal)", () => {
    // Without row swapping, elimination would divide by the (0,0) zero pivot.
    const a = [[0, 1], [1, 0]];
    const inv = invertMatrix(a);
    expect(inv).not.toBeNull();
    expectApproxIdentity(multiply(a, inv!));
  });

  it("throws on a non-square matrix", () => {
    expect(() => invertMatrix([[1, 2, 3], [4, 5, 6]])).toThrow(RangeError);
  });

  it("throws on empty input", () => {
    expect(() => invertMatrix([])).toThrow(RangeError);
  });
});
