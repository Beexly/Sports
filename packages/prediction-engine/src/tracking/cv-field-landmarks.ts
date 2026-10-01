/**
 * Automatic field-landmark detection for broadcast frames (gap c).
 *
 * Clean-room implementation of the method described in
 * docs/research/2026-10-01/cv-corpus/deep-dive-chung-brown.md
 * (Chung, Brown 2024): score-bug mask FIRST, then field-boundary mask,
 * white-filter → Canny → Hough → angle-filter for yard lines; LoG blob
 * detection → small-radius filter → Hough → angle-filter for the
 * hash-mark line. Yard-line ∩ hash-mark-line intersections are TRUE 2D
 * correspondences (non-colinear by construction) that feed the existing
 * Correspondence interface → fitHomographyDLT unchanged.
 *
 * Chung's thesis gives NO numeric parameters (verified by full-text
 * search); every numeric default below is marked [DERIVED] — engineering
 * starting points, first tuning run on real footage mandatory.
 *
 * Frames here are grayscale (VideoFrame.pixels); the "HSV white filter"
 * is realized as an adaptive luminance gate (Sloan §5.2 warns that fixed
 * color thresholds break under shadows — the adaptive path is the
 * mitigation).
 */

import type { BoundingBox, VideoFrame } from "./cv-detector-contract.js";
import {
  checkCorrespondenceGeometry,
  type Correspondence,
} from "./cv-homography.js";
import {
  hashMarkLineYM,
  templateXForYardFromOwnGoal,
  YARD_LINE_SPACING_YD,
} from "./cv-template.js";

export interface Pt2 {
  x: number;
  y: number;
}

/**
 * Standard Hough line: rho = x·cos θ + y·sin θ. theta is the NORMAL
 * angle in [0, π). p1/p2 are the supporting edge-point extents.
 */
export interface ImageLine {
  rho: number;
  theta: number;
  p1: Pt2;
  p2: Pt2;
}

export interface FieldLandmarks {
  readonly yardLines: readonly ImageLine[];
  readonly hashMarkLine: ImageLine | null;
  readonly boundary: ImageLine | null;
  readonly scoreBugRect: BoundingBox | null;
}

export interface LabeledYardLine {
  readonly line: ImageLine;
  /** Position on the 0..100 own-goal scale, multiples of 5 (the true line spacing). */
  readonly yardsFromOwnGoal: number;
  /** Nearest painted number 10..50 (display/labeling use). */
  readonly yardNumber: number;
  readonly side: "own" | "opp";
}

export interface LabeledLandmarks extends FieldLandmarks {
  readonly labeledYardLines: readonly LabeledYardLine[];
  /** True when the 50-side resolution was ambiguous. */
  readonly labelingAmbiguous: boolean;
}

export interface LandmarkOptions {
  /** Luminance gate for white paint. Default 200. [DERIVED] */
  whiteThreshold?: number;
  /** Use the adaptive percentile gate instead of the fixed threshold. */
  adaptiveWhite?: boolean;
  /** Canny low/high. Defaults 50/150. [DERIVED] */
  cannyLow?: number;
  cannyHigh?: number;
  /** Hough vote threshold as a fraction of image height. Default 0.35. [DERIVED] */
  houghVoteFraction?: number;
  /** Angle-filter tolerance, degrees. Default 12 (pre-deskew). [DERIVED] */
  angleToleranceDeg?: number;
  /** LoG sigma pyramid at 720p-equivalent. Default [2,3,4]. [DERIVED] */
  logSigmas?: readonly number[];
  /** Blob radius cutoff, px. Default 8. [DERIVED] */
  blobRadiusCutoff?: number;
  /** Duplicate-line merge: Δrho px. Default 6. [DERIVED] */
  mergeRhoPx?: number;
  /** Duplicate-line merge: Δtheta deg. Default 2. [DERIVED] */
  mergeThetaDeg?: number;
}

// ── Stage 1: score-bug mask (FIRST — bug text = white Hough false votes) ──

