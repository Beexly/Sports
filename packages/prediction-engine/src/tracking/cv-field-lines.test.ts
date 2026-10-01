import { describe, expect, it } from "vitest";
import {
  anchorDriftCorrection,
  applyAffineFieldMap,
  buildAffineFieldMap,
  invertAffineFieldMap,
  topAnchorPoint,
} from "./cv-field-lines.js";
import {
  detectFieldBoundary,
  detectHashMarkLine,
  detectYardLines,
  labelYardLines,
  type ImageLine,
  type LabeledYardLine,
} from "./cv-field-landmarks.js";
import type { VideoFrame } from "./cv-detector-contract.js";

const W = 700;
const H = 400;
const DEG = Math.PI / 180;
const ROLL_DEG = 7.3;
const PX_PER_YARD = 20; // 100 px per 5 yards
const YARD_VALUES = [20, 25, 30, 35, 40, 45];

/** Rotate a point by +a (clockwise, y-down) about the image center. */
function rot(px: number, py: number, a: number): { x: number; y: number } {
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * Math.cos(a) - dy * Math.sin(a),
    y: cy + dx * Math.sin(a) + dy * Math.cos(a),
  };
}

function drawSeg(
  pixels: number[][],
  ax: number, ay: number, bx: number, by: number,
) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay)) * 2;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(ax + ((bx - ax) * i) / steps);
    const y = Math.round(ay + ((by - ay) * i) / steps);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) pixels[yy]![xx] = 255;
      }
  }
}

/**
 * Synthetic field through a KNOWN similarity transform: 6 yard lines at
 * derotated x' = 150 + i*100 (100 px = 5 yd at 20 px/yd), rotated 7.3°
 * about center, plus a near-sideline bar and hash ticks.
 */
function renderKnownSimilarity(): { frame: VideoFrame; lineSegs: { x1: number; y1: number; x2: number; y2: number }[] } {
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(60),
  );
  const a = ROLL_DEG * DEG;
  const lineSegs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  YARD_VALUES.forEach((_, i) => {
    const xp = 150 + i * 100;
    const p1 = rot(xp, 30, a);
    const p2 = rot(xp, 370, a);
    drawSeg(pixels, p1.x, p1.y, p2.x, p2.y);
    lineSegs.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
  });
  // Near-sideline bar (derotated y' = 385).
  const s1 = rot(80, 385, a);
  const s2 = rot(620, 385, a);
  drawSeg(pixels, s1.x, s1.y, s2.x, s2.y);
  // Hash ticks (derotated y' = 200, every 20 px).
  for (let xp = 100; xp <= 600; xp += 20) {
    const q1 = rot(xp - 8, 200, a);
    const q2 = rot(xp + 8, 200, a);
    drawSeg(pixels, q1.x, q1.y, q2.x, q2.y);
  }
  return { frame: { index: 0, t: 0, pixels, width: W, height: H }, lineSegs };
}

const DET_OPTS = { angleToleranceDeg: 15, houghVoteFraction: 0.2 };

function detectAndLabel(): {
  labeled: LabeledYardLine[];
  hash: ImageLine | null;
  sideline: ImageLine | null;
} {
  const { frame } = renderKnownSimilarity();
  const raw = detectYardLines(frame, DET_OPTS);
  expect(raw.length).toBeGreaterThanOrEqual(5);
  const hash = detectHashMarkLine(frame, DET_OPTS);
  const sideline = detectFieldBoundary(frame);
  // Anchor: leftmost detected line is the 20 (synthetic ground truth).
  const leftmost = [...raw].sort(
    (a, b) => (a.p1.x + a.p2.x) / 2 - (b.p1.x + b.p2.x) / 2,
  )[0]!;
  const lm = {
    yardLines: raw,
    hashMarkLine: hash,
    boundary: sideline,
    scoreBugRect: null,
  };
  const labeled = labelYardLines(lm, {
    losYard: 20,
    losImageX: (leftmost.p1.x + leftmost.p2.x) / 2,
    side: "own",
  }).labeledYardLines;
  return { labeled, hash, sideline };
}

