
import { describe, expect, it } from "vitest";
import { classifyRegime, rollingVolatility, scaleStake, stakeMultiplier } from "./volatility-regime-scaler";

describe("volatility-regime-scaler", () => {
  it("rollingVolatility is 0 for flat returns", () => {
    expect(rollingVolatility([0.01, 0.01, 0.01, 0.01], 3).every((v) => v < 1e-12)).toBe(true);
  });
  it("classifyRegime splits on trailing quantiles", () => {
    const hist = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08];
    expect(classifyRegime(0.01, hist)).toBe("low");
    expect(classifyRegime(0.08, hist)).toBe("high");
    expect(classifyRegime(0.045, hist)).toBe("normal");
    expect(classifyRegime(0.5, [])).toBe("normal");
  });
  it("stakeMultiplier shrinks in high vol and under drawdown", () => {
    expect(stakeMultiplier("high", 0)).toBeLessThan(stakeMultiplier("low", 0));
    expect(stakeMultiplier("normal", 0.5)).toBeCloseTo(stakeMultiplier("normal", 0) * 0.5, 10);
  });
  it("scaleStake caps at the bankroll fraction", () => {
    expect(scaleStake(100, 1, 1000, 0.05)).toBe(50);
    expect(scaleStake(10, 1, 1000, 0.05)).toBe(10);
    expect(() => scaleStake(10, 1, 0)).toThrow();
  });
  it("edge cases throw", () => {
    expect(() => rollingVolatility([1], 1)).toThrow();
  });
});