export function maskScoreBug(frame: VideoFrame, bugRect: BoundingBox): VideoFrame {
  const pixels = frame.pixels.map((row) => [...row]);
  const x0 = Math.max(0, Math.floor(bugRect.x));
  const y0 = Math.max(0, Math.floor(bugRect.y));
  const x1 = Math.min(frame.width, Math.ceil(bugRect.x + bugRect.width));
  const y1 = Math.min(frame.height, Math.ceil(bugRect.y + bugRect.height));
  for (let y = y0; y < y1; y++) {
    const row = pixels[y];
    if (row == null) continue;
    for (let x = x0; x < x1; x++) row[x] = 0;
  }
  return { ...frame, pixels };
}

// ── White paint mask (adaptive luminance gate) ──

/** 93rd-percentile luminance gate, floored/ceilinged. [DERIVED] */
export function adaptiveWhiteThreshold(frame: VideoFrame): number {
  const vals: number[] = [];
  for (const row of frame.pixels) for (const v of row) vals.push(v);
  if (vals.length === 0) return 200;
  vals.sort((a, b) => a - b);
  const p93 = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.93))] ?? 200;
  return Math.min(230, Math.max(170, p93 - 20));
}

export function whiteMask(
  frame: VideoFrame,
  threshold = 200,
): boolean[][] {
  return frame.pixels.map((row) => row.map((v) => v >= threshold));
}

/**
 * Lighting-variance metric over the unmasked field region (Sloan §5.2):
 * high variance ⇒ shadow/sunlight gradient ⇒ flag the frame rather than
 * silently returning skewed lines.
 */
export function lightingVariance(frame: VideoFrame, mask: boolean[][]): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (!(mask[y]?.[x] ?? false)) continue;
      const v = frame.pixels[y]?.[x] ?? 0;
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean)) / (mean + 1e-9);
}

// ── Canny edges (compact reference implementation) ──

function sobel(
  gray: readonly (readonly number[])[],
  w: number,
  h: number,
): { mag: number[][]; ang: number[][] } {
  const mag: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  const ang: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const v = gray[y + ky]?.[kx + x] ?? 0;
          gx += v * (gxK[(ky + 1) * 3 + (kx + 1)] ?? 0);
          gy += v * (gyK[(ky + 1) * 3 + (kx + 1)] ?? 0);
        }
      }
      mag[y]![x] = Math.hypot(gx, gy);
      let a = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (a < 0) a += 180;
      ang[y]![x] = a;
    }
  }
  return { mag, ang };
}

export function cannyEdges(
  gray: readonly (readonly number[])[],
  width: number,
  height: number,
  low = 50,
  high = 150,
): boolean[][] {
  const { mag, ang } = sobel(gray, width, height);
  // Non-maximum suppression (4 quantized directions).
  const thin: number[][] = Array.from({ length: height }, () =>
    new Array(width).fill(0),
  );
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const m = mag[y]?.[x] ?? 0;
      const a = ang[y]?.[x] ?? 0;
      let n1 = 0;
      let n2 = 0;
      if (a < 22.5 || a >= 157.5) {
        n1 = mag[y]?.[x - 1] ?? 0;
        n2 = mag[y]?.[x + 1] ?? 0;
      } else if (a < 67.5) {
        n1 = mag[y - 1]?.[x + 1] ?? 0;
        n2 = mag[y + 1]?.[x - 1] ?? 0;
      } else if (a < 112.5) {
        n1 = mag[y - 1]?.[x] ?? 0;
        n2 = mag[y + 1]?.[x] ?? 0;
      } else {
        n1 = mag[y - 1]?.[x - 1] ?? 0;
        n2 = mag[y + 1]?.[x + 1] ?? 0;
      }
      thin[y]![x] = m >= n1 && m >= n2 ? m : 0;
    }
  }
  // Hysteresis.
  const edges: boolean[][] = Array.from({ length: height }, () =>
    new Array(width).fill(false),
  );
  const stack: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((thin[y]?.[x] ?? 0) >= high) {
        edges[y]![x] = true;
        stack.push([x, y]);
      }
    }
  }
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (edges[ny]?.[nx] ?? false) continue;
        if ((thin[ny]?.[nx] ?? 0) >= low) {
          edges[ny]![nx] = true;
          stack.push([nx, ny]);
        }
      }
    }
  }
  return edges;
}

// ── Standard Hough line transform ──

