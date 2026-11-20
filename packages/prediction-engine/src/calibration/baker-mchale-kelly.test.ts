import { describe, expect, it } from "vitest";
import { bakerMcHaleShrunkKelly } from "./conformal-copula-kelly.js";

describe("bakerMcHaleShrunkKelly", () => {
  it("returns zero stake on non-positive EV or invalid inputs", () => {
    expect(bakerMcHaleShrunkKelly({ winProb: 0.5, decimalOdds: 1.91 }).shrunkStake).toBe(0);
    expect(bakerMcHaleShrunkKelly({ winProb: 0.55, decimalOdds: 1.0 }).shrunkStake).toBe(0);
    expect(bakerMcHaleShrunkKelly({ winProb: Number.NaN, decimalOdds: 2.0 }).shrunkStake).toBe(0);
  });

  it("strictly shrinks Kelly stake as estimation uncertainty grows", () => {
    const tight = bakerMcHaleShrunkKelly({
      winProb: 0.58,
      decimalOdds: 1.95,
      probStdError: 0.01,
    });
    const noisy = bakerMcHaleShrunkKelly({
      winProb: 0.58,
      decimalOdds: 1.95,
      probStdError: 0.06,
    });
    expect(noisy.shrunkStake).toBeGreaterThan(0);
    expect(noisy.shrunkStake).toBeLessThan(tight.shrunkStake);
    expect(noisy.shrinkageK).toBeLessThan(tight.shrinkageK);
    expect(tight.shrunkStake).toBeLessThanOrEqual(0.05);

    const smallN = bakerMcHaleShrunkKelly({
      winProb: 0.58,
      decimalOdds: 1.95,
      effectiveSampleN: 25,
    });
    const largeN = bakerMcHaleShrunkKelly({
      winProb: 0.58,
      decimalOdds: 1.95,
      effectiveSampleN: 500,
    });
    expect(smallN.shrunkStake).toBeLessThan(largeN.shrunkStake);
  });
});
