/**
 * Vitest suite for arXiv:2408.14837v2 (Diffusion Models Are Real-Time Game Engines).
 * Gate: ADOPT conditioning noise augmentation as a mandatory training stabilizer for ALL GSE autoregressive simulators if it flattens the 64-play divergence curve by ≥30% vs baseline on 2024 held-out games.
 */
import { describe, it, expect } from "vitest";
import { augmentConditioning, divergenceCurve, divergenceImprovement, ENABLED } from "./2408-14837v2-diffusion-models-are-realtime-game";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2408-14837v2 noise-augmented simulator stabilizer (disabled)", () => {
  it("injects noise into both conditioning levels", () => {
    const rng = lcg(11);
    const s = { playWindow: [1, 2, 3], driveSummary: [0.5] };
    const a = augmentConditioning(s, 0.1, rng);
    expect(a.playWindow).not.toEqual(s.playWindow);
    expect(a.driveSummary).not.toEqual(s.driveSummary);
    const b = augmentConditioning(s, 0, rng);
    expect(b.playWindow).toEqual(s.playWindow);
  });
  it("measures curve flattening", () => {
    const sim = [[0.1], [0.2], [0.35]];
    const ref = [[0], [0], [0]];
    expect(divergenceCurve(sim, ref)).toEqual([0.1, 0.2, 0.35]);
    expect(divergenceImprovement([0.2, 0.3], [0.4, 0.6])).toBeCloseTo(0.5, 10);
    expect(() => divergenceCurve([[1]], [[1], [2]])).toThrow();
  });
  it("is disabled pending simulator weights", () => {
    expect(ENABLED).toBe(false);
  });
});
