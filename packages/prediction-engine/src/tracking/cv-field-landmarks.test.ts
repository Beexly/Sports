import { describe, expect, it } from "vitest";
import {
  calibrateYardScale,
  detectFieldBoundary,
  detectFieldLandmarks,
  detectHashMarkLine,
  detectYardLines,
  intersectYardLinesWithHash,
  labelYardLines,
  landmarksToCorrespondences,
  lightingVariance,
  lineDirectionDeg,
  maskScoreBug,
  rawHoughLines,
  type FieldLandmarks,
  type ImageLine,
} from "./cv-field-landmarks.js";
import {
  DegenerateCorrespondencesError,
  fitHomographyDLT,
  projectPoint,
} from "./cv-homography.js";
import { HASH_OFFSET_M, YARDS_TO_METERS } from "./cv-template.js";
import type { Homography } from "./cv-movement-primitive.js";
import type { VideoFrame } from "./cv-detector-contract.js";

// ── Synthetic broadcast-frame renderer ──────────────────────────────

const W = 320;
const H = 200;

/** Known ground-truth image→template homography (mild perspective).
 *  Bottom of frame = near sideline (yM≈0), top = far side — the usual
 *  broadcast side view. 8 yard lines (15–50) land across the frame. */
const H_GT: Homography = {
  h11: 0.114, h12: 0.004, h13: 10.9,
  h21: 0.002, h22: -0.082, h23: 16.0,
  h31: 0.00006, h32: 0.00004, h33: 1,
};

function invertH(h: Homography): Homography {
  const m = [
    [h.h11, h.h12, h.h13],
    [h.h21, h.h22, h.h23],
    [h.h31, h.h32, h.h33],
  ];
  const det =
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const inv = (r: number, c: number) => {
    const s = (r + c) % 2 === 0 ? 1 : -1;
    const rows = [0, 1, 2].filter((i) => i !== r);
    const cols = [0, 1, 2].filter((i) => i !== c);
    const a = m[rows[0]!]![cols[0]!]!;
    const b = m[rows[0]!]![cols[1]!]!;
    const cc = m[rows[1]!]![cols[0]!]!;
    const d = m[rows[1]!]![cols[1]!]!;
    return (s * (a * d - b * cc)) / det;
  };
  // Adjugate transpose / det.
  return {
    h11: inv(0, 0), h12: inv(1, 0), h13: inv(2, 0),
    h21: inv(0, 1), h22: inv(1, 1), h23: inv(2, 1),
    h31: inv(0, 2), h32: inv(1, 2), h33: inv(2, 2),
  };
}

function applyH(p: { x: number; y: number }, h: Homography): { x: number; y: number } {
  const d = h.h31 * p.x + h.h32 * p.y + h.h33;
  return {
    x: (h.h11 * p.x + h.h12 * p.y + h.h13) / d,
    y: (h.h21 * p.x + h.h22 * p.y + h.h23) / d,
  };
}

const YARD_NUMBERS = [15, 20, 25, 30, 35, 40, 45, 50];

interface RenderOpts {
  withBug?: boolean;
  noiseBlobs?: number;
  seed?: number;
}

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Renders a synthetic field through H_GT: yard lines every 5 yd,
 * discrete hash ticks every 1 yd, near-sideline boundary bar, optional
 * player-like noise blobs and a fake score bug.
 */
function renderBroadcastFrame(opts: RenderOpts = {}): VideoFrame {
  const rand = mulberry(opts.seed ?? 7);
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(60),
  );
  const tickXM: number[] = [];
  for (let v = 12; v <= 53; v++) tickXM.push(v * YARDS_TO_METERS);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = applyH({ x, y }, H_GT);
      let white = false;
      for (const v of YARD_NUMBERS) {
        if (Math.abs(t.x - v * YARDS_TO_METERS) < 0.12) {
          white = true;
          break;
        }
      }
      if (!white) {
        for (const tx of tickXM) {
          if (Math.abs(t.x - tx) < 0.14 && Math.abs(t.y - HASH_OFFSET_M) < 0.09) {
            white = true;
            break;
          }
        }
      }
      if (!white && Math.abs(t.y) < 0.2) white = true; // sideline
      if (white) pixels[y]![x] = 255;
    }
  }
  // Player-like noise blobs (20×20 — LoG radius ~11 > 8 cutoff → rejected).
  for (let i = 0; i < (opts.noiseBlobs ?? 0); i++) {
    const bx = Math.floor(rand() * (W - 20));
    const by = Math.floor(rand() * (H - 20));
    for (let y = by; y < by + 20; y++) {
      for (let x = bx; x < bx + 20; x++) pixels[y]![x] = 230;
    }
  }
  if (opts.withBug ?? false) {
    for (let y = H - 25; y < H; y++) {
      for (let x = W - 120; x < W; x++) pixels[y]![x] = 245;
    }
  }
  return { index: 0, t: 0, pixels, width: W, height: H };
}

