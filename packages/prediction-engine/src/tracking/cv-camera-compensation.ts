/**
 * cv-camera-compensation.ts — K2: inter-frame field-plane homography.
 *
 * Cancels camera motion by estimating the field-plane homography between
 * consecutive frames (prev → curr) from matched field-plane features,
 * RANSAC-robust. Pure classical geometry — no learning, no weights.
 * (Harsh Raj / "OpenCV classical geometry to cancel the camera motion".)
 *
 * Pipeline: Harris corners on the field mask → corner-to-corner NCC
 * matching → RANSAC DLT (reusing the guarded fitHomographyDLT) →
 * final refit on inliers. Detections are stabilized into the previous
 * frame's camera coordinates via the inverse homography, so the
 * motion-aware associator works in a camera-still frame.
 */

import {
  DegenerateCorrespondencesError,
  fitHomographyDLT,
  type Correspondence,
  type Homography,
} from "./cv-homography.js";
import type { VideoFrame } from "./cv-detector-contract.js";

/** Row-major 3×3 matrix. */
export interface Mat3 {
  readonly m: readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ];
}

export function mat3FromHomography(h: Homography): Mat3 {
  return {
    m: [h.h11, h.h12, h.h13, h.h21, h.h22, h.h23, h.h31, h.h32, h.h33],
  };
}

export function applyMat3(H: Mat3, x: number, y: number): { x: number; y: number } {
  const m = H.m;
  const w = m[6]! * x + m[7]! * y + m[8]!;
  return {
    x: (m[0]! * x + m[1]! * y + m[2]!) / w,
    y: (m[3]! * x + m[4]! * y + m[5]!) / w,
  };
}

/** Row-major 3×3 multiplication: (A·B)·p = A·(B·p). */
export function mat3Mul(A: Mat3, B: Mat3): Mat3 {
  const a = A.m;
  const b = B.m;
  const m: number[] = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      m[r * 3 + c] =
        a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!;
    }
  }
  return { m: m as unknown as Mat3["m"] };
}

export function invertMat3(H: Mat3): Mat3 {
  const m = H.m;
  const a = m[0]!, b = m[1]!, c = m[2]!;
  const d = m[3]!, e = m[4]!, f = m[5]!;
  const g = m[6]!, h = m[7]!, i = m[8]!;
  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) throw new Error("invertMat3: singular matrix");
  const inv = 1 / det;
  return {
    m: [
      A * inv, (c * h - b * i) * inv, (b * f - c * e) * inv,
      B * inv, (a * i - c * g) * inv, (c * d - a * f) * inv,
      C * inv, (b * g - a * h) * inv, (a * e - b * d) * inv,
    ],
  };
}

/**
 * Express foot points in the previous frame's camera coordinates.
 * H is the prev→curr inter-frame homography; stabilized = H⁻¹ · p.
 */
export function stabilizePoints(
  points: readonly { xPx: number; yPx: number }[],
  hPrevToCurr: Mat3,
): { xPx: number; yPx: number }[] {
  const inv = invertMat3(hPrevToCurr);
  return points.map((p) => {
    const q = applyMat3(inv, p.xPx, p.yPx);
    return { xPx: q.x, yPx: q.y };
  });
}

// ---------------------------------------------------------------------------
// Harris corners.
// ---------------------------------------------------------------------------

interface Corner {
  x: number;
  y: number;
  response: number;
}

