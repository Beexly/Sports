import { describe, expect, it } from "vitest";
import { logisticTrainer, type LabeledExample } from "../logistic";

function logit(p: number): number {
  const q = Math.min(1 - 1e-12, Math.max(1e-12, p));
  return Math.log(q / (1 - q));
}

describe("market offset identity", () => {
  it("at large lambda, a head with market logit as offset reproduces the market probability", () => {
    // Features are noise. Ridge at large lambda kills their weights.
    // Offset is the market logit; labels match that rate so the
    // unpenalized intercept has nothing to absorb. Predictor must return
    // the market p, not a shrunk base rate.
    const pMarket = 0.41;
    const n = 200;
    const train: LabeledExample[] = Array.from({ length: n }, (_, i) => ({
      features: new Map([["noise", i % 2 === 0 ? 1 : -1]]),
      y: (i < Math.round(n * pMarket) ? 1 : 0) as 0 | 1,
      offset: logit(pMarket),
    }));

    const predict = logisticTrainer({
      featureKeys: ["noise"],
      lambda: 50,
      learningRate: 0.02,
      iterations: 800,
    })(train);

    expect(predict(new Map([["noise", 1]]), logit(pMarket))).toBeCloseTo(pMarket, 2);
    expect(predict(new Map([["noise", -1]]), logit(pMarket))).toBeCloseTo(pMarket, 2);
  });

  it("no-offset path is unchanged: a zero-offset trainer matches an omitted-offset trainer", () => {
    const train: LabeledExample[] = [
      { features: new Map([["x", 1]]), y: 1 },
      { features: new Map([["x", 0]]), y: 0 },
      { features: new Map([["x", 0.5]]), y: 1 },
      { features: new Map([["x", -0.5]]), y: 0 },
    ];
    const withExplicitZero: LabeledExample[] = train.map((ex) => ({ ...ex, offset: 0 }));

    const a = logisticTrainer({ featureKeys: ["x"], lambda: 0.01, iterations: 200 })(train);
    const b = logisticTrainer({ featureKeys: ["x"], lambda: 0.01, iterations: 200 })(withExplicitZero);

    const probe = new Map([["x", 0.25]]);
    expect(a(probe)).toBe(b(probe, 0));
  });

  it("empty train keeps the market offset rather than returning a coin flip", () => {
    const predict = logisticTrainer({ featureKeys: ["x"] })([]);
    const market = logit(0.41);
    expect(predict(new Map([["x", 1]]), market)).toBeCloseTo(0.41, 12);
    expect(predict(new Map())).toBe(0.5);
  });
});
