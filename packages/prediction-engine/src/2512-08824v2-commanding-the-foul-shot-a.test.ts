/**
 * Vitest suite for arXiv:2512.08824v2 (Commanding the Foul Shot: A New Ensemble of Free Throw Metrics).
 * Gate: Adopt if first-half kicker command predicts second-half distance-adjusted FG% with significantly higher correlation than first-half raw FG% (p<0.05, paired bootstrap), OR if command identifies >=3 kickers/year whose raw FG% misstates true skill by >5pp.
 */
import { describe, it, expect } from "vitest";
import { meanPixelError, smoothTrajectory, detectPossessionEvents } from "./2512-08824v2-commanding-the-foul-shot-a";

describe("2512-08824v2 Hawk-Eye ball tracking", () => {
  it("mean pixel error measures localization accuracy", () => {
    const truth = new Map([[0, { x: 10, y: 10 }], [1, { x: 12, y: 11 }]]);
    const preds = [
      { frame: 0, x: 11, y: 10, conf: 0.9 },
      { frame: 1, x: 12, y: 12, conf: 0.9 },
    ];
    expect(meanPixelError(preds, truth)).toBeCloseTo(1, 10);
    expect(() => meanPixelError(preds, new Map())).toThrow();
  });
  it("smoothing gates teleport detections", () => {
    const dets = [
      { frame: 0, x: 10, y: 10, conf: 0.9 },
      { frame: 1, x: 11, y: 10, conf: 0.9 },
      { frame: 2, x: 500, y: 500, conf: 0.9 }, // teleport
      { frame: 3, x: 12, y: 10, conf: 0.9 },
    ];
    const sm = smoothTrajectory(dets, 2, 50);
    expect(sm.length).toBeLessThan(dets.length);
    expect(sm.every((d) => d.x < 100)).toBe(true);
    expect(() => smoothTrajectory(dets, 0, 50)).toThrow();
  });
  it("detects possession events at low speed near a player", () => {
    const traj = [
      { frame: 0, x: 0, y: 0, conf: 0.9 },
      { frame: 1, x: 20, y: 0, conf: 0.9 },
      { frame: 2, x: 21, y: 0, conf: 0.9 },
      { frame: 3, x: 21.5, y: 0, conf: 0.9 },
    ];
    const ev = detectPossessionEvents(traj, (f) => (f >= 2 ? { x: 21, y: 0 } : null), 5, 3);
    expect(ev.length).toBeGreaterThan(0);
  });
});
