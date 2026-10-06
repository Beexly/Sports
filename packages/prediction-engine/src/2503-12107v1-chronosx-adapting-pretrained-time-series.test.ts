/**
 * Vitest suite for arXiv:2503.12107v1 (ChronosX: Adapting Pretrained Time Series Models with Exogenous Variables).
 * Gate: ADOPT into the engine if adapters beat the covariate-free fine-tuned backbone by ≥0.01 WQL on 2022–2024 AND the ablation (adapters with shuffled covariates) shows no gain; keep the frozen backbone + adapters (don't full-FT) if adapter-only is within 0.005 WQL of full-FT.
 */
import { describe, it, expect } from "vitest";
import { adapterForecast, lateNewsUpdate, ENABLED } from "./2503-12107v1-chronosx-adapting-pretrained-time-series";

describe("2503-12107v1 frozen-backbone adapters (disabled)", () => {
  const backbone = (h: readonly number[]) => h[h.length - 1] ?? 0;
  const adapter = { gain: 0.5, weights: [2, -1] };
  it("adds the adapter correction without touching the backbone", () => {
    expect(adapterForecast(backbone, adapter, [1, 2, 3], [1, 1])).toBeCloseTo(3 + 0.5, 10);
    expect(() => adapterForecast(backbone, adapter, [1], [1])).toThrow();
  });
  it("late-news update only fires inside 60 minutes", () => {
    const r1 = lateNewsUpdate(backbone, adapter, [3], [0, 0], [1, 0], 30);
    expect(r1.applied).toBe(true);
    expect(r1.delta).toBeCloseTo(1.0, 10);
    const r2 = lateNewsUpdate(backbone, adapter, [3], [0, 0], [1, 0], 90);
    expect(r2.applied).toBe(false);
    expect(r2.delta).toBe(0);
  });
  it("is disabled pending the pretrained backbone", () => {
    expect(ENABLED).toBe(false);
  });
});
