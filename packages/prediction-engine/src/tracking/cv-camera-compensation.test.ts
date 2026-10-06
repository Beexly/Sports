import { describe, expect, it } from "vitest";
import {
  applyMat3,
  estimateInterFrameHomography,
  invertMat3,
  stabilizePoints,
  type Mat3,
} from "./cv-camera-compensation.js";
import type { VideoFrame } from "./cv-detector-contract.js";

const W = 320;
const H = 200;
const DEG = Math.PI / 180;

/** Synthetic field with strong corners: yard lines × hash ticks × sideline. */
function renderField(): VideoFrame {
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(70),
  );
  const bar = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) pixels[yy]![xx] = 255;
        }
    }
  };
  for (const lx of [40, 90, 140, 190, 240]) bar(lx, 20, lx, 180);
  for (let x = 20; x < 280; x += 16) bar(x, 99, x + 7, 101);
  bar(10, 185, 310, 185);
  // A few extra texture marks (yard-number-like blocks) for corner diversity.
  for (const [bx, by] of [[70, 140], [160, 60], [220, 140]] as const) {
    bar(bx, by, bx + 10, by);
    bar(bx, by, bx, by + 12);
  }
  return { index: 0, t: 0, pixels, width: W, height: H };
}

function bilinear(
  pixels: readonly (readonly number[])[],
  x: number, y: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (ix: number, iy: number) =>
    ix < 0 || iy < 0 || ix >= W || iy >= H ? 0 : (pixels[iy]?.[ix] ?? 0);
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x0 + 1, y0) * fx * (1 - fy) +
    at(x0, y0 + 1) * (1 - fx) * fy +
    at(x0 + 1, y0 + 1) * fx * fy
  );
}

/**
 * Warp prev by the INVERSE-sampled transform: curr(x,y) = prev(inv(x,y)),
 * where inv maps curr coords → prev coords.
 */
function warp(
  prev: VideoFrame,
  inv: (x: number, y: number) => { x: number; y: number },
): VideoFrame {
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(0),
  );
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = inv(x, y);
      pixels[y]![x] = bilinear(prev.pixels, s.x, s.y);
    }
  }
  return { index: 1, t: 1 / 30, pixels, width: W, height: H };
}

function translationMat(dx: number, dy: number): Mat3 {
  return { m: [1, 0, dx, 0, 1, dy, 0, 0, 1] };
}

describe("cv-camera-compensation (K2 inter-frame H)", () => {
  it("translation (40, −15): estimated H within 2 px", () => {
    const prev = renderField();
    // curr(x,y) = prev(x−40, y+15)  →  prev→curr is +(40, −15).
    const curr = warp(prev, (x, y) => ({ x: x - 40, y: y + 15 }));
    // Displacement magnitude is √(40²+15²) ≈ 42.7px — radius must cover it.
    const res = estimateInterFrameHomography(prev, curr, { matchRadius: 60 });
    expect(res).not.toBeNull();
    const m = res!.h.m;
    const s = m[8]!;
    expect(Math.abs(m[2]! / s - 40)).toBeLessThan(2);
    expect(Math.abs(m[5]! / s + 15)).toBeLessThan(2);
    expect(res!.inliers).toBeGreaterThanOrEqual(10);
  });

  it("pure rotation 5°: angle within 0.5°", () => {
    const prev = renderField();
    const cx = (W - 1) / 2;
    const cy = (H - 1) / 2;
    const th = 5 * DEG;
    // curr = prev rotated by +5° about center (clockwise, y-down).
    // inv: rotate by −5°.
    const curr = warp(prev, (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      return {
        x: cx + dx * Math.cos(th) + dy * Math.sin(th),
        y: cy - dx * Math.sin(th) + dy * Math.cos(th),
      };
    });
    const res = estimateInterFrameHomography(prev, curr, {
      matchRadius: 60,
      ransacIterations: 300,
    });
    expect(res).not.toBeNull();
    const m = res!.h.m;
    const s = m[8]!;
    // Rotation angle from the normalized linear part.
    const angle = Math.atan2(m[3]! / s, m[0]! / s) / DEG;
    expect(Math.abs(angle - 5)).toBeLessThan(0.5);
  });

  it("stabilizePoints: inverts the camera motion", () => {
    const H = translationMat(40, -15);
    // A static world point appears at (140, 85) in curr; in prev it was (100, 100).
    const stab = stabilizePoints([{ xPx: 140, yPx: 85 }], H);
    expect(Math.abs(stab[0]!.xPx - 100)).toBeLessThan(1e-6);
    expect(Math.abs(stab[0]!.yPx - 100)).toBeLessThan(1e-6);
  });

  it("returns null on featureless frames (no false H)", () => {
    const blank = (v: number): VideoFrame => ({
      index: 0,
      t: 0,
      pixels: Array.from({ length: H }, () => new Array(W).fill(v)),
      width: W,
      height: H,
    });
    expect(estimateInterFrameHomography(blank(70), blank(70))).toBeNull();
  });

  it("invertMat3 round-trips", () => {
    const H = translationMat(40, -15);
    const inv = invertMat3(H);
    const p = applyMat3(inv, 140, 85);
    expect(Math.abs(p.x - 100)).toBeLessThan(1e-9);
    expect(Math.abs(p.y - 100)).toBeLessThan(1e-9);
  });
});
