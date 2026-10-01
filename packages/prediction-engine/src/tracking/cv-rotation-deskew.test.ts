import { describe, expect, it } from "vitest";
import {
  axisLineRollAngle,
  deskewFrame,
  estimateRollAngle,
  yardLineRollAngle,
} from "./cv-rotation-deskew.js";
import {
  detectHashMarkLine,
  detectYardLines,
  lineDirectionDeg,
  type ImageLine,
} from "./cv-field-landmarks.js";
import type { VideoFrame } from "./cv-detector-contract.js";

const W = 320;
const H = 200;
const DEG = Math.PI / 180;

/** Axis-aligned synthetic field: 6 vertical yard lines + horizontal hash ticks. */
function renderUpright(): VideoFrame {
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(60),
  );
  for (const lx of [40, 90, 140, 190, 240, 290]) {
    for (let y = 20; y < 180; y++) {
      for (let x = lx - 1; x <= lx + 1; x++) pixels[y]![x] = 255;
    }
  }
  for (let x = 20; x < 300; x += 14) {
    for (let y = 99; y <= 101; y++) {
      for (let dx = 0; dx < 6; dx++) pixels[y]![x + dx] = 255;
    }
  }
  return { index: 0, t: 0, pixels, width: W, height: H };
}

/** Rotate CONTENT by +a radians (clockwise, y-down) = deskewFrame(frame, −a). */
function rotateContent(frame: VideoFrame, a: number): VideoFrame {
  return deskewFrame(frame, -a);
}

function distToVertical(line: ImageLine): number {
  const d = lineDirectionDeg(line);
  return Math.abs(d - 90);
}

describe("cv-rotation-deskew (Sloan arccos)", () => {
  it("recovers a 12° roll within 0.5°; deskewed yard lines within ±2° of vertical", () => {
    const upright = renderUpright();
    const rotated = rotateContent(upright, 12 * DEG);

    // Tilted lines smear Hough votes across 1° theta bins; the deskew
    // stage uses a lower vote fraction (Sloan's preconditioner needs the
    // line SET, not Chung's strict landmarks).
    const opts = { angleToleranceDeg: 15, houghVoteFraction: 0.2 };
    const yardLines = detectYardLines(rotated, opts);
    const hashLine = detectHashMarkLine(rotated, opts);
    expect(yardLines.length).toBeGreaterThanOrEqual(4);
    expect(hashLine).not.toBeNull();

    const phi = estimateRollAngle(yardLines, hashLine);
    expect(Math.abs(phi / DEG - 12)).toBeLessThan(0.5);

    const deskewed = deskewFrame(rotated, phi);
    const straight = detectYardLines(deskewed);
    expect(straight.length).toBeGreaterThanOrEqual(4);
    for (const yl of straight) {
      expect(distToVertical(yl)).toBeLessThan(2);
    }
  });

  it("sign convention: counterclockwise content tilt gives negative φ", () => {
    const upright = renderUpright();
    const rotated = rotateContent(upright, -7 * DEG);
    const opts = { angleToleranceDeg: 15, houghVoteFraction: 0.2 };
    const yardLines = detectYardLines(rotated, opts);
    const hashLine = detectHashMarkLine(rotated, opts);
    expect(yardLines.length).toBeGreaterThanOrEqual(4);
    const phi = estimateRollAngle(yardLines, hashLine);
    expect(Math.abs(phi / DEG + 7)).toBeLessThan(0.5);
    // Round-trip: deskewing by the estimate restores vertical.
    const back = deskewFrame(rotated, phi);
    for (const yl of detectYardLines(back)) {
      expect(distToVertical(yl)).toBeLessThan(2);
    }
  });

  it("unit: axisLineRollAngle and yardLineRollAngle agree on a synthetic pair", () => {
    const a = 12 * DEG;
    // Hash line tilted +12° (clockwise, y-down).
    const hash: ImageLine = {
      rho: 0,
      theta: Math.PI / 2,
      p1: { x: 0, y: 0 },
      p2: { x: Math.cos(a) * 100, y: Math.sin(a) * 100 },
    };
    // Yard line tilted +12° from vertical.
    const yard: ImageLine = {
      rho: 0,
      theta: 0,
      p1: { x: 0, y: 0 },
      p2: { x: -Math.sin(a) * 100, y: Math.cos(a) * 100 },
    };
    expect(Math.abs(axisLineRollAngle(hash) / DEG - 12)).toBeLessThan(1e-9);
    expect(Math.abs(yardLineRollAngle(yard) / DEG - 12)).toBeLessThan(1e-9);
    expect(Math.abs(estimateRollAngle([yard], hash) / DEG - 12)).toBeLessThan(1e-9);
  });

  it("no lines → 0 (identity deskew), never throws", () => {
    expect(estimateRollAngle([], null)).toBe(0);
    const f = renderUpright();
    const out = deskewFrame(f, 0);
    expect(out.pixels[100]?.[100]).toBe(f.pixels[100]?.[100]);
  });
});
