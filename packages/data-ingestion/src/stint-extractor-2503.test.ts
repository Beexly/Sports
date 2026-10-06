import { describe, expect, it } from "vitest";
import {
  extractStints,
  mmdSquared,
  simToRealGap,
  type TrackingFrame,
} from "./stint-extractor-2503.js";

function frame(playId: string, frameId: number, ts: number, speeds: number[]): TrackingFrame {
  return {
    frameId,
    gameId: "g1",
    playId,
    timestamp: ts,
    players: speeds.map((s, i) => ({
      playerId: `p${i}`,
      team: i % 2 === 0 ? "offense" : "defense",
      x: i * 2,
      y: i,
      speed: s,
      direction: 0,
    })),
  };
}

describe("stint extractor", () => {
  it("groups frames into per-play stints with summaries", () => {
    const frames = [
      frame("play1", 0, 0.0, [5, 6]),
      frame("play1", 1, 0.1, [7, 8]),
      frame("play2", 2, 0.0, [1, 1]),
    ];
    const stints = extractStints(frames);
    expect(stints.length).toBe(2);
    const s1 = stints.find((s) => s.playId === "play1");
    expect(s1?.frameCount).toBe(2);
    expect(s1?.durationS).toBeCloseTo(0.1);
    expect(s1?.maxSpeed).toBe(8);
    expect(s1?.meanSpeeds.length).toBe(2);
  });

  it("mmd is ~0 for identical distributions and >0 for shifted ones", () => {
    const xs = [[1], [2], [3], [2], [1]];
    expect(mmdSquared(xs, xs.map((v) => [...v]))).toBeLessThan(1e-9);
    const ys = [[10], [11], [12], [11], [10]];
    expect(mmdSquared(xs, ys)).toBeGreaterThan(0.05);
  });

  it("sim-to-real gap distinguishes matching vs mismatched sims", () => {
    const real = extractStints([frame("p1", 0, 0, [5, 6]), frame("p1", 1, 0.1, [6, 7])]);
    const sameSim = extractStints([frame("p1", 0, 0, [5, 6]), frame("p1", 1, 0.1, [6, 7])]);
    const badSim = extractStints([frame("p1", 0, 0, [25, 26]), frame("p1", 1, 0.1, [26, 27])]);
    const good = simToRealGap(real, sameSim);
    const bad = simToRealGap(real, badSim);
    expect(good.transferabilityScore).toBeLessThan(bad.transferabilityScore);
  });

  it("handles empty input", () => {
    expect(extractStints([])).toEqual([]);
    expect(Number.isNaN(mmdSquared([], [[1]]))).toBe(true);
    const gap = simToRealGap([], []);
    expect(Number.isNaN(gap.transferabilityScore)).toBe(true);
  });

  it("skips malformed observations without crashing", () => {
    const frames: TrackingFrame[] = [
      {
        frameId: 0,
        gameId: "g",
        playId: "p",
        timestamp: 0,
        players: [
          { playerId: "a", team: "offense", x: NaN, y: 0, speed: NaN, direction: 0 },
          { playerId: "b", team: "defense", x: 1, y: 1, speed: 5, direction: 0 },
        ],
      },
    ];
    const stints = extractStints(frames);
    expect(stints.length).toBe(1);
    expect(stints[0]?.meanSpeeds).toEqual([5]);
  });
});