const BUG = { x: W - 120, y: H - 25, width: 120, height: 25 };

/** Axis-aligned simple render (no perspective) for ablation/noise tests. */
function renderAxisAligned(opts: { withBug?: boolean; noiseBlobs?: number } = {}): VideoFrame {
  const rand = mulberry(11);
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(60),
  );
  const xs = [40, 90, 140, 190, 240, 290];
  for (const lx of xs) {
    for (let y = 20; y < 180; y++) {
      for (let x = lx - 1; x <= lx + 1; x++) pixels[y]![x] = 255;
    }
  }
  for (let x = 20; x < 300; x += 14) {
    for (let y = 99; y <= 101; y++) {
      for (let dx = 0; dx < 6; dx++) pixels[y]![x + dx] = 255;
    }
  }
  for (let i = 0; i < (opts.noiseBlobs ?? 0); i++) {
    const bx = Math.floor(rand() * (W - 20));
    const by = Math.floor(rand() * (H - 20));
    for (let y = by; y < by + 20; y++) {
      for (let x = bx; x < bx + 20; x++) pixels[y]![x] = 230;
    }
  }
  if (opts.withBug ?? false) {
    for (let y = H - 25; y < H; y++) {
      for (let x = W - 120; x < W; x++) pixels[y]![x] = 245;
    }
  }
  return { index: 0, t: 0, pixels, width: W, height: H };
}

