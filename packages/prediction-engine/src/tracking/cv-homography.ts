/**
 * Projective homography fit via the Direct Linear Transform (DLT) with
 * Hartley normalization, solved by least squares.
 *
 * This is the real perspective mapping for broadcast views: unlike the
 * bounding-box scale/offset approximation in fitHomographyFromYardlines()
 * (cv-movement-primitive.ts), DLT recovers rotation, shear, and perspective
 * terms, so yardlines converging toward the broadcast camera map correctly.
 *
 * Method: normalize both point sets (translate centroid to origin, scale so
 * mean distance = sqrt(2)), fix h33 = 1, stack the 2n×8 linear system, solve
 * the 8×8 normal equations by Gaussian elimination with partial pivoting,
 * then denormalize: H = T_dst^-1 · H_norm · T_src.
 *
 * Needs ≥4 non-degenerate correspondences; throws otherwise (an identity
 * fallback here would silently corrupt every downstream meter).
 *
 * Original implementation for GSE; no code ported.
 */

import type { Homography } from "./cv-movement-primitive.js";

export interface Correspondence {
  readonly xPx: number;
  readonly yPx: number;
  readonly xM: number;
  readonly yM: number;
}

interface Pt {
  x: number;
  y: number;
}

/** Similarity transform as a 3×3 (scale + translation only). */
interface Similarity {
  s: number;
  cx: number;
  cy: number;
}

function normalizingTransform(pts: readonly Pt[]): Similarity {
  const n = pts.length;
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;
  let meanDist = 0;
  for (const p of pts) {
    meanDist += Math.hypot(p.x - cx, p.y - cy);
  }
  meanDist /= n;
  // Degenerate (all points identical) → fall back to unit scale.
  const s = meanDist > 1e-12 ? Math.SQRT2 / meanDist : 1;
  return { s, cx, cy };
}

function applySimilarity(t: Similarity, p: Pt): Pt {
  return { x: (p.x - t.cx) * t.s, y: (p.y - t.cy) * t.s };
}

type Mat3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

function similarityToMat3(t: Similarity): Mat3 {
  return [
    [t.s, 0, -t.s * t.cx],
    [0, t.s, -t.s * t.cy],
    [0, 0, 1],
  ];
}

function invertSimilarity(t: Similarity): Mat3 {
  const inv = 1 / t.s;
  return [
    [inv, 0, t.cx],
    [0, inv, t.cy],
    [0, 0, 1],
  ];
}

function homographyToMat3(h: Homography): Mat3 {
  return [
    [h.h11, h.h12, h.h13],
    [h.h21, h.h22, h.h23],
    [h.h31, h.h32, h.h33],
  ];
}

function mat3ToHomography(m: Mat3): Homography {
  return {
    h11: m[0][0], h12: m[0][1], h13: m[0][2],
    h21: m[1][0], h22: m[1][1], h23: m[1][2],
    h31: m[2][0], h32: m[2][1], h33: m[2][2],
  };
}

function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const out: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let acc = 0;
      for (let k = 0; k < 3; k++) {
        acc += (a[i]?.[k] ?? 0) * (b[k]?.[j] ?? 0);
      }
      const row = out[i];
      if (row != null) row[j] = acc;
    }
  }
  return out;
}

/**
 * Solve min ||Ax − b||² via the normal equations (AᵀA)x = Aᵀb with Gaussian
 * elimination + partial pivoting. A is m×n (m ≥ n), b has length m.
 */