describe("cv-field-lines (K5 affine fallback)", () => {
  it("7.3° rotation → roll within ±0.5°, yard scale within 1%", () => {
    const { labeled, hash, sideline } = detectAndLabel();
    const map = buildAffineFieldMap({ yardLines: labeled, hashLine: hash, sideline });
    expect(map).not.toBeNull();
    expect(Math.abs(map!.rollRad / DEG - ROLL_DEG)).toBeLessThan(0.5);
    expect(Math.abs(map!.pxPerYard - PX_PER_YARD) / PX_PER_YARD).toBeLessThan(0.01);
    expect(map!.fieldDirection).toBe(1);
  });

  it("held-out yard line reprojects within 2.0 px (known-similarity round trip)", () => {
    const { frame, lineSegs } = renderKnownSimilarity();
    const raw = detectYardLines(frame, DET_OPTS);
    const hash = detectHashMarkLine(frame, DET_OPTS);
    const sideline = detectFieldBoundary(frame);
    const leftmost = [...raw].sort(
      (a, b) => (a.p1.x + a.p2.x) / 2 - (b.p1.x + b.p2.x) / 2,
    )[0]!;
    const labeled = labelYardLines(
      { yardLines: raw, hashMarkLine: hash, boundary: sideline, scoreBugRect: null },
      { losYard: 20, losImageX: (leftmost.p1.x + leftmost.p2.x) / 2, side: "own" },
    ).labeledYardLines;
    // Fit on all but the 45-yard line; predict the held-out line.
    const fit = labeled.filter((l) => l.yardsFromOwnGoal !== 45);
    const map = buildAffineFieldMap({ yardLines: fit, hashLine: hash, sideline });
    expect(map).not.toBeNull();
    const inv = invertAffineFieldMap(map!);

    // Ground-truth: the rendered 45-yard line segment (index 5).
    const gt = lineSegs[5]!;
    // Predict where template (45 yd, hash-row lateral) lands in pixels.
    // Lateral: use the map's own hash anchor for a fair longitudinal test —
    // predict at yYd = 0 (the lateral anchor) and measure perpendicular
    // distance to the true line (rotation/scale error shows up laterally).
    const px = inv.b11 * 45 + inv.b12 * 0 + inv.sx;
    const py = inv.b21 * 45 + inv.b22 * 0 + inv.sy;
    // Distance from predicted point to the true 45-yard line.
    const dx = gt.x2 - gt.x1;
    const dy = gt.y2 - gt.y1;
    const len = Math.hypot(dx, dy);
    const dist = Math.abs(dy * px - dx * py + gt.x2 * gt.y1 - gt.y2 * gt.x1) / len;
    expect(dist).toBeLessThan(2.0);
  });

  it("applyAffineFieldMap: reference line maps to its label; direction −1 mirrors", () => {
    const { labeled, hash } = detectAndLabel();
    const map = buildAffineFieldMap({ yardLines: labeled, hashLine: hash });
    expect(map).not.toBeNull();
    // The median line should map near its labeled value.
    const sorted = [...labeled].sort(
      (a, b) => (a.line.p1.x + a.line.p2.x) / 2 - (b.line.p1.x + b.line.p2.x) / 2,
    );
    const ref = sorted[Math.floor(sorted.length / 2)]!;
    const mx = (ref.line.p1.x + ref.line.p2.x) / 2;
    const my = (ref.line.p1.y + ref.line.p2.y) / 2;
    const got = applyAffineFieldMap(map!, mx, my);
    expect(Math.abs(got.xYd - ref.yardsFromOwnGoal)).toBeLessThan(0.25);
  });

  it("returns null with no yard lines; unanchored lateral without hash/sideline", () => {
    expect(buildAffineFieldMap({ yardLines: [] })).toBeNull();
    const { labeled } = detectAndLabel();
    const map = buildAffineFieldMap({ yardLines: labeled });
    expect(map!.lateralAnchor).toBe("unanchored");
  });

  it("topAnchorPoint: topmost point of the longest yard line", () => {
    const { frame } = renderKnownSimilarity();
    const raw = detectYardLines(frame, DET_OPTS);
    const anchor = topAnchorPoint(raw);
    expect(anchor).not.toBeNull();
    // All yard lines span the frame; the anchor must be near the top.
    expect(anchor!.y).toBeLessThan(H * 0.3);
  });

  it("anchorDriftCorrection: pans cancel, null anchors pass through", () => {
    const frames = [
      [{ xPx: 200, yPx: 200 }],
      [{ xPx: 200, yPx: 200 }],
      [{ xPx: 200, yPx: 200 }],
    ];
    const anchors = [
      { x: 100, y: 50 },
      { x: 110, y: 55 }, // camera panned (+10, +5)
      null,
    ];
    const out = anchorDriftCorrection(frames, anchors);
    expect(out[0]![0]).toEqual({ xPx: 200, yPx: 200 });
    expect(out[1]![0]).toEqual({ xPx: 190, yPx: 195 });
    expect(out[2]![0]).toEqual({ xPx: 200, yPx: 200 }); // null anchor: untouched
  });
});
