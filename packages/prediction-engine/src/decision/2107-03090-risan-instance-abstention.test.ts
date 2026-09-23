// Tests for decision/2107-03090-risan-instance-abstention.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  doubleSigmoidUnitLoss,
  marketConditionedRho,
  risanPublish,
  risanAcceptedHitRate,
  injectOutcomeNoise,
  globalGateHitRate,
  risanGatePasses,
} from "./2107-03090-risan-instance-abstention.js";

describe("doubleSigmoidUnitLoss (2107.03090)", () => {
  it("is small for confident-correct predictions outside the band", () => {
    const good = doubleSigmoidUnitLoss(2.0, 0.5, 0.3);
    const bad = doubleSigmoidUnitLoss(-2.0, 0.5, 0.3);
    const abstained = doubleSigmoidUnitLoss(0.0, 0.5, 0.3);
    expect(good).toBeLessThan(abstained);
    expect(abstained).toBeLessThan(bad);
  });
  it("higher abstention cost d pushes the loss toward predicting", () => {
    const cheap = doubleSigmoidUnitLoss(0.0, 0.5, 0.1);
    const pricey = doubleSigmoidUnitLoss(0.0, 0.5, 0.9);
    expect(pricey).toBeGreaterThan(cheap);
  });
});

describe("marketConditionedRho", () => {
  it("widens the band when the market disagrees with the model", () => {
    expect(marketConditionedRho(0.3, 0)).toBeCloseTo(0.3, 10);
    expect(marketConditionedRho(0.3, 2.0)).toBeGreaterThan(0.3);
    expect(marketConditionedRho(0.3, -1)).toBeCloseTo(0.3, 10); // agreement doesn't shrink
  });
});

describe("risanPublish", () => {
  it("publishes only outside the abstention band", () => {
    expect(risanPublish(0.8, 0.5)).toBe(true);
    expect(risanPublish(0.3, 0.5)).toBe(false);
    expect(risanPublish(-0.9, 0.5)).toBe(true);
  });
});

describe("risanAcceptedHitRate vs globalGateHitRate", () => {
  // Picks where line disagreement marks the traps: high margin but market moved against -> losses.
  const picks = [
    { id: "a", margin: 1.5, baseRho: 0.4, lineDisagreement: 0.0, won: true },
    { id: "b", margin: 1.4, baseRho: 0.4, lineDisagreement: 3.0, won: false }, // trap
    { id: "c", margin: 1.2, baseRho: 0.4, lineDisagreement: 0.0, won: true },
    { id: "d", margin: 1.1, baseRho: 0.4, lineDisagreement: 2.5, won: false }, // trap
    { id: "e", margin: 0.9, baseRho: 0.4, lineDisagreement: 0.0, won: true },
    { id: "f", margin: 0.8, baseRho: 0.4, lineDisagreement: 0.0, won: false },
  ];
  it("the market-conditioned band skips the traps the global gate takes", () => {
    const risan = risanAcceptedHitRate(picks, 3);
    const global = globalGateHitRate(picks, 3);
    // Global takes a, b, c -> 2/3. RISAN demotes b (and d), taking a, c, e -> 3/3.
    expect(global).toBeCloseTo(2 / 3, 10);
    expect(risan).toBeCloseTo(1, 10);
  });
  it("injectOutcomeNoise flips ~20% of outcomes", () => {
    const noisy = injectOutcomeNoise(picks, 0.2);
    const flips = noisy.filter((p, i) => p.won !== picks[i]!.won).length;
    expect(flips).toBe(2); // every 5th of 6 picks -> indices 0 and 5
  });
});

describe("risanGatePasses", () => {
  it("requires +3pt clean AND no-worse noise degradation", () => {
    expect(risanGatePasses(0.6, 0.56, 0.52, 0.48)).toBe(true);
    expect(risanGatePasses(0.58, 0.56, 0.52, 0.48)).toBe(false); // <3pt
    expect(risanGatePasses(0.6, 0.56, 0.45, 0.48)).toBe(false); // degrades more
  });
});
