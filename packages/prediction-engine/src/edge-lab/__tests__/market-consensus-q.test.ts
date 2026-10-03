import { describe, expect, it } from "vitest";
import { bradleyTerryPair, consensusMarketQ, marketReanchorResidual } from "../market-consensus-q.js";

describe("bradleyTerryPair", () => {
  it("is sA / (sA + sB) and symmetric", () => {
    expect(bradleyTerryPair(0.15, 0.08)).toBeCloseTo(0.15 / 0.23, 12);
    expect(bradleyTerryPair(3, 3)).toBeCloseTo(0.5, 12);
    expect(bradleyTerryPair(2, 1) + bradleyTerryPair(1, 2)).toBeCloseTo(1, 12);
  });

  it("throws on non-positive strengths", () => {
    expect(() => bradleyTerryPair(0, 1)).toThrow(RangeError);
    expect(() => bradleyTerryPair(1, -1)).toThrow(RangeError);
  });
});

describe("consensusMarketQ — logit blend as q, never p", () => {
  it("matches the Mania 60/40 Vegas/BPI mix on the logit scale", () => {
    const c = consensusMarketQ([
      { id: "vegas", q: 0.7, weight: 0.6 },
      { id: "bpi", q: 0.55, weight: 0.4 },
    ]);
    expect(c).not.toBeNull();
    expect(c!.sourceIds).toEqual(["vegas", "bpi"]);
    // Logit blend sits between 0.55 and 0.70, closer to 0.70.
    expect(c!.q).toBeGreaterThan(0.55);
    expect(c!.q).toBeLessThan(0.7);
    expect(c!.q).toBeGreaterThan(0.6 * 0.7 + 0.4 * 0.55 - 0.02);
  });

  it("returns null when every weight is 0 or the list is empty", () => {
    expect(consensusMarketQ([])).toBeNull();
    expect(consensusMarketQ([{ id: "x", q: 0.6, weight: 0 }])).toBeNull();
  });
});

describe("marketReanchorResidual — 90% market is not an edge", () => {
  it("shrinks independent edge by exactly (1 − α)", () => {
    const r = marketReanchorResidual(0.8, 0.5, 0.9);
    expect(r.independentEdge).toBeCloseTo(0.3, 12);
    expect(r.residualEdge).toBeCloseTo(0.03, 12);
    expect(r.publishedP).toBeCloseTo(0.53, 12);
  });

  it("leaves edge untouched at α = 0 and kills it at α = 1", () => {
    const p = 0.62;
    const q = 0.5;
    const none = marketReanchorResidual(p, q, 0);
    const all = marketReanchorResidual(p, q, 1);
    expect(none.residualEdge).toBeCloseTo(p - q, 12);
    expect(all.residualEdge).toBeCloseTo(0, 12);
    expect(all.publishedP).toBeCloseTo(q, 12);
  });
});
