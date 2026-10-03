/**
 * Vitest suite for arXiv:2605.09599 (Adaptive Liquidity in Prediction Markets via Online Learning).
 * Gate: Adapt the mixture construction and the hybrid signal as GSE's state-dependent exposure framework if the liability component correlates with realized drawdowns on GSE's log.
 */
import { describe, it, expect } from "vitest";
import { gammaHybrid, exposureScale, mixtureOverheadBound } from "./2605-09599-adaptive-liquidity-in-prediction-markets";

describe("2605-09599 hybrid Gamma exposure framework", () => {
  it("Gamma^hyb rises with slippage and liability", () => {
    const base = gammaHybrid({ slippage: 0, liability: 0 }, 2);
    expect(gammaHybrid({ slippage: 0.1, liability: 0 }, 2)).toBeGreaterThan(base);
    expect(gammaHybrid({ slippage: 0, liability: 0.2 }, 2)).toBeCloseTo(base + 0.2, 10);
    expect(() => gammaHybrid({ slippage: 0, liability: 0 }, 0)).toThrow();
  });
  it("exposure scales down with liability", () => {
    expect(exposureScale(0, 2)).toBe(1);
    expect(exposureScale(1, 2)).toBeCloseTo(1 / 3, 10);
    expect(exposureScale(2, 2)).toBeLessThan(exposureScale(1, 2));
  });
  it("overhead bound grows logarithmically in experts", () => {
    expect(mixtureOverheadBound(2, 10)).toBeCloseTo(0.5 * Math.log(10), 10);
  });
});
