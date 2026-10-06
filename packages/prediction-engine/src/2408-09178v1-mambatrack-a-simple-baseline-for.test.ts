/**
 * Vitest suite for arXiv:2408.09178v1 (MambaTrack: A Simple Baseline for Multiple Object Tracking with State Space Model).
 * Gate: ADAPT if MTP (or its per-role variant) beats the Kalman baseline by ≥15% mean displacement error on held-out NFL tracking frames AND inference stays <50 ms/frame on GSE hardware; otherwise REJECT (Kalman remains the cheaper choice).
 */
import { describe, it, expect } from "vitest";
import { ssmPredict, kalmanPredict, meanDisplacementError } from "./2408-09178v1-mambatrack-a-simple-baseline-for";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2408-09178v1 per-role hierarchical trajectory predictor", () => {
  const hist = [
    { x: 0, y: 0, t: 0 }, { x: 1, y: 0.1, t: 0.1 }, { x: 2, y: 0.2, t: 0.2 },
    { x: 3, y: 0.3, t: 0.3 }, { x: 4, y: 0.4, t: 0.4 },
  ];
  it("extrapolates constant velocity without interaction", () => {
    const p = ssmPredict(hist, 1.0, { role: "WR", sigma: 0.2, interaction: 0 });
    expect(p.x).toBeCloseTo(14, 8);
    expect(p.y).toBeCloseTo(1.4, 8);
  });
  it("interaction term repels from the nearest opponent", () => {
    const opp = [{ x: 13, y: 1.4, t: 0.4 }];
    const o = opp[0]!;
    const base = ssmPredict(hist, 1.0, { role: "WR", sigma: 0.2, interaction: 0 });
    const pushed = ssmPredict(hist, 1.0, { role: "WR", sigma: 0.2, interaction: 2 }, opp);
    expect(Math.hypot(pushed.x - o.x, pushed.y - o.y))
      .toBeGreaterThan(Math.hypot(base.x - o.x, base.y - o.y));
  });
  it("MDE evaluator ranks the role-aware predictor vs the Kalman baseline", () => {
    const rng = lcg(7);
    const frames = Array.from({ length: 60 }, (_, k) => {
      const x0 = k * 0.5;
      const h = [0, 1, 2, 3, 4].map((j) => ({ x: x0 + j, y: 0.1 * j, t: j * 0.1 }));
      return { history: h, truth: { x: x0 + 14 + (rng() - 0.5) * 0.2, y: 1.4 } };
    });
    const role = { role: "WR", sigma: 0.2, interaction: 0 };
    const mdeRole = meanDisplacementError(frames, (h) => ssmPredict(h, 1.0, role));
    const mdeKal = meanDisplacementError(frames, (h) => kalmanPredict(h, 1.0));
    expect(mdeRole).toBeCloseTo(mdeKal, 6);
    expect(mdeRole).toBeGreaterThanOrEqual(0);
    expect(() => meanDisplacementError([], (h) => kalmanPredict(h, 1))).toThrow();
  });
});
