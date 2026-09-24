import { describe, expect, it } from "vitest";
import { decomposeAttribution, ownEffect, rmse, GSE_ATTRIBUTION_ENABLED } from "./attribution-schema-2403.js";

describe("attribution schema", () => {
  it("decomposes observed into components + residual", () => {
    const r = decomposeAttribution({
      playerId: "p1", position: "WR", teamId: "KC", schemeId: "reid",
      observed: 2.1, beta0: 1.5, bScheme: 0.2, bPlayer: 0.3, bAlly: 0.1, bEnemy: -0.1,
    });
    expect(r.residual).toBeCloseTo(2.1 - 2.0, 10);
    expect(ownEffect(r)).toBeCloseTo(2.0, 10);
  });
  it("defaults ally/enemy to 0", () => {
    const r = decomposeAttribution({
      playerId: "p1", position: "RB", teamId: "KC", schemeId: "reid",
      observed: 5.0, beta0: 4.0, bScheme: 0.5, bPlayer: 0.5,
    });
    expect(r.components.ally).toBe(0);
    expect(r.residual).toBeCloseTo(0, 10);
  });
  it("rmse is 0 on perfect predictions, Infinity on mismatched input", () => {
    expect(rmse([1, 2], [1, 2])).toBe(0);
    expect(rmse([1], [1, 2])).toBe(Infinity);
    expect(rmse([], [])).toBe(Infinity);
  });
  it("handles empty and degenerate input", () => {
    expect(rmse([], [1])).toBe(Infinity);
    // zero residual decomposes cleanly
    expect(ownEffect({ playerId: "p", position: "QB", teamId: "t", schemeId: "s", observed: 1.5, components: { own: 1.5, ally: 0, enemy: 0 }, residual: 0 })).toBeCloseTo(1.5, 10);
  });
  it("stays off until the RMSE gate clears", () => {
    expect(GSE_ATTRIBUTION_ENABLED).toBe(false);
  });
});