export function houghLines(
  edges: readonly (readonly boolean[])[],
  width: number,
  height: number,
  voteThreshold: number,
  /** Rho bin size in px; >1 absorbs sub-bin jitter (hash-mark stage). */
  rhoBinPx = 1,
): ImageLine[] {
  const thetaStep = Math.PI / 180;
  const numTheta = 180;
  const maxRho = Math.hypot(width, height);
  const rhoStep = rhoBinPx;
  const numRho = Math.ceil((2 * maxRho) / rhoStep);
  const acc: number[][] = Array.from({ length: numRho }, () =>
    new Array(numTheta).fill(0),
  );
  const cosT: number[] = [];
  const sinT: number[] = [];
  for (let t = 0; t < numTheta; t++) {
    cosT.push(Math.cos(t * thetaStep));
    sinT.push(Math.sin(t * thetaStep));
  }
  for (let y = 0; y < height; y++) {
    const row = edges[y];
    if (row == null) continue;
    for (let x = 0; x < width; x++) {
      if (!row[x]) continue;
      for (let t = 0; t < numTheta; t++) {
        const rho = x * (cosT[t] ?? 0) + y * (sinT[t] ?? 0);
        const rIdx = Math.round((rho + maxRho) / rhoStep);
        if (rIdx >= 0 && rIdx < numRho) acc[rIdx]![t]! += 1;
      }
    }
  }
  // Peak extraction with 3×3 non-maximum suppression (borders included —
  // axis-aligned lines live in theta bins 0/179 and must not be skipped).
  const lines: ImageLine[] = [];
  const supports = new Map<string, Pt2[]>();
  for (let r = 0; r < numRho; r++) {
    for (let t = 0; t < numTheta; t++) {
      const v = acc[r]?.[t] ?? 0;
      if (v < voteThreshold) continue;
      let isMax = true;
      for (let dr = -1; dr <= 1 && isMax; dr++) {
        for (let dt = -1; dt <= 1; dt++) {
          if (dr === 0 && dt === 0) continue;
          const rr = r + dr;
          const tt = t + dt;
          if (rr < 0 || tt < 0 || rr >= numRho || tt >= numTheta) continue;
          if ((acc[rr]?.[tt] ?? 0) > v) {
            isMax = false;
            break;
          }
        }
      }
      if (!isMax) continue;
      const rho = r * rhoStep - maxRho;
      const theta = t * thetaStep;
      lines.push({ rho, theta, p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } });
      supports.set(`${r},${t}`, []);
      // Collect supporting edge points for segment extents.
      const pts: Pt2[] = [];
      for (let y = 0; y < height; y++) {
        const row = edges[y];
        if (row == null) continue;
        for (let x = 0; x < width; x++) {
          if (!row[x]) continue;
          const rr = x * (cosT[t] ?? 0) + y * (sinT[t] ?? 0);
          if (Math.abs(rr - rho) < 1.5) pts.push({ x, y });
        }
      }
      supports.set(`${r},${t}`, pts);
    }
  }
  // Fill segment extents from supporting points (project onto the line).
  return lines.map((ln, i) => {
    const keys = [...supports.keys()];
    const pts = supports.get(keys[i] ?? "") ?? [];
    if (pts.length === 0) return ln;
    const dx = -Math.sin(ln.theta);
    const dy = Math.cos(ln.theta);
    let minS = Infinity;
    let maxS = -Infinity;
    let minP = pts[0]!;
    let maxP = pts[0]!;
    for (const p of pts) {
      const s = p.x * dx + p.y * dy;
      if (s < minS) {
        minS = s;
        minP = p;
      }
      if (s > maxS) {
        maxS = s;
        maxP = p;
      }
    }
    return { ...ln, p1: minP, p2: maxP };
  });
}

/** Line direction angle in degrees, [0, 180). 0 = horizontal, 90 = vertical. */
export function lineDirectionDeg(line: ImageLine): number {
  let deg = (Math.atan2(line.p2.y - line.p1.y, line.p2.x - line.p1.x) * 180) / Math.PI;
  if (deg < 0) deg += 180;
  return deg;
}

function angDistDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return d > 90 ? 180 - d : d;
}

export function filterByDirection(
  lines: readonly ImageLine[],
  targetDeg: number,
  tolDeg: number,
): ImageLine[] {
  return lines.filter((l) => angDistDeg(lineDirectionDeg(l), targetDeg) <= tolDeg);
}

