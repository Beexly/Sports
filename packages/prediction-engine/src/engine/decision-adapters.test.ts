import { describe, expect, it } from "vitest";
import {
  cadenceAdapter,
  DECISION_ADAPTERS,
  dominanceScreenAdapter,
  drawdownRiskAdapter,
  fractionalCeilingAdapter,
  kellyCapsAdapter,
  kellyLogGrowthAdapter,
  nominalKellyAdapter,
  robustKellyAdapter,
  uncertaintyBoxAdapter,
} from "./decision-adapters.js";
import { isFailClosed, isObservation } from "./universal-adapter.js";

describe("decision-adapters registry", () => {
  it("exposes every decision adapter", () => {
    expect(Object.keys(DECISION_ADAPTERS).sort()).toEqual([
      "cadence",
      "dominanceScreen",
      "drawdownRisk",
      "fractionalCeiling",
      "kellyCaps",
      "kellyLogGrowth",
      "nominalKelly",
      "robustKelly",
      "uncertaintyBox",
    ]);
  });
});

describe("kellyLogGrowthAdapter", () => {
  it("computes expected log-growth", () => {
    // +1 with p=0.55, -1 with p=0.45 at f=0.1
    const r = kellyLogGrowthAdapter({
      f: 0.1,
      dist: [
        { x: 1, p: 0.55 },
        { x: -1, p: 0.45 },
      ],
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      // 0.55*log(1.1) + 0.45*log(0.9) ≈ 0.55*0.0953 + 0.45*(-0.1054) ≈ 0.0051
      expect(r.value as number).toBeGreaterThan(0);
      expect(r.value as number).toBeLessThan(0.02);
    }
  });

  it("returns RUIN when fraction wipes out a branch", () => {
    const r = kellyLogGrowthAdapter({
      f: 1.5,
      dist: [{ x: -1, p: 1 }],
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBe("RUIN");
  });

  it("fails closed on empty dist or bad f", () => {
    expect(isFailClosed(kellyLogGrowthAdapter({ f: 0.1, dist: [] }))).toBe(true);
    expect(isFailClosed(kellyLogGrowthAdapter({ f: -0.1, dist: [{ x: 1, p: 1 }] }))).toBe(true);
    expect(isFailClosed(kellyLogGrowthAdapter(null))).toBe(true);
  });
});

describe("robustKellyAdapter / nominalKellyAdapter", () => {
  it("robust fraction is <= nominal", () => {
    const rob = robustKellyAdapter({ pHat: 0.55, odds: 2.0 });
    const nom = nominalKellyAdapter({ pHat: 0.55, odds: 2.0 });
    expect(isObservation(rob)).toBe(true);
    expect(isObservation(nom)).toBe(true);
    if (isObservation(rob) && isObservation(nom)) {
      expect(rob.value as number).toBeLessThanOrEqual((nom.value as number) + 1e-9);
      expect(rob.value as number).toBeGreaterThanOrEqual(0);
    }
  });

  it("fails closed on invalid pHat/odds", () => {
    expect(isFailClosed(robustKellyAdapter({ pHat: 0, odds: 2 }))).toBe(true);
    expect(isFailClosed(robustKellyAdapter({ pHat: 0.5, odds: 1 }))).toBe(true);
    expect(isFailClosed(nominalKellyAdapter(null))).toBe(true);
  });
});

describe("uncertaintyBoxAdapter", () => {
  it("returns a box around pHat", () => {
    const r = uncertaintyBoxAdapter({ pHat: 0.55, radius: 0.05 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.raw!.pLo).toBeCloseTo(0.5, 4);
      expect(r.raw!.pHi).toBeCloseTo(0.6, 4);
    }
  });

  it("fails closed on bad radius", () => {
    expect(isFailClosed(uncertaintyBoxAdapter({ pHat: 0.5, radius: -1 }))).toBe(true);
    expect(isFailClosed(uncertaintyBoxAdapter(null))).toBe(true);
  });
});

describe("cadenceAdapter", () => {
  it("returns BET when edge is attractive", () => {
    const r = cadenceAdapter({
      edgeMean: 0.05,
      edgeVar: 0.01,
      costPerRestake: 0.001,
      maxCadence: 5,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.raw!.state).toBe("BET");
      expect(r.value as number).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns NOT_WORTH_BETTING when edge is thin", () => {
    const r = cadenceAdapter({
      edgeMean: 0.001,
      edgeVar: 1,
      costPerRestake: 0.05,
      maxCadence: 5,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.raw!.state).toBe("NOT_WORTH_BETTING");
  });

  it("fails closed on invalid inputs", () => {
    expect(isFailClosed(cadenceAdapter(null))).toBe(true);
    expect(
      isFailClosed(
        cadenceAdapter({ edgeMean: 0, edgeVar: -1, costPerRestake: 0, maxCadence: 1 }),
      ),
    ).toBe(true);
  });
});

describe("drawdownRiskAdapter", () => {
  it("computes a non-negative risk estimate", () => {
    const r = drawdownRiskAdapter({
      phi: [0.5, 0.5],
      tradeReturns: [
        [0.05, -0.02],
        [-0.01, 0.03],
        [0.02, 0.01],
      ],
      nPaths: 50,
      seed: 42,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeGreaterThanOrEqual(0);
  });

  it("fails closed on empty inputs", () => {
    expect(isFailClosed(drawdownRiskAdapter(null))).toBe(true);
    expect(
      isFailClosed(
        drawdownRiskAdapter({ phi: [], tradeReturns: [[1]], nPaths: 10 }),
      ),
    ).toBe(true);
  });
});

describe("kellyCapsAdapter", () => {
  it("returns per-category caps", () => {
    const r = kellyCapsAdapter({
      phi: [0.25, 0.25, 0.25, 0.25],
      fullKellyCap: 0.1,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeGreaterThanOrEqual(0);
  });

  it("fails closed when phi length mismatches categories", () => {
    expect(isFailClosed(kellyCapsAdapter({ phi: [0.5], fullKellyCap: 0.1 }))).toBe(true);
    expect(isFailClosed(kellyCapsAdapter(null))).toBe(true);
  });
});

describe("dominanceScreenAdapter / fractionalCeilingAdapter", () => {
  it("dominance screen runs on a simple input", () => {
    const r = dominanceScreenAdapter({
      picks: [
        {
          id: "a",
          gameId: "g1",
          market: "spread",
          selection: "HOME",
          probability: 0.55,
          decimalOdds: 1.91,
          stake: 0.02,
        },
        {
          id: "b",
          gameId: "g1",
          market: "spread",
          selection: "AWAY",
          probability: 0.48,
          decimalOdds: 1.95,
          stake: 0.02,
        },
      ],
      trailingReturns: { a: [0.02, -0.01], b: [-0.02, 0.01] },
      structuralProbs: { a: 0.55, b: 0.48 },
      trailingWindow: "2026-W1..W4",
      fractionalKellyCeiling: 0.05,
    });
    expect(isObservation(r)).toBe(true);
  });

  it("fails closed on missing dominance input", () => {
    expect(isFailClosed(dominanceScreenAdapter(null))).toBe(true);
  });

  it("caps stake at fractional ceiling", () => {
    const r = fractionalCeilingAdapter({ stake: 0.2, ceiling: 0.05 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeCloseTo(0.05, 6);
  });

  it("fails closed on bad ceiling", () => {
    expect(isFailClosed(fractionalCeilingAdapter({ stake: 0.1, ceiling: 0 }))).toBe(true);
    expect(isFailClosed(fractionalCeilingAdapter(null))).toBe(true);
  });
});
