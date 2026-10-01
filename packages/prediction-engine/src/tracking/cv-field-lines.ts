/**
 * cv-field-lines.ts — K5: per-frame yard-scale affine fallback + rotation rectification.
 *
 * When DLT homography landmarks are missing (<4 usable correspondences),
 * don't fail: build an affine pixels→yards map from the per-frame 5-yard
 * line spacing (Sloan 2018: "1 yard ≈ 82 units" derived per screenshot)
 * plus the arccos rotation rectification. MDPI Electronics independently
 * converges ("2D affine suffices for yard-line shifts").
 *
 * Model: a similarity transform. After derotating by −roll, yard lines are
 * vertical; field-x (yards from own goal) comes from the calibrated
 * px/yard scale anchored on a reference yard line; field-y is anchored on
 * the near sideline when detected, else the hash row, else left relative.
 *
 * Field-y convention matches cv-template.ts: 0 at the near sideline,
 * increasing across the field width (toward image top for a standard
 * broadcast view with the near sideline at the bottom).
 *
 * Also implements Sloan's frame-1 anchor drift correction: the image
 * coordinate of the highest point of a full-field white line in the first
 * frame is the reference; later frames' points are shifted by the anchor
 * delta so camera-follow pan doesn't inflate distances. This is the cheap
 * fallback when dense camera-motion compensation is unreliable.
 */

import {
  calibrateYardScale,
  type ImageLine,
  type LabeledYardLine,
} from "./cv-field-landmarks.js";
import { estimateRollAngle } from "./cv-rotation-deskew.js";

export interface AffineFieldMap {
  /** Linear part: [xYd, yYd]^T = A [xPx, yPx]^T + t. */
  readonly a11: number;
  readonly a12: number;
  readonly a21: number;
  readonly a22: number;
  /** Translation, in yards. */
  readonly tx: number;
  readonly ty: number;
  /** Calibrated pixels-per-yard for this frame. */
  readonly pxPerYard: number;
  /** Estimated content roll, radians (clockwise-positive, y-down). */
  readonly rollRad: number;
  /** +1 if field-x increases with derotated image-x, else −1. */
  readonly fieldDirection: 1 | -1;
  /** How field-y=0 was anchored. */
  readonly lateralAnchor: "sideline" | "hash" | "unanchored";
}

export interface AffineFieldMapInput {
  /** Yard lines with LOS-anchored labels (≥1). */
  readonly yardLines: readonly LabeledYardLine[];
  /** Field-axis (hash-mark direction) line, if detected. */
  readonly hashLine?: ImageLine | null;
  /** Near-sideline boundary line, if detected. */
  readonly sideline?: ImageLine | null;
}

function midpoint(l: ImageLine): { x: number; y: number } {
  return { x: (l.p1.x + l.p2.x) / 2, y: (l.p1.y + l.p2.y) / 2 };
}

/**
 * Build the affine pixels→yards map. Returns null when there are no
 * yard lines to calibrate from.
 */