/**
 * Merge duplicate detections of the same physical line (Chung §3.2.2).
 * Sort-by-rho chaining: Hough theta-smear spreads one tilted line
 * across several 1° bins, so first-hit merging leaves the tail
 * unmerged and the split duplicates corrupt the 5-yard labeling count.
 * Chaining is safe — distinct yard lines sit ~40px apart in rho.
 */
export function mergeDuplicateLines(
  lines: readonly ImageLine[],
  dRhoPx = 8,
  dThetaDeg = 4,
): ImageLine[] {
  if (lines.length === 0) return [];
  const sorted = [...lines].sort((a, b) => a.rho - b.rho);
  const groups: ImageLine[][] = [];
  for (const ln of sorted) {
    const g = groups[groups.length - 1];
    const prev = g?.[g.length - 1];
    if (
      g != null &&
      prev != null &&
      Math.abs(prev.rho - ln.rho) < dRhoPx &&
      angDistDeg((prev.theta * 180) / Math.PI, (ln.theta * 180) / Math.PI) <
        dThetaDeg
    ) {
      g.push(ln);
    } else {
      groups.push([ln]);
    }
  }
  // Average each group; segment = union of supports projected on the
  // mean direction.
  return groups.map((g) => {
    const n = g.length;
    let rho = 0;
    let cx = 0;
    let cy = 0;
    let mx = 0;
    let my = 0; // circular mean of theta (handles 0°/179° wrap)
    for (const l of g) {
      rho += l.rho / n;
      cx += (l.p1.x + l.p2.x) / 2 / n;
      cy += (l.p1.y + l.p2.y) / 2 / n;
      const a = (l.theta * 2 * 180) / Math.PI;
      mx += Math.cos((a * Math.PI) / 180) / n;
      my += Math.sin((a * Math.PI) / 180) / n;
    }
    const theta = (((Math.atan2(my, mx) * 180) / Math.PI / 2 + 360) % 180) * Math.PI / 180;
    const dirX = Math.cos(theta + Math.PI / 2);
    const dirY = Math.sin(theta + Math.PI / 2);
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const l of g) {
      for (const p of [l.p1, l.p2]) {
        const t = (p.x - cx) * dirX + (p.y - cy) * dirY;
        tMin = Math.min(tMin, t);
        tMax = Math.max(tMax, t);
      }
    }
    return {
      rho,
      theta,
      p1: { x: cx + tMin * dirX, y: cy + tMin * dirY },
      p2: { x: cx + tMax * dirX, y: cy + tMax * dirY },
    };
  });
}

// ── LoG blob detection (hash marks: small bright blobs, not edges) ──

function logKernel(sigma: number): number[][] {
  const n = Math.ceil(sigma * 6) | 1;
  const size = n % 2 === 1 ? n : n + 1;
  const half = Math.floor(size / 2);
  const k: number[][] = [];
  const s2 = sigma * sigma;
  for (let y = -half; y <= half; y++) {
    const row: number[] = [];
    for (let x = -half; x <= half; x++) {
      const r2 = x * x + y * y;
      row.push(
        ((r2 - 2 * s2) / (s2 * s2)) * Math.exp(-r2 / (2 * s2)),
      );
    }
    k.push(row);
  }
  return k;
}

export interface Blob {
  x: number;
  y: number;
  /** Equivalent radius = √(area/π) of the thresholded response region. */
  radius: number;
  response: number;
}

export function logBlobs(
  gray: readonly (readonly number[])[],
  width: number,
  height: number,
  sigmas: readonly number[],
  responseFraction = 0.3,
): Blob[] {
  const blobs: Blob[] = [];
  for (const sigma of sigmas) {
    const k = logKernel(sigma);
    const half = Math.floor(k.length / 2);
    const resp: number[][] = Array.from({ length: height }, () =>
      new Array(width).fill(0),
    );
    let maxR = 0;
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let acc = 0;
        for (let ky = -half; ky <= half; ky++) {
          const krow = k[ky + half]!;
          const grow = gray[y + ky];
          if (grow == null) continue;
          for (let kx = -half; kx <= half; kx++) {
            acc += (grow[x + kx] ?? 0) * (krow[kx + half] ?? 0);
          }
        }
        // Bright blobs give negative LoG response; take the magnitude.
        const r = Math.abs(acc);
        resp[y]![x] = r;
        if (r > maxR) maxR = r;
      }
    }
    const thresh = maxR * responseFraction;
    // Connected components of the thresholded response map; each
    // component is one blob with an area-derived equivalent radius.
    const seen: boolean[][] = Array.from({ length: height }, () =>
      new Array(width).fill(false),
    );
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        if (seen[y]?.[x] || (resp[y]?.[x] ?? 0) < thresh) continue;
        const stack: Array<[number, number]> = [[x, y]];
        seen[y]![x] = true;
        let sx = 0;
        let sy = 0;
        let peak = 0;
        let area = 0;
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          area++;
          sx += cx;
          sy += cy;
          const r = resp[cy]?.[cx] ?? 0;
          if (r > peak) peak = r;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx < half || ny < half || nx >= width - half || ny >= height - half) continue;
              if (seen[ny]?.[nx] || (resp[ny]?.[nx] ?? 0) < thresh) continue;
              seen[ny]![nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
        blobs.push({
          x: sx / area,
          y: sy / area,
          radius: Math.sqrt(area / Math.PI),
          response: peak,
        });
      }
    }
  }
  return blobs;
}

