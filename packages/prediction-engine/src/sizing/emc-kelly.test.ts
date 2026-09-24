import { describe, expect, it } from "vitest";
import { emcKellyStake, makeRng, pluginKelly, sampleTrueProbs } from "./emc-kelly";

describe("emc-kelly", () => {
  it("samples concentrate around the model price", () => {
    const s = sampleTrueProbs(0.6, 0.1, 5000, makeRng(1));
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    expect(mean).toBeCloseTo(0.6, 1);
    expect(s.every((p) => p > 0 && p < 1)).toBe(true);
    expect(() => sampleTrueProbs(0, 0.1, 10, makeRng(1))).toThrow();
  });

  it("zero uncertainty recovers plug-in Kelly", () => {
    const emc = emcKellyStake(0.6, 2.0, 0, 0.4, 2000, 0.25, 11);
    expect(emc).toBeCloseTo(pluginKelly(0.6, 2.0), 2);
  });

  it("more uncertainty shrinks the stake", () => {
    const calm = emcKellyStake(0.6, 2.0, 0.05, 0.4, 2000, 0.25, 11);
    const noisy = emcKellyStake(0.6, 2.0, 0.6, 0.4, 2000, 0.25, 11);
    expect(noisy).toBeLessThanOrEqual(calm + 1e-9);
  });

  it("no edge -> zero stake", () => {
    expect(emcKellyStake(0.4, 2.0, 0.1, 0.4, 500, 0.25, 11)).toBe(0);
    expect(pluginKelly(0.4, 2.0)).toBe(0);
  });

  it("respects the cap", () => {
    const f = emcKellyStake(0.75, 3.0, 0.05, 0.4, 1000, 0.1, 11);
    expect(f).toBeLessThanOrEqual(0.1 + 1e-9);
  });
});
