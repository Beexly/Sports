import { describe, it, expect } from "vitest";
import {
  independentEstimatesForSide,
  ensembleForSide,
} from "../multi-market-ensemble.js";
import type { IndependentMarketFairValue } from "@sports/types";

const NOW = () => new Date("2026-06-18T00:00:00Z");

describe("independentEstimatesForSide", () => {
  it("extracts the chosen side's probability per source", () => {
    const fvs: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6, awayFairProb: 0.4 },
      { source: "poisson", homeFairProb: 0.58, awayFairProb: 0.42 },
    ];
    const home = independentEstimatesForSide(fvs, "home", { now: NOW });
    expect(home.map((e) => e.prob)).toEqual([0.6, 0.58]);
    const away = independentEstimatesForSide(fvs, "away", { now: NOW });
    expect(away.map((e) => e.prob)).toEqual([0.4, 0.42]);
  });

  it("skips sources with no quote for the side", () => {
    const fvs: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6, awayFairProb: 0.4 },
      { source: "polymarket", homeFairProb: null, awayFairProb: null },
    ];
    expect(independentEstimatesForSide(fvs, "home", { now: NOW })).toHaveLength(1);
  });

  it("gives a vig-free exchange more weight than a model estimator", () => {
    const fvs: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6 },
      { source: "poisson", homeFairProb: 0.52 },
    ];
    const ens = ensembleForSide(fvs, "home", { now: NOW });
    expect(ens.weights[0]!.source).toBe("kalshi");
    expect(ens.weights[0]!.weight).toBeGreaterThan(ens.weights[1]!.weight);
    // Blend pulled toward the sharper exchange (above the naive 0.56 mean).
    expect(ens.fairProb!).toBeGreaterThan(0.56);
  });

  it("down-weights a stale quote relative to a fresh one from the same source", () => {
    const fresh: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6, capturedAt: "2026-06-18T00:00:00Z" },
      { source: "poisson", homeFairProb: 0.5 },
    ];
    const stale: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6, capturedAt: "2026-06-17T23:30:00Z" }, // 30 min old
      { source: "poisson", homeFairProb: 0.5 },
    ];
    const wFresh = ensembleForSide(fresh, "home", { now: NOW }).weights.find((w) => w.source === "kalshi")!.weight;
    const wStale = ensembleForSide(stale, "home", { now: NOW }).weights.find((w) => w.source === "kalshi")!.weight;
    expect(wFresh).toBeGreaterThan(wStale);
  });

  it("applies a per-source reliability override (override wins over defaults)", () => {
    const fvs: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6 },
      { source: "poisson", homeFairProb: 0.52 },
    ];
    const ens = ensembleForSide(fvs, "home", {
      now: NOW,
      reliabilityBySource: { poisson: { stdError: 0.005 } }, // force poisson to dominate
    });
    expect(ens.weights[0]!.source).toBe("poisson");
    expect(ens.fairProb!).toBeLessThan(0.56); // pulled toward poisson's 0.52
  });

  it("still includes an unknown source at baseline reliability", () => {
    const fvs: IndependentMarketFairValue[] = [{ source: "mystery", homeFairProb: 0.7 }];
    const est = independentEstimatesForSide(fvs, "home", { now: NOW });
    expect(est).toHaveLength(1);
    expect(est[0]!.prob).toBe(0.7);
  });
});