// ── Line intersection ──

export function intersectLines(a: ImageLine, b: ImageLine): Pt2 | null {
  const d1x = a.p2.x - a.p1.x;
  const d1y = a.p2.y - a.p1.y;
  const d2x = b.p2.x - b.p1.x;
  const d2y = b.p2.y - b.p1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null; // parallel
  const t = ((b.p1.x - a.p1.x) * d2y - (b.p1.y - a.p1.y) * d2x) / denom;
  return { x: a.p1.x + t * d1x, y: a.p1.y + t * d1y };
}

// ── Detection stages ──

/** White-mask → Canny → Hough without any filtering (test/debug seam). */
export function rawHoughLines(
  frame: VideoFrame,
  opts: LandmarkOptions = {},
): ImageLine[] {
  const thr = opts.adaptiveWhite ?? false
    ? adaptiveWhiteThreshold(frame)
    : (opts.whiteThreshold ?? 200);
  const mask = whiteMask(frame, thr);
  const edges = cannyEdges(
    frame.pixels,
    frame.width,
    frame.height,
    opts.cannyLow ?? 50,
    opts.cannyHigh ?? 150,
  );
  const masked = edges.map((row, y) => row.map((e, x) => e && (mask[y]?.[x] ?? false)));
  const voteThr = Math.max(20, Math.floor(frame.height * (opts.houghVoteFraction ?? 0.35)));
  return houghLines(masked, frame.width, frame.height, voteThr);
}

export function detectFieldBoundary(
  frame: VideoFrame,
  opts: LandmarkOptions = {},
): ImageLine | null {
  const thr = opts.adaptiveWhite ?? false
    ? adaptiveWhiteThreshold(frame)
    : (opts.whiteThreshold ?? 200);
  const mask = whiteMask(frame, thr);
  const edges = cannyEdges(
    frame.pixels,
    frame.width,
    frame.height,
    opts.cannyLow ?? 50,
    opts.cannyHigh ?? 150,
  );
  // Mask edges to the white region (kills stands/sideline clutter outside paint).
  const masked = edges.map((row, y) => row.map((e, x) => e && (mask[y]?.[x] ?? false)));
  const voteThr = Math.max(20, Math.floor(frame.height * (opts.houghVoteFraction ?? 0.35)));
  const lines = houghLines(masked, frame.width, frame.height, voteThr);
  const horizontal = filterByDirection(lines, 0, opts.angleToleranceDeg ?? 12);
  if (horizontal.length === 0) return null;
  // Merge duplicate detections of the same line, then take the LOWEST
  // (nearest-sideline) candidate: averaging a sideline with a hash-mark
  // row would land between the two. (Chung averages multiple detections
  // of the boundary itself — the merge step above is that averaging.)
  const merged = mergeDuplicateLines(horizontal, opts.mergeRhoPx ?? 6, opts.mergeThetaDeg ?? 2);
  let best = merged[0]!;
  let bestY = (best.p1.y + best.p2.y) / 2;
  for (const l of merged) {
    const y = (l.p1.y + l.p2.y) / 2;
    if (y > bestY) {
      bestY = y;
      best = l;
    }
  }
  return best;
}

