/**
 * cv-rotation-deskew.ts — Sloan/FourTVerts rotation deskew (arccos kernel).
 *
 * Reconstructs the paper's "rotation via arccos(x)" stage: the camera roll
 * angle from the field-axis line (hash-mark direction) and the yard lines,
 * then a bilinear deskew that straightens the frame before Chung's
 * angle-filtered landmark detection.
 *
 * Sign convention (self-consistent; the paper underspecifies it):
 *   φ = the signed CONTENT rotation angle in image coords (x right, y DOWN).
 *   Positive φ = field content tilted clockwise (field-axis line rising to
 *   the right in y-down coords, i.e. v_axis.y > 0 after x≥0 normalization).
 *   deskewFrame(frame, φ) rotates the image by −φ about its center, which
 *   returns the content to canonical orientation (yard lines vertical).
 * The arccos magnitude is exactly the paper's φ = arccos(v_axis · e_x);
 * we take the sign from v_axis.y (content tilt) rather than the paper's
 * cross-product phrase, which yields the camera roll (opposite sign) —
 * the two differ only by sign, and ours composes correctly with the
 * "rotate by −φ" deskew. [RECONSTRUCTED — paper gives only "arccos(x)".]
 */

import type { ImageLine } from "./cv-field-landmarks.js";
import type { VideoFrame } from "./cv-detector-contract.js";

function clamp1(x: number): number {
  return Math.min(1, Math.max(-1, x));
}

/** Signed content-rotation angle from one undirected line that should be horizontal. */
export function axisLineRollAngle(line: ImageLine): number {
  let dx = line.p2.x - line.p1.x;
  let dy = line.p2.y - line.p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return 0;
  dx /= len;
  dy /= len;
  if (dx < 0) {
    dx = -dx;
    dy = -dy;
  }
  // φ = arccos(v · e_x), signed by the tilt direction (y-down: dy > 0 = clockwise).
  const mag = Math.acos(clamp1(dx));
  return (dy >= 0 ? 1 : -1) * mag;
}

/** Signed content-rotation angle from one yard line (canonical: vertical). */
export function yardLineRollAngle(line: ImageLine): number {
  const dx = line.p2.x - line.p1.x;
  const dy = line.p2.y - line.p1.y;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Wrap to [-90, 90): vertical ≡ ±90.
  deg = ((deg + 90) % 180 + 180) % 180 - 90;
  // deg is now the signed deviation from horizontal; yard lines should be
  // at ±90 → roll = deg − (±90). Take the branch nearer vertical.
  const roll = deg >= 0 ? deg - 90 : deg + 90;
  return (roll * Math.PI) / 180;
}

/**
 * Estimate the frame's roll angle (radians). Averages the field-axis
 * estimate (hash line, φ via arccos) with the yard-line estimates
 * (each yard line's deviation from vertical). [RECONSTRUCTED averaging —
 * the paper names the two lines but not the combination.]
 */
export function estimateRollAngle(
  yardLines: readonly ImageLine[],
  hashLine: ImageLine | null,
): number {
  const estimates: number[] = [];
  if (hashLine != null) estimates.push(axisLineRollAngle(hashLine));
  for (const yl of yardLines) estimates.push(yardLineRollAngle(yl));
  if (estimates.length === 0) return 0;
  // Circular mean (robust to ±π wrap, though inputs are clustered).
  let sx = 0;
  let sy = 0;
  for (const a of estimates) {
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  return Math.atan2(sy / estimates.length, sx / estimates.length);
}

/**
 * Rotate the frame by −phi radians about its center (bilinear).
 * After deskewFrame(frame, estimateRollAngle(...)), yard lines are
 * near-vertical — the precondition Chung's ±12° angle filters assume.
 */
export function deskewFrame(frame: VideoFrame, phi: number): VideoFrame {
  const { width, height, pixels } = frame;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  // Deskew rotates CONTENT by −phi; so the dest→source resampling map is R(+phi).
  const cosA = Math.cos(phi);
  const sinA = Math.sin(phi);
  const out: number[][] = Array.from({ length: height }, () =>
    new Array(width).fill(0),
  );
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Destination → source (inverse map).
      const dx = x - cx;
      const dy = y - cy;
      const sx = cx + dx * cosA - dy * sinA;
      const sy = cy + dx * sinA + dy * cosA;
      out[y]![x] = bilinear(pixels, width, height, sx, sy);
    }
  }
  return { index: frame.index, t: frame.t, pixels: out, width, height };
}

function bilinear(
  pixels: readonly (readonly number[])[],
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (ix: number, iy: number): number => {
    if (ix < 0 || iy < 0 || ix >= width || iy >= height) return 0;
    return pixels[iy]?.[ix] ?? 0;
  };
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}
