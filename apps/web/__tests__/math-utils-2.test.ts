import { describe, expect, it } from "vitest";

import { convertOdds, formatAmerican, oddsToProb, probToOdds } from "../lib/math/odds-format";
import { bayesianBlend, estimateMarketWeight } from "../lib/math/bayesian-blend";
import { dixonColesOutcomes, dixonColesTau, poissonPmf } from "../lib/math/dixon-coles";

// ─── Odds Format ───────────────────────────────────────────────────────────────

describe("oddsToProb", () => {
  it("converts American -110 to ~52.4%", () => {
    expect(oddsToProb(-110, "american")).toBeCloseTo(0.5238, 3);
  });
  it("converts American +100 to 50%", () => {
    expect(oddsToProb(100, "american")).toBeCloseTo(0.5, 5);
  });
  it("converts decimal 2.0 to 50%", () => {
    expect(oddsToProb(2.0, "decimal")).toBeCloseTo(0.5, 5);
  });
  it("converts probability to itself", () => {
    expect(oddsToProb(0.6, "probability")).toBeCloseTo(0.6, 5);
  });
});

describe("probToOdds", () => {
  it("converts 50% to American +100", () => {
    expect(probToOdds(0.5, "american")).toBeCloseTo(100, 0);
  });
  it("converts 52.38% to American ~-110", () => {
    expect(probToOdds(0.5238, "american")).toBeCloseTo(-110, 0);
  });
});

describe("convertOdds", () => {
  it("round-trips American → decimal → American", () => {
    const dec = convertOdds(-110, "american", "decimal");
    const back = convertOdds(dec, "decimal", "american");
    expect(back).toBeCloseTo(-110, 0);
  });
  it("same format returns same value", () => {
    expect(convertOdds(2.5, "decimal", "decimal")).toBe(2.5);
  });
});

describe("formatAmerican", () => {
  it("adds + for positive", () => {
    expect(formatAmerican(150)).toBe("+150");
  });
  it("keeps - for negative", () => {
    expect(formatAmerican(-110)).toBe("-110");
  });
});

// ─── Bayesian Blend ─────────────────────────────────────────────────────────

describe("bayesianBlend", () => {
  it("returns model prob when weight=0", () => {
    const r = bayesianBlend({ modelProb: 0.6, marketProb: 0.5, marketWeight: 0 });
    expect(r.blendedProb).toBeCloseTo(0.6, 10);
  });
  it("returns market prob when weight=1", () => {
    const r = bayesianBlend({ modelProb: 0.6, marketProb: 0.5, marketWeight: 1 });
    expect(r.blendedProb).toBeCloseTo(0.5, 10);
  });
  it("blends correctly at weight=0.5", () => {
    const r = bayesianBlend({ modelProb: 0.6, marketProb: 0.4, marketWeight: 0.5 });
    expect(r.blendedProb).toBeCloseTo(0.5, 10);
  });
  it("flags significant disagreement when diff > 0.07", () => {
    const r = bayesianBlend({ modelProb: 0.65, marketProb: 0.55, marketWeight: 0.3 });
    expect(r.significantDisagreement).toBe(true);
  });
  it("no significant disagreement when diff ≤ 0.07", () => {
    const r = bayesianBlend({ modelProb: 0.55, marketProb: 0.52, marketWeight: 0.3 });
    expect(r.significantDisagreement).toBe(false);
  });
});

describe("estimateMarketWeight", () => {
  it("base weight is at least 0.3", () => {
    expect(estimateMarketWeight({})).toBeGreaterThanOrEqual(0.3);
  });
  it("sharp action increases weight", () => {
    const base = estimateMarketWeight({});
    const sharp = estimateMarketWeight({ hasSharpAction: true });
    expect(sharp).toBeGreaterThan(base);
  });
  it("never exceeds 0.8", () => {
    const w = estimateMarketWeight({ isMarketEfficient: true, hasSharpAction: true, hoursToGame: 1 });
    expect(w).toBeLessThanOrEqual(0.8);
  });
});

// ─── Dixon-Coles ──────────────────────────────────────────────────────────────

describe("poissonPmf", () => {
  it("P(X=0 | λ=1) ≈ 0.368", () => {
    expect(poissonPmf(0, 1)).toBeCloseTo(0.3679, 3);
  });
  it("returns 0 for negative k", () => {
    expect(poissonPmf(-1, 2)).toBe(0);
  });
});

describe("dixonColesTau", () => {
  it("returns 1 for scores not in the correction set", () => {
    expect(dixonColesTau(2, 2, 1.5, 1.2, 0.1)).toBe(1);
    expect(dixonColesTau(3, 0, 1.5, 1.2, 0.1)).toBe(1);
  });
  it("returns < 1 for 0-0 when rho > 0 (upweights draw)", () => {
    // τ(0,0) = 1 − λH·λA·ρ which is < 1 when all positive
    expect(dixonColesTau(0, 0, 1.5, 1.2, 0.1)).toBeLessThan(1);
  });
});

describe("dixonColesOutcomes", () => {
  it("probabilities sum to ~1", () => {
    const r = dixonColesOutcomes(1.5, 1.2);
    expect(r.homeWin + r.draw + r.awayWin).toBeCloseTo(1, 3);
  });
  it("home team advantage reflected for stronger home team", () => {
    const r = dixonColesOutcomes(2.5, 0.8);
    expect(r.homeWin).toBeGreaterThan(r.awayWin);
  });
  it("draw probability is non-trivial (> 0.05)", () => {
    const r = dixonColesOutcomes(1.3, 1.1);
    expect(r.draw).toBeGreaterThan(0.05);
  });
});