export function detectYardLines(
  frame: VideoFrame,
  opts: LandmarkOptions = {},
): ImageLine[] {
  const thr = opts.adaptiveWhite ?? false
    ? adaptiveWhiteThreshold(frame)
    : (opts.whiteThreshold ?? 200);
  const mask = whiteMask(frame, thr);
  const edges = cannyEdges(
    frame.pixels,
    frame.width,
    frame.height,
    opts.cannyLow ?? 50,
    opts.cannyHigh ?? 150,
  );
  const masked = edges.map((row, y) => row.map((e, x) => e && (mask[y]?.[x] ?? false)));
  const voteThr = Math.max(20, Math.floor(frame.height * (opts.houghVoteFraction ?? 0.35)));
  const lines = houghLines(masked, frame.width, frame.height, voteThr);
  const vertical = filterByDirection(lines, 90, opts.angleToleranceDeg ?? 12);
  // Keep only lines spanning a real fraction of the frame height.
  const tall = vertical.filter(
    (l) => Math.abs(l.p2.y - l.p1.y) > frame.height * 0.4,
  );
  return mergeDuplicateLines(tall, opts.mergeRhoPx ?? 8, opts.mergeThetaDeg ?? 4);
}

export function detectHashMarkLine(
  frame: VideoFrame,
  opts: LandmarkOptions = {},
  /** Drop blob centers below this y (e.g. the detected sideline boundary). */
  excludeBelowY?: number,
): ImageLine | null {
  const blobs = logBlobs(
    frame.pixels,
    frame.width,
    frame.height,
    opts.logSigmas ?? [2, 3, 4],
  );
  // Small-radius only: hash marks are small vs players/paint. [DERIVED]
  const small = blobs.filter(
    (b) =>
      b.radius < (opts.blobRadiusCutoff ?? 8) &&
      (excludeBelowY == null || b.y < excludeBelowY),
  );
  if (small.length < 3) return null;
  // Hough over blob centers as a pseudo-edge map.
  const edges: boolean[][] = Array.from({ length: frame.height }, () =>
    new Array(frame.width).fill(false),
  );
  for (const b of small) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (x >= 0 && y >= 0 && x < frame.width && y < frame.height) {
      edges[y]![x] = true;
    }
  }
  // Hough as a hypothesis generator (low threshold — bin straddle must
  // not kill the peak); verification happens by inlier count below.
  // rhoBinPx=2 absorbs blob-centroid jitter across the tilted tick row.
  const voteThr = Math.max(4, Math.floor(small.length * 0.02));
  const seeds = houghLines(edges, frame.width, frame.height, voteThr, 2);
  const horizontal = filterByDirection(seeds, 0, opts.angleToleranceDeg ?? 12);
  if (horizontal.length === 0) return null;
  const candidates = mergeDuplicateLines(horizontal, opts.mergeRhoPx ?? 6, opts.mergeThetaDeg ?? 2);
  // Verify each candidate by inlier count; refit the winner by least
  // squares. A candidate needs a real quorum of the blob population —
  // chance alignments of clutter put ~2% of blobs in any 4px band.
  const inlierBandPx = 2;
  const quorum = Math.max(6, Math.floor(small.length * 0.05));
  let best: { rho: number; theta: number; inliers: Pt2[] } | null = null;
  for (const c of candidates) {
    const inliers = small.filter(
      (b) => pointLineDist({ x: b.x, y: b.y }, c.rho, c.theta) < inlierBandPx,
    );
    if (inliers.length >= quorum && (best == null || inliers.length > best.inliers.length)) {
      const fit = refitLineLS(inliers.map((b) => ({ x: b.x, y: b.y })));
      best = { rho: fit.rho, theta: fit.theta, inliers: inliers.map((b) => ({ x: b.x, y: b.y })) };
    }
  }
  if (best == null) return null;
  // Emit as a segment spanning the inlier extent.
  const ct = Math.cos(best.theta);
  const st = Math.sin(best.theta);
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of best.inliers) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  // Rebuild endpoints from the refit line through the inlier x-extent.
  const yFor = (x: number) =>
    Math.abs(st) < 1e-9 ? best!.inliers[0]!.y : (best!.rho - ct * x) / st;
  return {
    rho: best.rho,
    theta: best.theta,
    p1: { x: minX, y: yFor(minX) },
    p2: { x: maxX, y: yFor(maxX) },
  };
}

