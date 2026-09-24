import { describe, expect, it } from "vitest";
import {
  combineQuantiles,
  fitCqraWeights,
  meanPinball,
  pinballLoss,
  retainedModels,
} from "./cqra-t";

describe("cqra-t", () => {
  it("pinballLoss is minimized at the true quantile", () => {
    // y ~ U[0,10]; the 0.7 quantile is 7
    let s = 47;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const ys = Array.from({ length: 5000 }, () => rng() * 10);
    const lossAt = (q: number): number => ys.reduce((a, y) => a + pinballLoss(y, q, 0.7), 0);
    expect(lossAt(7)).toBeLessThan(lossAt(5));
    expect(lossAt(7)).toBeLessThan(lossAt(9));
    expect(() => pinballLoss(1, 1, 0)).toThrow();
  });

  it("fitCqraWeights favors the better model per quantile", () => {
    // Model 0 nails the median; model 1 nails the tails.
    let s = 53;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const levels = [0.1, 0.5, 0.9];
    const n = 400;
    const actuals = Array.from({ length: n }, () => (rng() - 0.5) * 20);
    const forecasts = levels.map((lv) =>
      actuals.map((y) => {
        const noise0 = (rng() - 0.5) * (lv === 0.5 ? 1 : 8);
        const noise1 = (rng() - 0.5) * (lv === 0.5 ? 8 : 1);
        return [y + noise0, y + noise1];
      }),
    );
    const W = fitCqraWeights(forecasts, actuals, levels, 0.05, 400, 0.5);
    for (const w of W) {
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      expect(w.every((x) => x >= 0)).toBe(true);
    }
    expect(W[1]![0]).toBeGreaterThan(W[1]![1] ?? 0); // median -> model 0
    expect(W[0]![1]).toBeGreaterThan(W[0]![0] ?? 0); // tail -> model 1
  });

  it("combineQuantiles rearranges away crossings", () => {
    const out = combineQuantiles(
      [
        [5, 5],
        [3, 3], // crossed: q0.5 < q0.1
        [9, 9],
      ],
      [
        [0.5, 0.5],
        [0.5, 0.5],
        [0.5, 0.5],
      ],
    );
    expect(out).toEqual([3, 5, 9]);
  });

  it("combined beats the best single model on pinball (gate smoke test)", () => {
    let s = 59;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const levels = [0.25, 0.5, 0.75];
    const n = 300;
    const actuals = Array.from({ length: n }, () => (rng() - 0.5) * 20);
    const forecasts = levels.map((lv) =>
      actuals.map((y) => [y + (rng() - 0.5) * 6, y + (rng() - 0.5) * 2]),
    );
    const W = fitCqraWeights(forecasts, actuals, levels, 0.05, 300, 0.5);
    const combined = actuals.map((_, i) =>
      combineQuantiles(
        levels.map((_, q) => forecasts[q]?.[i] ?? []),
        W,
      ),
    );
    const single0 = actuals.map((_, i) => levels.map((_, q) => forecasts[q]?.[i]?.[0] ?? 0));
    const single1 = actuals.map((_, i) => levels.map((_, q) => forecasts[q]?.[i]?.[1] ?? 0));
    const avg = actuals.map((_, i) =>
      levels.map((_, q) => ((forecasts[q]?.[i]?.[0] ?? 0) + (forecasts[q]?.[i]?.[1] ?? 0)) / 2),
    );
    const mp = meanPinball(actuals, combined, levels);
    expect(mp).toBeLessThanOrEqual(
      Math.min(meanPinball(actuals, single0, levels), meanPinball(actuals, single1, levels)) + 1e-9,
    );
    expect(mp).toBeLessThanOrEqual(meanPinball(actuals, avg, levels) + 1e-9);
    expect(() => meanPinball([1], [[1]], levels)).toThrow("mismatch");
  });

  it("retainedModels prunes near-zero weights", () => {
    expect(retainedModels([[0.9, 0.1, 0.0001]])).toEqual([[0, 1]]);
  });

  it("rejects empty input", () => {
    expect(() => fitCqraWeights([], [1], [0.5])).toThrow("empty");
  });
});