function solveLeastSquares(a: readonly (readonly number[])[], b: readonly number[]): number[] {
  const m = a.length;
  const n = a[0]?.length ?? 0;
  if (m === 0 || n === 0) throw new Error("solveLeastSquares: empty system");
  if (b.length !== m) throw new Error("solveLeastSquares: b length mismatch");

  // Normal equations.
  const ata: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const atb: number[] = new Array<number>(n).fill(0);
  for (let i = 0; i < m; i++) {
    const row = a[i];
    if (row == null) continue;
    for (let j = 0; j < n; j++) {
      const aij = row[j] ?? 0;
      atb[j] = (atb[j] ?? 0) + aij * (b[i] ?? 0);
      for (let k = 0; k < n; k++) {
        ata[j]![k] = (ata[j]![k] ?? 0) + aij * (row[k] ?? 0);
      }
    }
  }

  // Augmented matrix + forward elimination with partial pivoting.
  const aug: number[][] = ata.map((row, i) => [...row, atb[i] ?? 0]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r]![col] ?? 0) > Math.abs(aug[pivot]![col] ?? 0)) pivot = r;
    }
    const pivotVal = aug[pivot]![col] ?? 0;
    if (Math.abs(pivotVal) < 1e-12) {
      throw new Error("solveLeastSquares: singular normal equations (degenerate correspondences?)");
    }
    if (pivot !== col) {
      const tmp = aug[col]!;
      aug[col] = aug[pivot]!;
      aug[pivot] = tmp;
    }
    for (let r = col + 1; r < n; r++) {
      const factor = (aug[r]![col] ?? 0) / pivotVal;
      for (let c = col; c <= n; c++) {
        aug[r]![c] = (aug[r]![c] ?? 0) - factor * (aug[col]![c] ?? 0);
      }
    }
  }

  // Back substitution.
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let acc = aug[r]![n] ?? 0;
    for (let c = r + 1; c < n; c++) acc -= (aug[r]![c] ?? 0) * (x[c] ?? 0);
    x[r] = acc / (aug[r]![r] ?? 1);
  }
  return x;
}

export function fitHomographyDLT(points: readonly Correspondence[]): Homography {
  if (points.length < 4) {
    throw new Error(
      `fitHomographyDLT needs at least 4 correspondences, got ${points.length}`,
    );
  }

  const src = points.map((p) => ({ x: p.xPx, y: p.yPx }));
  const dst = points.map((p) => ({ x: p.xM, y: p.yM }));
  const tSrc = normalizingTransform(src);
  const tDst = normalizingTransform(dst);
  const srcN = src.map((p) => applySimilarity(tSrc, p));
  const dstN = dst.map((p) => applySimilarity(tDst, p));

  // Fix h33 = 1; linearize the projection equations for the other 8.
  const rows: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < srcN.length; i++) {
    const s = srcN[i];
    const d = dstN[i];
    if (s == null || d == null) continue;
    rows.push([s.x, s.y, 1, 0, 0, 0, -s.x * d.x, -s.y * d.x]);
    rhs.push(d.x);
    rows.push([0, 0, 0, s.x, s.y, 1, -s.x * d.y, -s.y * d.y]);
    rhs.push(d.y);
  }

  const h8 = solveLeastSquares(rows, rhs);
  const hNorm = homographyToMat3({
    h11: h8[0] ?? 0, h12: h8[1] ?? 0, h13: h8[2] ?? 0,
    h21: h8[3] ?? 0, h22: h8[4] ?? 0, h23: h8[5] ?? 0,
    h31: h8[6] ?? 0, h32: h8[7] ?? 0, h33: 1,
  });

  // Denormalize: H = T_dst^-1 · H_norm · T_src.
  const denorm = mat3Mul(mat3Mul(invertSimilarity(tDst), hNorm), similarityToMat3(tSrc));
  return mat3ToHomography(denorm);
}

/** Project a pixel point through a homography (test / debug helper). */
export function projectPoint(
  p: { xPx: number; yPx: number },
  h: Homography,
): { xM: number; yM: number } {
  const denom = h.h31 * p.xPx + h.h32 * p.yPx + h.h33;
  return {
    xM: (h.h11 * p.xPx + h.h12 * p.yPx + h.h13) / denom,
    yM: (h.h21 * p.xPx + h.h22 * p.yPx + h.h23) / denom,
  };
}