/**
 * Orthogonal least-squares refit of a line through points.
 * Returns { rho, theta } in Hough normal form.
 */
export function refitLineLS(pts: Pt2[]): { rho: number; theta: number } {
  const n = pts.length;
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x / n;
    my += p.y / n;
  }
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  // Normal = eigenvector of the SMALLER eigenvalue of the covariance.
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (trace / 2) * (trace / 2) - det));
  const lmin = trace / 2 - disc;
  let nx = lmin - syy;
  let ny = sxy;
  if (Math.abs(nx) < 1e-9 && Math.abs(ny) < 1e-9) {
    nx = 1;
    ny = 0;
  }
  const norm = Math.hypot(nx, ny);
  nx /= norm;
  ny /= norm;
  let theta = Math.atan2(ny, nx);
  if (theta < 0) theta += Math.PI;
  const rho = mx * Math.cos(theta) + my * Math.sin(theta);
  return { rho, theta };
}

/** Perpendicular distance from point to (rho, theta) line. */
export function pointLineDist(p: Pt2, rho: number, theta: number): number {
  return Math.abs(p.x * Math.cos(theta) + p.y * Math.sin(theta) - rho);
}
export function detectFieldLandmarks(
  frame: VideoFrame,
  opts: LandmarkOptions = {},
): FieldLandmarks {
  const boundary = detectFieldBoundary(frame, opts);
  const yardLines = detectYardLines(frame, opts);
  const excludeBelowY =
    boundary == null ? undefined : (boundary.p1.y + boundary.p2.y) / 2;
  const hashMarkLine = detectHashMarkLine(frame, opts, excludeBelowY);
  return { yardLines, hashMarkLine, boundary, scoreBugRect: null };
}

/** Yard-line ∩ boundary-line intersections (second correspondence row). */
export function intersectYardLinesWithBoundary(lm: FieldLandmarks): Pt2[] {
  if (lm.boundary == null) return [];
  const pts: Pt2[] = [];
  for (const yl of lm.yardLines) {
    const p = intersectLines(yl, lm.boundary);
    if (p != null) pts.push(p);
  }
  return pts;
}

/** Yard-line ∩ hash-mark-line intersections (first correspondence row). */
export function intersectYardLinesWithHash(lm: FieldLandmarks): Pt2[] {
  if (lm.hashMarkLine == null) return [];
  const pts: Pt2[] = [];
  for (const yl of lm.yardLines) {
    const p = intersectLines(yl, lm.hashMarkLine);
    if (p != null) pts.push(p);
  }
  return pts;
}

// ── Labeling (LOS anchor + 5-yard propagation; Chung's documented-unsolved step) ──

export interface LosAnchor {
  /** Line of scrimmage in yards from the own goal line (0..100). */
  losYard: number;
  /** Image x of the projected LOS. */
  losImageX: number;
  /** Which half the play is on (resolves the 50-side ambiguity). */
  side: "own" | "opp";
}

/**
 * Anchor the detected line nearest the projected LOS, then assign each
 * line a yard value from the CALIBRATED px/yard scale (not from
 * consecutive-index propagation): duplicates of one line round to the
 * same value and collapse, and a missing line no longer shifts the
 * whole labeling. Returns labelingAmbiguous=true when the anchor sits
 * within 2.5 yards of midfield (either 50-side reading is plausible).
 */
