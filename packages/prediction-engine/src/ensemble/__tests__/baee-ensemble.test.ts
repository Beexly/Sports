import { describe, it, expect } from "vitest";
import { BAEEEnsemble } from "../baee-ensemble";

describe("BAEEEnsemble", () => {
  it("blends equal-weight models as the arithmetic mean", () => {
    const ens = new BAEEEnsemble(3);
    expect(ens.blend([0.6, 0.3, 0.9])).toBeCloseTo((0.6 + 0.3 + 0.9) / 3, 10);
  });

  it("increases the weight of a model that was exactly right, decreases a wrong one", () => {
    const ens = new BAEEEnsemble(2, 1.0);
    const before = ens.currentWeights();
    // model 0 said 0.99 (right, home won), model 1 said 0.01 (very wrong)
    ens.update([0.99, 0.01], 1);
    const after = ens.currentWeights();
    expect(after[0]!).toBeGreaterThan(before[0]!);
    expect(after[1]!).toBeLessThan(before[1]!);
  });

  it("weights always sum to 1 within floating-point tolerance, over many updates", () => {
    const ens = new BAEEEnsemble(4, 1.0);
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 200; i++) {
      const probs = [rand(), rand(), rand(), rand()];
      const y = rand() < 0.5 ? 1 : 0;
      ens.update(probs, y as 0 | 1);
      const sum = ens.currentWeights().reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 8);
    }
  });

  it("is immune to NaN when every model (and hence the blend) assigns exact 0 to the realized outcome", () => {
    const ens = new BAEEEnsemble(2, 1.0);
    // both models certain the outcome is impossible; it happens anyway
    ens.update([0, 0], 1);
    for (const w of ens.currentWeights()) {
      expect(Number.isFinite(w)).toBe(true);
      expect(Number.isNaN(w)).toBe(false);
    }
    // must remain usable afterward, not permanently poisoned
    const p = ens.blend([0.5, 0.5]);
    expect(Number.isFinite(p)).toBe(true);
  });

  it("is immune to NaN when a model assigns exact 1 to the outcome that did NOT happen", () => {
    const ens = new BAEEEnsemble(2, 1.0);
    ens.update([1, 0.5], 0); // model 0 was CERTAIN of the wrong side
    for (const w of ens.currentWeights()) {
      expect(Number.isFinite(w)).toBe(true);
    }
  });

  it("converges toward the model with the highest log-score on synthetic data", () => {
    const ens = new BAEEEnsemble(3, 1.0);
    // model 0 = truth (p=0.8 whenever home wins w.p. 0.8), models 1/2 = noise
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 300; i++) {
      const y = (rand() < 0.8 ? 1 : 0) as 0 | 1;
      const probs = [0.8, 0.2 + 0.6 * rand(), 0.2 + 0.6 * rand()];
      ens.update(probs, y);
    }
    const w = ens.currentWeights();
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[0]!).toBeGreaterThan(w[2]!);
  });

  it("throws on a modelProbs length mismatch rather than silently misaligning weights", () => {
    const ens = new BAEEEnsemble(3);
    expect(() => ens.blend([0.5, 0.5])).toThrow(RangeError);
    expect(() => ens.update([0.5, 0.5], 1)).toThrow(RangeError);
  });

  it("rejects a non-positive-integer model count at construction", () => {
    expect(() => new BAEEEnsemble(0)).toThrow(RangeError);
    expect(() => new BAEEEnsemble(-1)).toThrow(RangeError);
  });
});
