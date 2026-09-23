import { describe, expect, it } from "vitest";

import {
  ignorancePerGame,
  meanIgnorance,
  meetsAdoptionGate,
  probabilityMultiplier,
  relativeIgnoranceBits,
  resamplingInterval,
} from "@/lib/calibration/1908-08980v1-ignorance-score-selection";

describe("ignorance-score variant selection", () => {
  it("perfect forecasts score 0 bits, coin flip scores 1 bit", () => {
    expect(meanIgnorance([1, 0, 1], [1, 0, 1])).toBeCloseTo(0, 9);
    expect(meanIgnorance([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0])).toBeCloseTo(1, 10);
  });

  it("relative ignorance is positive when the challenger is better", () => {
    const ys = [1, 1, 0, 0, 1, 0, 1, 0];
    const inc = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const ch = [0.9, 0.8, 0.2, 0.1, 0.85, 0.15, 0.9, 0.2];
    const delta = relativeIgnoranceBits(inc, ch, ys);
    expect(delta).toBeGreaterThan(0.05);
    expect(probabilityMultiplier(delta)).toBeGreaterThan(Math.pow(2, 0.05));
    expect(probabilityMultiplier(0.05)).toBeCloseTo(1.035, 3);
  });

  it("resampling interval excludes zero for a clearly better challenger", () => {
    const ys = Array.from({ length: 400 }, (_, i) => i % 2);
    const inc = ys.map(() => 0.5);
    const ch = ys.map((y) => (y === 1 ? 0.8 : 0.2));
    const diff = inc.map((p, i) => ignorancePerGame(p, ys[i]) - ignorancePerGame(ch[i], ys[i]));
    const { lo, hi } = resamplingInterval(diff, 500, 3);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(0);
  });

  it("adoption gate fires only at >= 0.05 bits with significance", () => {
    const ys = Array.from({ length: 400 }, (_, i) => i % 2);
    const inc = ys.map(() => 0.5);
    const ch = ys.map((y) => (y === 1 ? 0.8 : 0.2));
    const res = meetsAdoptionGate(inc, ch, ys);
    expect(res.deltaBits).toBeGreaterThan(0.05);
    expect(res.adopt).toBe(true);
    const tiny = meetsAdoptionGate(inc, ys.map(() => 0.51), ys);
    expect(tiny.adopt).toBe(false);
  });
});