export function labelYardLines(
  lm: FieldLandmarks,
  anchor: LosAnchor,
): LabeledLandmarks {
  const sorted = [...lm.yardLines].sort(
    (a, b) => (a.p1.x + a.p2.x) / 2 - (b.p1.x + b.p2.x) / 2,
  );
  if (sorted.length === 0) {
    return { ...lm, labeledYardLines: [], labelingAmbiguous: true };
  }
  let anchorIdx = 0;
  let bestDist = Infinity;
  sorted.forEach((l, i) => {
    const cx = (l.p1.x + l.p2.x) / 2;
    const d = Math.abs(cx - anchor.losImageX);
    if (d < bestDist) {
      bestDist = d;
      anchorIdx = i;
    }
  });
  const anchorLine = sorted[anchorIdx]!;
  const anchorCx = (anchorLine.p1.x + anchorLine.p2.x) / 2;
  const anchorValue =
    Math.round(anchor.losYard / YARD_LINE_SPACING_YD) * YARD_LINE_SPACING_YD;
  // Calibrated scale: median inter-line spacing / 5 yards.
  const pxPerYard = calibrateYardScale(sorted);
  // Assign by rounded offset; collapse duplicates to one entry each
  // (keep the detection nearest the expected position).
  const byYard = new Map<number, { line: ImageLine; err: number }>();
  sorted.forEach((line) => {
    const cx = (line.p1.x + line.p2.x) / 2;
    const yardsFromOwnGoal =
      anchorValue +
      Math.round((cx - anchorCx) / pxPerYard / YARD_LINE_SPACING_YD) *
        YARD_LINE_SPACING_YD;
    const expectedCx = anchorCx + (yardsFromOwnGoal - anchorValue) * pxPerYard;
    const err = Math.abs(cx - expectedCx);
    const prev = byYard.get(yardsFromOwnGoal);
    if (prev == null || err < prev.err) byYard.set(yardsFromOwnGoal, { line, err });
  });
  const labeledYardLines: LabeledYardLine[] = [...byYard.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([yardsFromOwnGoal, { line }]) => {
      // Convert 0..100 own-goal scale to painted number + side.
      const rawNumber =
        yardsFromOwnGoal <= 50 ? yardsFromOwnGoal : 100 - yardsFromOwnGoal;
      const side: "own" | "opp" = yardsFromOwnGoal <= 50 ? "own" : "opp";
      const yardNumber = Math.min(50, Math.max(10, Math.round(rawNumber / 10) * 10));
      return { line, yardsFromOwnGoal, yardNumber, side };
    });
  const labelingAmbiguous = Math.abs(anchor.losYard - 50) < 2.5;
  return { ...lm, labeledYardLines, labelingAmbiguous };
}

/**
 * Intersections → Correspondence[] for fitHomographyDLT. Uses the true
 * 5-yard line positions (not the painted 10-yard numbers) for the dst
 * xM — every other painted line would halve the correspondence count.
 *
 * Two rows are emitted per yard line: the hash-mark row (yM = 5.64 m)
 * and the near-sideline boundary row (yM = 0). The hash row ALONE is
 * colinear in both image and template space — a homography cannot be
 * fit from it, and the geometry guard correctly refuses that input.
 * The two-row set has genuine 2D spread.
 *
 * The geometry guard runs here so a silently degraded landmark set
 * (hash line missed → boundary-row-only → colinear) becomes a NAMED
 * refusal, never a garbage matrix.
 */
export function landmarksToCorrespondences(
  lm: LabeledLandmarks,
): Correspondence[] {
  const corr: Correspondence[] = [];
  for (const labeled of lm.labeledYardLines) {
    const xM = templateXForYardFromOwnGoal(labeled.yardsFromOwnGoal);
    if (lm.hashMarkLine != null) {
      const p = intersectLines(labeled.line, lm.hashMarkLine);
      if (p != null) {
        corr.push({ xPx: p.x, yPx: p.y, xM, yM: hashMarkLineYM() });
      }
    }
    if (lm.boundary != null) {
      const p = intersectLines(labeled.line, lm.boundary);
      if (p != null) {
        corr.push({ xPx: p.x, yPx: p.y, xM, yM: 0 });
      }
    }
  }
  // Refuse (named) instead of emitting a degenerate fit — even on empty.
  checkCorrespondenceGeometry(corr);
  return corr;
}

/**
 * Per-frame px/yard from detected 5-yard line spacing (Sloan kernel):
 * median adjacent-line perpendicular spacing / 5. Independent cross-check
 * for validateHomographyScale.
 */
export function calibrateYardScale(yardLines: readonly ImageLine[]): number {
  if (yardLines.length < 2) {
    throw new Error("calibrateYardScale: need ≥2 yard lines");
  }
  const sorted = [...yardLines].sort((a, b) => a.rho - b.rho);
  const spacings: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    spacings.push(Math.abs((sorted[i]?.rho ?? 0) - (sorted[i - 1]?.rho ?? 0)));
  }
  spacings.sort((a, b) => a - b);
  const mid = Math.floor(spacings.length / 2);
  const median =
    spacings.length % 2 === 1
      ? (spacings[mid] ?? 0)
      : ((spacings[mid - 1] ?? 0) + (spacings[mid] ?? 0)) / 2;
  return median / YARD_LINE_SPACING_YD;
}
