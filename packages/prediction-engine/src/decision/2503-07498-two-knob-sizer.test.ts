import { describe, expect, it } from "vitest";
import {
  ENABLED,
  compoundCovariance,
  expUtilityWeights,
  normalizeWeights,
  gmvObjective,
  kellyLeverage,
  gmvLeverage,
  stateDependentLambda,
  simulateLogWealth,
  twoKnobGatePasses,
} from "./2503-07498-two-knob-sizer.js";

describe("2503.07498 two-knob sizer", () => {
  it("is disabled by default (no live-data gate claim)", () => {
    expect(ENABLED).toBe(false);
  });

  it("compoundCovariance adds statistical and non-stationary covariances", () => {
    const stat = [
      [0.04, 0.01],
      [0.01, 0.09],
    ];
    const ns = [
      [0.01, 0.0],
      [0.0, 0.02],
    ];
    expect(compoundCovariance(stat, ns)).toEqual([
      [0.05, 0.01],
      [0.01, 0.11],
    ]);
  });

  it("expUtilityWeights solves w* = Sigma^{-1} mu / a (validates the linear solver)", () => {
    // Hand-computed 2x2: det = 0.0275*0.0541 - 0.0095^2 = 0.0013975
    const cov = [
      [0.0275, -0.0095],
      [-0.0095, 0.0541],
    ];
    const w = expUtilityWeights([0.012, 0.005], cov, 2);
    expect(w[0]).toBeCloseTo(0.249265, 5);
    expect(w[1]).toBeCloseTo(0.08998, 5);
    // Linear in 1/a: doubling risk aversion halves the weights.
    const w2 = expUtilityWeights([0.012, 0.005], cov, 4);
    expect(w2[0]).toBeCloseTo(w[0]! / 2, 10);
    expect(w2[1]).toBeCloseTo(w[1]! / 2, 10);
  });

  it("normalizeWeights targets unit gross exposure", () => {
    expect(normalizeWeights([3, -3])).toEqual([0.5, -0.5]);
    expect(normalizeWeights([0.5, -0.25, 0.25])).toEqual([0.5, -0.25, 0.25]);
    expect(normalizeWeights([0, 0])).toEqual([0, 0]);
  });

  it("gmvObjective is the log-utility mean minus lambda times its variance", () => {
    const scen = [0.1, -0.05, 0.02];
    expect(gmvObjective(0, scen, 2)).toBe(0); // log(1) = 0 everywhere
    const kelly = gmvObjective(0.5, scen, 0);
    expect(kelly).toBeGreaterThan(gmvObjective(0.5, scen, 2)); // penalty bites
    expect(gmvObjective(100, [0.1, -0.5], 0)).toBe(-Infinity); // ruin -> -inf
  });

  it("kellyLeverage recovers the binary-bet Kelly fraction", () => {
    // +1 w.p. 0.6 / -1 w.p. 0.4 -> f* = p - q = 0.2
    const scen = [1, 1, 1, -1, -1];
    expect(kellyLeverage(scen)).toBeCloseTo(0.2, 3);
    // Negative edge -> ~0 leverage.
    expect(kellyLeverage([-1, -1, -1, 1, 1])).toBeLessThan(1e-6);
    // Respects the fMax cap.
    expect(kellyLeverage(scen, 0.1)).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it("gmvLeverage equals Kelly at lambda=0 and tempers as lambda grows", () => {
    const scen = [0.2, -0.04, 0.06, -0.16, 0.2, -0.04, 0.06, -0.16];
    const k = kellyLeverage(scen);
    expect(gmvLeverage(scen, 0)).toBeCloseTo(k, 6);
    const l1 = gmvLeverage(scen, 1);
    const l2 = gmvLeverage(scen, 4);
    expect(l1).toBeLessThan(k);
    expect(l2).toBeLessThan(l1);
    expect(l1).toBeGreaterThan(0);
  });

  it("stateDependentLambda rises with ECE and floors at the base value", () => {
    expect(stateDependentLambda(0.75, 0, 7)).toBe(0.75);
    expect(stateDependentLambda(0.75, 0.18, 7)).toBeCloseTo(0.75 * (1 + 7 * 0.18), 10);
    expect(stateDependentLambda(0.75, -0.5, 7)).toBe(0.75);
  });

  it("simulateLogWealth compounds log growth and tracks max drawdown", () => {
    const s = simulateLogWealth([1], [0.5], [[0.1]]);
    expect(s.terminalLogGrowth).toBeCloseTo(Math.log(1.05), 10);
    expect(s.maxDrawdown).toBe(0);
    // Up 10% then down: drawdown measured from the peak in log points.
    const s2 = simulateLogWealth([1], [1, 1], [[0.1], [-0.2]]);
    expect(s2.terminalLogGrowth).toBeCloseTo(Math.log(1.1) + Math.log(0.8), 10);
    expect(s2.maxDrawdown).toBeCloseTo(Math.log(1.1) - (Math.log(1.1) + Math.log(0.8)), 10);
    // Zero leverage -> flat.
    const s3 = simulateLogWealth([0.6, 0.4], [0, 0], [[0.1, 0.2], [-0.3, 0.1]]);
    expect(s3.terminalLogGrowth).toBe(0);
    expect(s3.maxDrawdown).toBe(0);
  });

  describe("acceptance-gate integration (deterministic fixture)", () => {
    // Fixed diversified-portfolio scenario set (knob 1: what exponential-
    // utility diversification achieves) vs fixed equal-weight scenario set.
    const Sw: number[] = [];
    for (let i = 0; i < 6; i++) Sw.push(0.2, -0.04, 0.06, -0.16);
    const Se: number[] = [];
    for (let i = 0; i < 6; i++) Se.push(0.17, -0.02, 0.05, -0.18);

    const T = 72;
    const Rw: number[] = [];
    const Re: number[] = [];
    const ece: number[] = [];
    for (let t = 0; t < T; t++) {
      const shock = t >= 30 && t < 33;
      // Equal-weight holds more of the shock asset: its shock is deeper.
      Rw.push(shock ? -0.28 : Sw[t % 24]!);
      Re.push(shock ? -0.48 : Se[t % 24]!);
      ece.push(shock ? 0.18 : t >= 28 && t < 30 ? [0.07, 0.09][t - 28]! : 0.03);
    }

    const LAM0 = 0.75;
    const SENS = 7;
    const fK = kellyLeverage(Sw);
    const fHk = 0.5 * Math.max(kellyLeverage(Se), 0);
    const f2k = ece.map((e) => gmvLeverage(Sw, stateDependentLambda(LAM0, e, SENS)));
    const twoKnob = simulateLogWealth([1], f2k, Rw.map((r) => [r]));
    const halfKelly = simulateLogWealth([1], Rw.map(() => fHk), Re.map((r) => [r]));
    const ratios: number[] = [];
    for (let w0 = 0; w0 < T; w0 += 18) {
      const winEce = ece.slice(w0, w0 + 18).reduce((a, x) => a + x, 0) / 18;
      ratios.push(gmvLeverage(Sw, stateDependentLambda(LAM0, winEce, SENS)) / fK);
    }

    it("fitted leverages are interior and match the calibrated fixture", () => {
      expect(fK).toBeCloseTo(0.871, 2);
      expect(fHk).toBeCloseTo(0.155, 2);
      // ECE tempering cuts leverage hard during the shock.
      const calm = f2k[10]!;
      const shock = f2k[31]!;
      expect(shock).toBeLessThan(calm * 0.7);
    });

    it("passes the verbatim acceptance gate", () => {
      expect(twoKnob.terminalLogGrowth).toBeGreaterThan(halfKelly.terminalLogGrowth);
      expect(twoKnob.maxDrawdown).toBeLessThanOrEqual(halfKelly.maxDrawdown);
      expect(ratios.length).toBe(4);
      for (const r of ratios) {
        expect(r).toBeGreaterThanOrEqual(0.3);
        expect(r).toBeLessThanOrEqual(0.7);
      }
      expect(twoKnobGatePasses({ twoKnob, halfKelly, leverageRatios: ratios })).toBe(true);
    });

    it("gate helper rejects each failure mode", () => {
      const base = { twoKnob, halfKelly, leverageRatios: ratios };
      expect(twoKnobGatePasses({ ...base, twoKnob: halfKelly, halfKelly: twoKnob })).toBe(false); // growth flip
      expect(
        twoKnobGatePasses({ ...base, twoKnob: { ...twoKnob, maxDrawdown: halfKelly.maxDrawdown + 0.01 } }),
      ).toBe(false); // drawdown breach
      expect(twoKnobGatePasses({ ...base, leverageRatios: [0.5, 0.29, 0.5, 0.5] })).toBe(false); // ratio < 0.3
      expect(twoKnobGatePasses({ ...base, leverageRatios: [0.5, 0.71, 0.5, 0.5] })).toBe(false); // ratio > 0.7
      expect(twoKnobGatePasses({ ...base, leverageRatios: [] })).toBe(false); // no ratios
    });
  });
});
