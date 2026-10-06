/**
 * Props model-probability tests.
 *
 * The load-bearing assertion: model P(over) comes from the ENGINE's projection
 * distribution, never the market's devigged price. When the market implies
 * 0.50 and the engine implies 0.70, this module must return 0.70.
 */
import { describe, expect, it } from "vitest";
import {
  buildModelProbOver,
  modelProbOverForProp,
  PROP_STAT_MAP,
} from "@/lib/ops/props-model-prob";
import type { MarketAnchoredPlayerProjection } from "@sports/prediction-engine";

function proj(
  over: Partial<MarketAnchoredPlayerProjection> = {},
): MarketAnchoredPlayerProjection {
  return {
    playerId: "p1",
    teamSide: "home",
    position: "WR",
    allocationWeight: 0.2,
    passingYards: 0,
    rushingYards: 0,
    receivingYards: 62.5,
    passingTouchdowns: 0,
    rushingTouchdowns: 0,
    receivingTouchdowns: 0.4,
    projectedYards: 62.5,
    projectedTouchdowns: 0.4,
    fantasyPoints: 10,
    divergence: 0,
    priced: false,
    status: "shadow",
    ...over,
  };
}

describe("props model-probability producer", () => {
  it("maps the yard prop markets to normal distributions", () => {
    expect(PROP_STAT_MAP["player_pass_yds"]?.dist).toBe("normal");
    expect(PROP_STAT_MAP["player_rush_yds"]?.dist).toBe("normal");
    expect(PROP_STAT_MAP["player_reception_yds"]?.dist).toBe("normal");
    expect(PROP_STAT_MAP["player_pass_tds"]?.dist).toBe("poisson");
    expect(PROP_STAT_MAP["player_anytime_td"]?.dist).toBe("poisson");
  });

  it("returns ~0.5 when the line equals the engine mean (normal)", () => {
    const p = modelProbOverForProp(proj(), "player_reception_yds", 62.5);
    expect(p).not.toBeNull();
    expect(Math.abs(p! - 0.5)).toBeLessThan(0.01);
  });

  it("favors over when the engine mean is above the line", () => {
    const p = modelProbOverForProp(proj({ receivingYards: 80 }), "player_reception_yds", 62.5);
    expect(p).toBeGreaterThan(0.5);
  });

  it("favors under when the engine mean is below the line", () => {
    const p = modelProbOverForProp(proj({ receivingYards: 45 }), "player_reception_yds", 62.5);
    expect(p).toBeLessThan(0.5);
  });

  it("prices TD props with Poisson, not normal", () => {
    // lambda 0.4, line 0.5: P(X >= 1) = 1 - e^-0.4 ≈ 0.330
    const p = modelProbOverForProp(proj(), "player_reception_tds", 0.5);
    expect(p).not.toBeNull();
    expect(Math.abs(p! - (1 - Math.exp(-0.4)))).toBeLessThan(0.01);
  });

  it("prices anytime-TD as P(score >= 1) over all TD means", () => {
    const lambda = 0.1 + 0.2 + 0.4;
    const p = modelProbOverForProp(
      proj({ passingTouchdowns: 0.1, rushingTouchdowns: 0.2, receivingTouchdowns: 0.4 }),
      "player_anytime_td",
      0.5,
    );
    expect(p).not.toBeNull();
    expect(Math.abs(p! - (1 - Math.exp(-lambda)))).toBeLessThan(0.01);
  });

  it("NEVER substitutes market-implied probability for model probability", () => {
    // Market: -110/-110 implies P(over) = 0.50 after devig.
    // Engine: mean 80 vs line 62.5 with measured WR CV 0.876 -> P(over) ≈ 0.60.
    // (The CV is honestly wide — weekly yards are high-variance — so the edge
    // is modest, not exaggerated.) The producer only sees the engine
    // projection; the market price is not even an input. If this ever returned
    // 0.50, the edge would be circular.
    const p = modelProbOverForProp(proj({ receivingYards: 80 }), "player_reception_yds", 62.5);
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0.55);
    expect(Math.abs(p! - 0.5)).toBeGreaterThan(0.05);
  });

  it("returns null for unsupported propTypes — never imputed", () => {
    expect(modelProbOverForProp(proj(), "player_pass_completions", 20.5)).toBeNull();
    expect(modelProbOverForProp(proj(), "player_receptions", 5.5)).toBeNull();
  });

  it("returns null for non-positive or non-finite means", () => {
    expect(modelProbOverForProp(proj({ receivingYards: 0 }), "player_reception_yds", 62.5)).toBeNull();
    expect(modelProbOverForProp(proj({ receivingYards: -5 }), "player_reception_yds", 62.5)).toBeNull();
    expect(modelProbOverForProp(proj(), "player_reception_yds", NaN)).toBeNull();
  });

  it("omits degenerate sub-yard allocations instead of pricing P(over)~0", () => {
    // A 0.3-yard mean is a broken allocation, not a real projection — it must
    // not produce a fake-certain P(over)≈0 that the slate would then bet.
    expect(modelProbOverForProp(proj({ receivingYards: 0.3 }), "player_reception_yds", 62.5)).toBeNull();
    // But a genuinely small TD mean still prices (Poisson handles it).
    const p = modelProbOverForProp(proj({ receivingTouchdowns: 0.05 }), "player_reception_tds", 0.5);
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0);
    expect(p!).toBeLessThan(0.1);
  });

  it("buildModelProbOver keys by playerId:propType and omits the unpriceable", () => {
    const projections = new Map([["p1", proj()], ["p2", proj({ receivingYards: 0 })]]);
    const out = buildModelProbOver(projections, [
      { playerId: "p1", propType: "player_reception_yds", line: 62.5 },
      { playerId: "p1", propType: "player_pass_completions", line: 20.5 },
      { playerId: "p2", propType: "player_reception_yds", line: 62.5 },
      { playerId: "p3", propType: "player_reception_yds", line: 62.5 },
    ]);
    expect(Object.keys(out)).toEqual(["p1:player_reception_yds"]);
    expect(out["p1:player_reception_yds"]).toBeGreaterThan(0.49);
    expect(out["p1:player_reception_yds"]).toBeLessThan(0.51);
  });
});