export function buildAffineFieldMap(
  input: AffineFieldMapInput,
): AffineFieldMap | null {
  const { yardLines } = input;
  if (yardLines.length === 0) return null;

  const hashLine = input.hashLine ?? null;
  const sideline = input.sideline ?? null;

  // LabeledYardLine wraps the geometry; pair each label with its line.
  const pairs = yardLines.map((l) => ({ line: l.line, yards: l.yardsFromOwnGoal }));

  const rollRad = estimateRollAngle(
    pairs.map((p) => p.line),
    hashLine,
  );
  const pxPerYard = calibrateYardScale(pairs.map((p) => p.line));

  const cosR = Math.cos(rollRad);
  const sinR = Math.sin(rollRad);
  // Derotation R(−roll), y-down clockwise-positive:
  //   x' = x cosR + y sinR ;  y' = −x sinR + y cosR.
  const derot = (p: { x: number; y: number }) => ({
    x: p.x * cosR + p.y * sinR,
    y: -p.x * sinR + p.y * cosR,
  });

  // Field direction: least-squares slope of yard value vs derotated x'.
  let fieldDirection: 1 | -1 = 1;
  if (pairs.length >= 2) {
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of pairs) {
      const xp = derot(midpoint(p.line)).x;
      sx += xp; sy += p.yards;
      sxx += xp * xp; sxy += xp * p.yards;
    }
    const n = pairs.length;
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) > 1e-9) {
      const slope = (n * sxy - sx * sy) / denom;
      fieldDirection = slope >= 0 ? 1 : -1;
    }
  }

  // Reference yard line: median derotated-x (robust central anchor).
  const sorted = [...pairs].sort(
    (a, b) => derot(midpoint(a.line)).x - derot(midpoint(b.line)).x,
  );
  const ref = sorted[Math.floor(sorted.length / 2)]!;
  const refMid = derot(midpoint(ref.line));
  const s = fieldDirection;
  const tx = ref.yards - (s * refMid.x) / pxPerYard;

  // Lateral anchor: sideline > hash > unanchored. yYd = 0 at the anchor,
  // increasing toward image top (template convention).
  let lateralAnchor: AffineFieldMap["lateralAnchor"] = "unanchored";
  let yRefPrime = 0;
  if (sideline != null) {
    yRefPrime = derot(midpoint(sideline)).y;
    lateralAnchor = "sideline";
  } else if (hashLine != null) {
    yRefPrime = derot(midpoint(hashLine)).y;
    lateralAnchor = "hash";
  }
  const ty = yRefPrime / pxPerYard;

  // A = S · R(−roll), S = diag(s/pxPerYard, −1/pxPerYard).
  // (The −1 on y maps y-down image coords to template's upward yM.)
  return {
    a11: (s * cosR) / pxPerYard,
    a12: (s * sinR) / pxPerYard,
    a21: -sinR / pxPerYard,
    a22: -cosR / pxPerYard,
    tx,
    ty,
    pxPerYard,
    rollRad,
    fieldDirection,
    lateralAnchor,
  };
}

/** Apply the map: pixels → {xYd (yards from own goal), yYd}. */
export function applyAffineFieldMap(
  map: AffineFieldMap,
  xPx: number,
  yPx: number,
): { xYd: number; yYd: number } {
  return {
    xYd: map.a11 * xPx + map.a12 * yPx + map.tx,
    yYd: map.a21 * xPx + map.a22 * yPx + map.ty,
  };
}

/** Invert the map: yards → pixels (for reprojection checks). */
export function invertAffineFieldMap(map: AffineFieldMap): {
  b11: number; b12: number; b21: number; b22: number; sx: number; sy: number;
} {
  const det = map.a11 * map.a22 - map.a12 * map.a21;
  if (Math.abs(det) < 1e-12) throw new Error("invertAffineFieldMap: singular map");
  const b11 = map.a22 / det;
  const b12 = -map.a12 / det;
  const b21 = -map.a21 / det;
  const b22 = map.a11 / det;
  return {
    b11, b12, b21, b22,
    sx: -(b11 * map.tx + b12 * map.ty),
    sy: -(b21 * map.tx + b22 * map.ty),
  };
}

// ---------------------------------------------------------------------------
// Frame-1 anchor drift correction (Sloan).
// ---------------------------------------------------------------------------

export interface FrameAnchor {
  readonly x: number;
  readonly y: number;
}

/**
 * The anchor for a frame: highest (min-y) point of the longest detected
 * yard line. Returns null when no yard lines were detected.
 */
export function topAnchorPoint(
  yardLines: readonly ImageLine[],
): FrameAnchor | null {
  if (yardLines.length === 0) return null;
  let best = yardLines[0]!;
  let bestLen = -1;
  for (const l of yardLines) {
    const len = Math.hypot(l.p2.x - l.p1.x, l.p2.y - l.p1.y);
    if (len > bestLen) {
      bestLen = len;
      best = l;
    }
  }
  const top = best.p1.y <= best.p2.y ? best.p1 : best.p2;
  return { x: top.x, y: top.y };
}

/**
 * Shift every frame's points by −(anchor[i] − anchor[0]) so a panning
 * camera doesn't inflate/deflate inter-frame distances. Frames with a
 * null anchor are left unshifted (no information). Pure function.
 */
export function anchorDriftCorrection(
  frames: readonly (readonly { xPx: number; yPx: number }[])[],
  anchors: readonly (FrameAnchor | null)[],
): { xPx: number; yPx: number }[][] {
  const ref = anchors[0] ?? null;
  return frames.map((pts, i) => {
    const a = anchors[i] ?? null;
    if (ref == null || a == null) return pts.map((p) => ({ ...p }));
    const dx = a.x - ref.x;
    const dy = a.y - ref.y;
    return pts.map((p) => ({ xPx: p.xPx - dx, yPx: p.yPx - dy }));
  });
}