function harrisCorners(
  pixels: readonly (readonly number[])[],
  width: number,
  height: number,
  maxCorners: number,
  relThreshold: number,
): Corner[] {
  // Sobel gradients.
  const ix: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  const iy: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -(pixels[y - 1]?.[x - 1] ?? 0) - 2 * (pixels[y]?.[x - 1] ?? 0) - (pixels[y + 1]?.[x - 1] ?? 0) +
        (pixels[y - 1]?.[x + 1] ?? 0) + 2 * (pixels[y]?.[x + 1] ?? 0) + (pixels[y + 1]?.[x + 1] ?? 0);
      const gy =
        -(pixels[y - 1]?.[x - 1] ?? 0) - 2 * (pixels[y - 1]?.[x] ?? 0) - (pixels[y - 1]?.[x + 1] ?? 0) +
        (pixels[y + 1]?.[x - 1] ?? 0) + 2 * (pixels[y + 1]?.[x] ?? 0) + (pixels[y + 1]?.[x + 1] ?? 0);
      ix[y]![x] = gx;
      iy[y]![x] = gy;
    }
  }
  // Structure tensor over 3×3, Harris response.
  const resp: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  let maxR = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sxx = 0, syy = 0, sxy = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = ix[y + dy]?.[x + dx] ?? 0;
          const gy = iy[y + dy]?.[x + dx] ?? 0;
          sxx += gx * gx; syy += gy * gy; sxy += gx * gy;
        }
      }
      const r = sxx * syy - sxy * sxy - 0.04 * (sxx + syy) * (sxx + syy);
      resp[y]![x] = r;
      if (r > maxR) maxR = r;
    }
  }
  // Non-maximum suppression (5×5) + threshold + top-N.
  const thresh = relThreshold * maxR;
  const corners: Corner[] = [];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const r = resp[y]?.[x] ?? 0;
      if (r < thresh) continue;
      let isMax = true;
      for (let dy = -2; dy <= 2 && isMax; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          if ((resp[y + dy]?.[x + dx] ?? 0) > r) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax) corners.push({ x, y, response: r });
    }
  }
  corners.sort((a, b) => b.response - a.response);
  return corners.slice(0, maxCorners);
}

// ---------------------------------------------------------------------------
// NCC matching (corner-to-corner).
// ---------------------------------------------------------------------------

function ncc(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
  ax: number, ay: number, bx: number, by: number,
  r: number,
): number {
  let sa = 0, sb = 0, n = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      sa += a[ay + dy]?.[ax + dx] ?? 0;
      sb += b[by + dy]?.[bx + dx] ?? 0;
      n++;
    }
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const va = (a[ay + dy]?.[ax + dx] ?? 0) - ma;
      const vb = (b[by + dy]?.[bx + dx] ?? 0) - mb;
      num += va * vb;
      da += va * va;
      db += vb * vb;
    }
  }
  const denom = Math.sqrt(da * db);
  return denom < 1e-9 ? 0 : num / denom;
}

interface Match {
  px: number; py: number;
  cx: number; cy: number;
}

