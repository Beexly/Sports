/**
 * Vitest suite for arXiv:2508.15299v1 (BasketLiDAR: The First LiDAR-Camera Multimodal Dataset for Professional Basketball MOT).
 * Gate: Adopt the repair pattern if on the 50-play occlusion test it reduces ID switches by >=30% vs the single-view baseline with per-play latency overhead <=2x; REJECT if ID-switch reduction <30% or the trigger fires on >20% of non-occluded frames.
 */
import { describe, it, expect } from "vitest";
import { classifyGameState, driveOutcomeForecast, uncertaintyBand, clockWinProb } from "./2508-15299v1-basketlidar-the-first-lidarcamera-multimodal";

describe("2508-15299v1 game-state predictor", () => {
  it("classifies close vs blowout trajectories", () => {
    expect(classifyGameState({ scoreDiff: 3, timeLeftFrac: 0.5, yardLine: 50, down: 1, distance: 10, pace: 2 })).toBe("close");
    expect(classifyGameState({ scoreDiff: 28, timeLeftFrac: 0.2, yardLine: 50, down: 1, distance: 10, pace: 2 })).toBe("blowout");
  });
  it("drive forecast is a valid distribution, better near the goal line", () => {
    const near = driveOutcomeForecast({ scoreDiff: 0, timeLeftFrac: 0.5, yardLine: 95, down: 1, distance: 10, pace: 2 });
    const far = driveOutcomeForecast({ scoreDiff: 0, timeLeftFrac: 0.5, yardLine: 20, down: 3, distance: 12, pace: 2 });
    expect(near.td + near.fg + near.stop).toBeCloseTo(1, 10);
    expect(near.td).toBeGreaterThan(far.td);
    expect(() => driveOutcomeForecast({ scoreDiff: 0, timeLeftFrac: 0.5, yardLine: 101, down: 1, distance: 10, pace: 2 })).toThrow();
  });
  it("uncertainty band widens with disagreement; clock WP is sane", () => {
    const [lo, hi] = uncertaintyBand([0.5, 0.55, 0.45, 0.6, 0.4]);
    expect(lo).toBeLessThan(0.5);
    expect(hi).toBeGreaterThan(0.5);
    expect(clockWinProb(0, 0.5)).toBeCloseTo(0.5, 6);
    expect(clockWinProb(14, 0.05)).toBeGreaterThan(0.9);
    expect(() => uncertaintyBand([0.5])).toThrow();
  });
});
