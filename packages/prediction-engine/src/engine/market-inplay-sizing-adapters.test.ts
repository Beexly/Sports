import { describe, expect, it } from "vitest";
import {
  devigAdapter,
  flbSlopeAdapter,
  kellyFractionAdapter,
  largeLineMoveAdapter,
  MARKET_INPLAY_SIZING_ADAPTERS,
  multiplicativeNormalizeAdapter,
  overWinTotalAdapter,
  safeLeadAdapter,
  shrinkEdgesAdapter,
  spreadToWinProbAdapter,
  volatilityStakeAdapter,
} from "./market-inplay-sizing-adapters.js";
import { isFailClosed, isObservation } from "./universal-adapter.js";

describe("market-inplay-sizing-adapters registry", () => {
  it("exposes every adapter", () => {
    expect(Object.keys(MARKET_INPLAY_SIZING_ADAPTERS).sort()).toEqual([
      "devig",
      "flbSlope",
      "kellyFraction",
      "largeLineMove",
      "multiplicativeNormalize",
      "overWinTotal",
      "safeLead",
      "shrinkEdges",
      "spreadToWinProb",
      "volatilityStake",
    ]);
  });
});

describe("spreadToWinProbAdapter", () => {
  it("maps a positive spread to a win probability > 0.5", () => {
    const r = spreadToWinProbAdapter({ spread: 3 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThan(0.5);
      expect(r.value as number).toBeLessThan(1);
    }
  });

  it("maps a negative spread to a win probability < 0.5", () => {
    const r = spreadToWinProbAdapter({ spread: -3 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeLessThan(0.5);
  });

  it("fails closed on missing spread", () => {
    expect(isFailClosed(spreadToWinProbAdapter(null))).toBe(true);
    expect(isFailClosed(spreadToWinProbAdapter({ spread: Number.NaN }))).toBe(true);
  });
});

describe("overWinTotalAdapter", () => {
  it("computes P(wins > line) from game win probabilities", () => {
    const r = overWinTotalAdapter({
      gameWinProbs: Array.from({ length: 17 }, () => 0.55),
      line: 9.5,
      sims: 2000,
      seed: 42,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThan(0);
      expect(r.value as number).toBeLessThan(1);
    }
  });

  it("fails closed on bad probabilities", () => {
    expect(isFailClosed(overWinTotalAdapter({ gameWinProbs: [1.5], line: 9 }))).toBe(true);
    expect(isFailClosed(overWinTotalAdapter(null))).toBe(true);
  });
});

describe("largeLineMoveAdapter", () => {
  it("flags a 2.5-point move as large", () => {
    const r = largeLineMoveAdapter({ movePoints: 2.5 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBe(true);
  });

  it("does not flag a half-point move", () => {
    const r = largeLineMoveAdapter({ movePoints: 0.5 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBe(false);
  });
});

describe("devigAdapter", () => {
  it("devigs two-way odds", () => {
    const r = devigAdapter({ decimalOdds: [1.91, 1.91], method: "multiplicative" });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      const probs = r.raw!.probabilities as number[];
      expect(probs[0]! + probs[1]!).toBeCloseTo(1, 4);
    }
  });

  it("fails closed on bad odds", () => {
    expect(isFailClosed(devigAdapter({ decimalOdds: [1.0, 2], method: "multiplicative" }))).toBe(
      true,
    );
    expect(isFailClosed(devigAdapter(null))).toBe(true);
  });
});

describe("multiplicativeNormalizeAdapter", () => {
  it("normalizes odds to sum of implied = 1", () => {
    const r = multiplicativeNormalizeAdapter({ odds: [2.0, 2.0] });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      const n = r.raw!.normalized as number[];
      expect(n).toHaveLength(2);
    }
  });

  it("fails closed on empty or bad odds", () => {
    expect(isFailClosed(multiplicativeNormalizeAdapter({ odds: [] }))).toBe(true);
    expect(isFailClosed(multiplicativeNormalizeAdapter(null))).toBe(true);
  });
});

describe("safeLeadAdapter", () => {
  it("returns a lead-survival probability", () => {
    // Large lead, little time left → survival high
    const r = safeLeadAdapter({
      lead: 17,
      timeRemainingMin: 3,
      driftPerMin: 0,
      diffusivity: 3.5,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThan(0.5);
      expect(r.value as number).toBeLessThanOrEqual(1);
    }
  });

  it("fails closed on missing params", () => {
    expect(isFailClosed(safeLeadAdapter(null))).toBe(true);
    expect(
      isFailClosed(safeLeadAdapter({ lead: 7, timeRemainingMin: 10, driftPerMin: 0, diffusivity: 0 })),
    ).toBe(true);
  });
});

describe("kellyFractionAdapter", () => {
  it("computes a Kelly fraction", () => {
    const r = kellyFractionAdapter({ p: 0.55, odds: 2.0 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeGreaterThanOrEqual(0);
  });

  it("fails closed on invalid p/odds", () => {
    expect(isFailClosed(kellyFractionAdapter({ p: 1.2, odds: 2 }))).toBe(true);
    expect(isFailClosed(kellyFractionAdapter(null))).toBe(true);
  });
});

describe("volatilityStakeAdapter", () => {
  it("scales stake by regime and drawdown", () => {
    const r = volatilityStakeAdapter({
      baseStake: 100,
      regime: "NORMAL",
      drawdown: 0.05,
      bankroll: 10000,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThanOrEqual(0);
      expect(r.value as number).toBeLessThanOrEqual(100);
    }
  });

  it("fails closed on bad bankroll", () => {
    expect(isFailClosed(volatilityStakeAdapter({ baseStake: 10, regime: "NORMAL", drawdown: 0, bankroll: 0 }))).toBe(true);
    expect(isFailClosed(volatilityStakeAdapter(null))).toBe(true);
  });
});

describe("shrinkEdgesAdapter", () => {
  it("shrinks noisy edges toward zero with >= 4 edges", () => {
    const r = shrinkEdgesAdapter({
      edges: [0.08, 0.01, 0.05, 0.02],
      ses: [0.1, 0.01, 0.08, 0.05],
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      const shrunk = r.raw!.shrunk as number[];
      expect(shrunk).toHaveLength(4);
    }
  });

  it("fails closed on too-few or misaligned edges", () => {
    expect(isFailClosed(shrinkEdgesAdapter({ edges: [0.1, 0.1], ses: [0.1, 0.2] }))).toBe(true);
    expect(isFailClosed(shrinkEdgesAdapter({ edges: [0.1], ses: [0.1, 0.2, 0.3, 0.4] }))).toBe(true);
    expect(isFailClosed(shrinkEdgesAdapter(null))).toBe(true);
  });
});

describe("flbSlopeAdapter", () => {
  it("fails closed on fewer than 2 buckets", () => {
    expect(isFailClosed(flbSlopeAdapter({ buckets: [] }))).toBe(true);
    expect(isFailClosed(flbSlopeAdapter(null))).toBe(true);
  });

  it("computes a slope from buckets with n>=10", () => {
    const r = flbSlopeAdapter({
      buckets: [
        {
          label: "fav",
          minOdds: 1.2,
          maxOdds: 1.6,
          implied: Array.from({ length: 12 }, () => 0.7),
          outcomes: Array.from({ length: 12 }, () => 1),
        },
        {
          label: "dog",
          minOdds: 3.0,
          maxOdds: 5.0,
          implied: Array.from({ length: 12 }, () => 0.25),
          outcomes: Array.from({ length: 12 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
        },
      ],
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(Number.isFinite(r.value as number)).toBe(true);
  });
});