function matchCorners(
  prev: VideoFrame,
  curr: VideoFrame,
  prevCorners: Corner[],
  currCorners: Corner[],
  patchRadius: number,
  matchRadius: number,
  nccThreshold: number,
): Match[] {
  // Spatial grid over curr corners for radius lookup.
  const cell = Math.max(1, Math.floor(matchRadius));
  const grid = new Map<string, Corner[]>();
  for (const c of currCorners) {
    const key = `${Math.floor(c.x / cell)},${Math.floor(c.y / cell)}`;
    const arr = grid.get(key);
    if (arr) arr.push(c);
    else grid.set(key, [c]);
  }
  const matches: Match[] = [];
  const pr = patchRadius;
  for (const pc of prevCorners) {
    if (
      pc.x < pr || pc.y < pr ||
      pc.x >= prev.width - pr || pc.y >= prev.height - pr
    ) {
      continue;
    }
    let best: Corner | null = null;
    let bestNcc = nccThreshold;
    const gx0 = Math.floor((pc.x - matchRadius) / cell);
    const gx1 = Math.floor((pc.x + matchRadius) / cell);
    const gy0 = Math.floor((pc.y - matchRadius) / cell);
    const gy1 = Math.floor((pc.y + matchRadius) / cell);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const cellCorners = grid.get(`${gx},${gy}`);
        if (!cellCorners) continue;
        for (const cc of cellCorners) {
          if (Math.hypot(cc.x - pc.x, cc.y - pc.y) > matchRadius) continue;
          if (
            cc.x < pr || cc.y < pr ||
            cc.x >= curr.width - pr || cc.y >= curr.height - pr
          ) {
            continue;
          }
          const v = ncc(prev.pixels, curr.pixels, pc.x, pc.y, cc.x, cc.y, pr);
          if (v > bestNcc) {
            bestNcc = v;
            best = cc;
          }
        }
      }
    }
    if (best != null) {
      matches.push({ px: pc.x, py: pc.y, cx: best.x, cy: best.y });
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// RANSAC homography.
// ---------------------------------------------------------------------------

export interface InterFrameHomographyOptions {
  maxCorners?: number;
  harrisRelThreshold?: number;
  patchRadius?: number;
  matchRadius?: number;
  nccThreshold?: number;
  ransacIterations?: number;
  inlierThresholdPx?: number;
  minInliers?: number;
}

export interface InterFrameHomographyResult {
  /** Prev → curr field-plane homography. */
  h: Mat3;
  inliers: number;
  matches: number;
}

function fitFromMatches(matches: readonly Match[]): Homography | null {
  if (matches.length < 4) return null;
  const corr: Correspondence[] = matches.map((m) => ({
    xPx: m.px,
    yPx: m.py,
    xM: m.cx,
    yM: m.cy,
  }));
  try {
    return fitHomographyDLT(corr);
  } catch {
    // Degenerate sample (colinear guard or singular normal equations):
    // not a usable RANSAC hypothesis — skip it.
    return null;
  }
}

function countInliers(
  h: Homography,
  matches: readonly Match[],
  threshPx: number,
): number {
  const H = mat3FromHomography(h);
  let n = 0;
  for (const m of matches) {
    const q = applyMat3(H, m.px, m.py);
    if (Math.hypot(q.x - m.cx, q.y - m.cy) <= threshPx) n++;
  }
  return n;
}

/**
 * Estimate the prev→curr field-plane homography. Returns null when
 * too few reliable matches survive (caller falls back to identity or
 * the anchor method).
 *
 * NOTE: `matchRadius` must cover the expected inter-frame displacement
 * magnitude (e.g. √(dx²+dy²) for a pure translation). True matches
 * outside the radius are never proposed, and periodic field markings
 * can alias to a wrong-but-confident transform.
 */
export function estimateInterFrameHomography(
  prev: VideoFrame,
  curr: VideoFrame,
  opts: InterFrameHomographyOptions = {},
): InterFrameHomographyResult | null {
  const {
    maxCorners = 150,
    harrisRelThreshold = 0.01,
    patchRadius = 5,
    matchRadius = 40,
    nccThreshold = 0.8,
    ransacIterations = 200,
    inlierThresholdPx = 3,
    minInliers = 10,
  } = opts;

  const prevCorners = harrisCorners(
    prev.pixels, prev.width, prev.height, maxCorners, harrisRelThreshold,
  );
  const currCorners = harrisCorners(
    curr.pixels, curr.width, curr.height, maxCorners, harrisRelThreshold,
  );
  const matches = matchCorners(
    prev, curr, prevCorners, currCorners, patchRadius, matchRadius, nccThreshold,
  );
  if (matches.length < minInliers) return null;

  // RANSAC sampling PRNG (mulberry32). Non-crypto use: uniform 4-point
  // sampling only — a seeded PRNG also makes compensation reproducible
  // across runs, which aids debugging. Seeded per call so repeated
  // invocations don't correlate.
  let ransacSeed = (Date.now() ^ 0x9e3779b9) | 0;
  const ransacRand = (): number => {
    ransacSeed |= 0;
    ransacSeed = (ransacSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(ransacSeed ^ (ransacSeed >>> 15), 1 | ransacSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let best: Homography | null = null;
  let bestInliers = 0;
  let bestSet: Match[] = [];
  for (let it = 0; it < ransacIterations; it++) {
    // Sample 4 distinct matches.
    const idx = new Set<number>();
    while (idx.size < 4) idx.add(Math.floor(ransacRand() * matches.length));
    const sample = [...idx].map((i) => matches[i]!);
    const h = fitFromMatches(sample);
    if (h == null) continue;
    const inliers = countInliers(h, matches, inlierThresholdPx);
    if (inliers > bestInliers) {
      bestInliers = inliers;
      best = h;
      bestSet = matches.filter((m) => {
        const q = applyMat3(mat3FromHomography(h), m.px, m.py);
        return Math.hypot(q.x - m.cx, q.y - m.cy) <= inlierThresholdPx;
      });
    }
  }
  if (best == null || bestInliers < minInliers) return null;
  // Refit on all inliers.
  const refit = fitFromMatches(bestSet) ?? best;
  return {
    h: mat3FromHomography(refit),
    inliers: bestInliers,
    matches: matches.length,
  };
}
