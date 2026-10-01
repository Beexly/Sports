import { describe, expect, it } from "vitest";
import { runMovementPipeline } from "./cv-pipeline.js";
import {
  FixtureDetector,
  playerDetection,
  type VideoFrame,
} from "./cv-detector-contract.js";
import type { Homography } from "./cv-movement-primitive.js";

/**
 * End-to-end: two scripted players glide across 6 static frames at 10 fps.
 * Homography is a pure 10px = 1m scale, so expected meters are exact.
 *
 * Player A: x = 10 + 2k (foot x = 14 + 2k), 2px/frame → 0.2 m/frame.
 * Player B: x = 40 − 2k (foot x = 44 − 2k), same speed, separate row.
 * 5 intervals × 0.2 m = 1.0 m distance; 0.2 m / 0.1 s = 2.0 m/s.
 */
function buildFrames(): VideoFrame[] {
  const frames: VideoFrame[] = [];
  for (let k = 0; k < 6; k++) {
    const pixels: number[][] = [];
    for (let y = 0; y < 40; y++) {
      const row: number[] = [];
      for (let x = 0; x < 64; x++) row.push((x * 3 + y * 7) % 256);
      pixels.push(row);
    }
    frames.push({ index: k, t: k * 0.1, pixels, width: 64, height: 40 });
  }
  return frames;
}

const SCALE_H: Homography = {
  h11: 0.1, h12: 0, h13: 0,
  h21: 0, h22: 0.1, h23: 0,
  h31: 0, h32: 0, h33: 1,
};

describe("cv-pipeline (end-to-end, fixture frames)", () => {
  it("detects → associates → compensates → maps → measures, with exact meters", () => {
    const script = [0, 1, 2, 3, 4, 5].map((k) => [
      playerDetection(10 + 2 * k, 8, 8, 12, "KC"),
      playerDetection(40 - 2 * k, 24, 8, 12, "PHI"),
    ]);
    const out = runMovementPipeline({
      frames: buildFrames(),
      detector: new FixtureDetector(script),
      homography: SCALE_H,
    });

    // Detection + association.
    expect(out.detectionsPerFrame).toEqual([2, 2, 2, 2, 2, 2]);
    expect(out.tracklets).toHaveLength(2);
    for (const t of out.tracklets) {
      expect(t.frames).toHaveLength(6);
      // World coordinates were filled (not left null).
      for (const f of t.frames) {
        expect(f.xM).not.toBeNull();
        expect(f.yM).not.toBeNull();
      }
    }

    // Static camera → zero motion everywhere.
    for (const m of out.cameraMotion) {
      expect(m.dx).toBe(0);
      expect(m.dy).toBe(0);
    }

    // Metrics: 1.0 m traveled, 2.0 m/s top and average.
    expect(out.metrics).toHaveLength(2);
    for (const met of out.metrics) {
      expect(met.distanceM).toBeCloseTo(1.0, 2);
      expect(met.topSpeedMs).toBeCloseTo(2.0, 2);
      expect(met.avgSpeedMs).toBeCloseTo(2.0, 2);
    }
  });

  it("identities hold: KC moves right, PHI moves left", () => {
    const script = [0, 1, 2, 3, 4, 5].map((k) => [
      playerDetection(10 + 2 * k, 8, 8, 12, "KC"),
      playerDetection(40 - 2 * k, 24, 8, 12, "PHI"),
    ]);
    const out = runMovementPipeline({
      frames: buildFrames(),
      detector: new FixtureDetector(script),
      homography: SCALE_H,
    });
    const kc = out.tracklets.find((t) => t.team === "KC");
    const phi = out.tracklets.find((t) => t.team === "PHI");
    expect(kc).toBeDefined();
    expect(phi).toBeDefined();
    const kcFirst = kc?.frames[0]?.xM ?? 0;
    const kcLast = kc?.frames[5]?.xM ?? 0;
    const phiFirst = phi?.frames[0]?.xM ?? 0;
    const phiLast = phi?.frames[5]?.xM ?? 0;
    expect(kcLast).toBeGreaterThan(kcFirst);
    expect(phiLast).toBeLessThan(phiFirst);
    // KC starts at foot x = 14px → 1.4 m.
    expect(kcFirst).toBeCloseTo(1.4, 6);
  });

  it("rejects an empty frame list instead of returning empty metrics", () => {
    expect(() =>
      runMovementPipeline({
        frames: [],
        detector: new FixtureDetector([]),
        homography: SCALE_H,
      }),
    ).toThrow(/at least one frame/);
  });
});