describe("cv-field-landmarks (Chung pipeline)", () => {
  it("end-to-end: synthetic broadcast frame through known H_gt → ≥4 intersections, reprojection < 2.0 px", () => {
    const frame = renderBroadcastFrame({ withBug: true, noiseBlobs: 12 });
    const masked = maskScoreBug(frame, BUG);
    const lm = detectFieldLandmarks(masked);

    // Yard lines found (8 painted), each near a true line.
    expect(lm.yardLines.length).toBeGreaterThanOrEqual(4);
    const hInv = invertH(H_GT);
    for (const yl of lm.yardLines) {
      const cx = (yl.p1.x + yl.p2.x) / 2;
      let best = Infinity;
      for (const v of YARD_NUMBERS) {
        const img = applyH({ x: v * YARDS_TO_METERS, y: HASH_OFFSET_M }, hInv);
        best = Math.min(best, Math.abs(img.x - cx));
      }
      // Tilted lines: center-x vs true-x at hash height has perspective slack.
      expect(best).toBeLessThan(6);
    }

    // Hash-mark line found, near-horizontal in the tilted frame.
    expect(lm.hashMarkLine).not.toBeNull();
    const hLine = lm.hashMarkLine!;
    const p1 = applyH({ x: 20 * YARDS_TO_METERS, y: HASH_OFFSET_M }, hInv);
    const p2 = applyH({ x: 45 * YARDS_TO_METERS, y: HASH_OFFSET_M }, hInv);
    const trueAng =
      (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
    expect(Math.abs(lineDirectionDeg(hLine) - (trueAng < 0 ? trueAng + 180 : trueAng))).toBeLessThan(5);

    // Intersections → correspondences → homography.
    const pts = intersectYardLinesWithHash(lm);
    expect(pts.length).toBeGreaterThanOrEqual(4);
    const losImgX = applyH({ x: 30 * YARDS_TO_METERS, y: HASH_OFFSET_M }, hInv).x;
    const labeled = labelYardLines(lm, { losYard: 30, losImageX: losImgX, side: "own" });
    const anchorLine = labeled.labeledYardLines.reduce((a, b) =>
      Math.abs((a.line.p1.x + a.line.p2.x) / 2 - losImgX) <
      Math.abs((b.line.p1.x + b.line.p2.x) / 2 - losImgX)
        ? a
        : b,
    );
    expect(anchorLine.yardsFromOwnGoal).toBe(30);

    const corr = landmarksToCorrespondences(labeled);
    expect(corr.length).toBeGreaterThanOrEqual(4);
    const hEst = fitHomographyDLT(corr);
    const hEstInv = invertH(hEst);

    // 20 held-out points: reprojection error in IMAGE pixels < 2.0 mean.
    let errSum = 0;
    for (let i = 0; i < 20; i++) {
      const v = 16 + i * 1.7; // yards from own goal
      const yM = HASH_OFFSET_M + (i % 5) * 1.1 - 2.2;
      const tpl = { x: v * YARDS_TO_METERS, y: yM };
      const wantImg = applyH(tpl, hInv);
      const gotImg = applyH(tpl, hEstInv);
      errSum += Math.hypot(gotImg.x - wantImg.x, gotImg.y - wantImg.y);
    }
    expect(errSum / 20).toBeLessThan(2.0);
  }, 60000);

  it("yard-lines-only landmark set is REFUSED with a named error (regression)", () => {
    const frame = renderAxisAligned();
    const lm = detectFieldLandmarks(frame);
    expect(lm.yardLines.length).toBeGreaterThanOrEqual(4);
    // Hash line missing → only the boundary row of correspondences →
    // colinear in image space. The guard must refuse by NAME, never fit.
    const degraded: FieldLandmarks = { ...lm, hashMarkLine: null };
    const labeled = labelYardLines(degraded, { losYard: 30, losImageX: 140, side: "own" });
    expect(() => landmarksToCorrespondences(labeled)).toThrowError(
      expect.objectContaining({ name: "DegenerateCorrespondencesError" }),
    );
    try {
      landmarksToCorrespondences(labeled);
      expect.unreachable();
    } catch (e) {
      expect((e as DegenerateCorrespondencesError).reason).toBe("colinear-src");
    }
  });

  it("score-bug ablation: mask preserves true lines, removes false votes", () => {
    const clean = renderAxisAligned();
    const buggy = renderAxisAligned({ withBug: true });
    const masked = maskScoreBug(buggy, BUG);
    const cleanCount = detectYardLines(clean).length;
    const maskedCount = detectYardLines(masked).length;
    expect(maskedCount).toBe(cleanCount);
    expect(maskedCount).toBeGreaterThanOrEqual(4);
    // The unmasked bug injects extra Hough votes.
    const rawMasked = rawHoughLines(masked).length;
    const rawBuggy = rawHoughLines(buggy).length;
    expect(rawBuggy).toBeGreaterThan(rawMasked);
  });

  it("hash-mark detection survives 40 player-like noise blobs (angle within 3°)", () => {
    const frame = renderAxisAligned({ noiseBlobs: 40 });
    const line = detectHashMarkLine(frame);
    expect(line).not.toBeNull();
    const ang = lineDirectionDeg(line!);
    const distToHorizontal = Math.min(ang, 180 - ang);
    expect(distToHorizontal).toBeLessThan(3);
  });

  it("calibrateYardScale recovers px/yard within 5%", () => {
    const frame = renderAxisAligned();
    const lines = detectYardLines(frame);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // Painted spacing is 50 px → 10 px/yard.
    expect(calibrateYardScale(lines)).toBeCloseTo(10, -1 + 1); // within 5%
  });

  it("maskScoreBug zeroes the bug region only", () => {
    const buggy = renderAxisAligned({ withBug: true });
    const masked = maskScoreBug(buggy, BUG);
    for (let y = BUG.y; y < BUG.y + BUG.height; y++) {
      for (let x = BUG.x; x < BUG.x + BUG.width; x++) {
        expect(masked.pixels[y]?.[x]).toBe(0);
      }
    }
    expect(masked.pixels[10]?.[10]).toBe(buggy.pixels[10]?.[10]);
  });

  it("lightingVariance flags shadow gradients instead of hiding them", () => {
    const flat: VideoFrame = {
      index: 0, t: 0, width: 40, height: 40,
      pixels: Array.from({ length: 40 }, () => new Array(40).fill(200)),
    };
    const gradPixels: number[][] = Array.from({ length: 40 }, (_, y) =>
      new Array(40).fill(0).map((_, x) => Math.round(100 + (x / 40) * 150)),
    );
    const grad: VideoFrame = { index: 0, t: 0, width: 40, height: 40, pixels: gradPixels };
    const allTrue = (f: VideoFrame) =>
      f.pixels.map((r) => r.map(() => true));
    const vFlat = lightingVariance(flat, allTrue(flat));
    const vGrad = lightingVariance(grad, allTrue(grad));
    expect(vFlat).toBeLessThan(0.05);
    expect(vGrad).toBeGreaterThan(vFlat * 5);
  });

  it("detectFieldBoundary finds the near sideline (lowest strong horizontal)", () => {
    const frame = renderBroadcastFrame();
    // The score bug's top edge is a false horizontal — the real pipeline
    // masks it upstream, so the test does the same.
    const b = detectFieldBoundary(maskScoreBug(frame, BUG));
    expect(b).not.toBeNull();
    // Sideline is the lowest horizontal structure in the frame.
    const y = (b!.p1.y + b!.p2.y) / 2;
    expect(y).toBeGreaterThan(H / 2);
  });
});
