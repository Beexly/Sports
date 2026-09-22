/**
 * Tests for ./kick-trajectory-grading (arXiv:1608.03793v2, lane=tracking).
 *
 * ACCEPTANCE GATE: ADOPT the LSTM trajectory model for GSE kick-quality grading IF it beats the tuned GBM baseline
 * by >=0.03 AUC on the 2024 holdout season AND beats the distance-only model by >=0.05 AUC.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./kick-trajectory-grading";

describe("kick trajectory grading (arXiv:1608.03793v2)", () => {
  const frames = [
    { x: 0, y: 0, z: 1, gameClock: 100 },
    { x: 1, y: 0.5, z: 5, gameClock: 99.9 },
    { x: 2, y: 1, z: 12, gameClock: 99.8 },
    { x: 3, y: 1.5, z: 10, gameClock: 99.7 },
  ];
  it("validates and extracts last-frame features", () => {
    const v = mod.validateFrames(frames)!;
    expect(v).toHaveLength(4);
    const lf = mod.lastFrameFeatures(v)!;
    expect(lf.apexZ).toBe(12);
    expect(lf.x).toBe(3);
  });
  it("trajectory features", () => {
    const t = mod.trajectoryFeatures(mod.validateFrames(frames)!)!;
    expect(t.n).toBe(4);
    expect(t.durationS).toBeCloseTo(0.3, 10);
    expect(t.meanSpeed).toBeGreaterThan(0);
    expect(t.zGain).toBe(11);
  });
  it("sliceToApex cuts 0.5s before apex", () => {
    const v = mod.validateFrames(frames)!;
    const s = mod.sliceToApex(v, 0.5);
    expect(s.length).toBeLessThan(v.length);
    expect(s.length).toBeGreaterThan(0);
  });
  it("null on malformed / empty", () => {
    expect(mod.validateFrames([])).toBeNull();
    expect(mod.validateFrames([{ x: 1 }])).toBeNull();
    expect(mod.trajectoryFeatures(mod.validateFrames([frames[0]])!)).toBeNull();
    expect(mod.sliceToApex([])).toEqual([]);
  });
});
