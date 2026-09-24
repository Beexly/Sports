/**
 * Vitest suite for arXiv:2602.06986 (DISCOVER: A Physics-Informed, GPU-Accelerated Symbolic Regression Framework).
 * Gate: ADAPT if the unit filter prunes >= 40% of generated candidates pre-search AND zero historically selected features are pruned AND validation Brier stays within 1% of the unconstrained run.
 */
import { describe, it, expect } from "vitest";
import { combineUnits, pruneByUnits, SportsUnit } from "./2602-06986-discover-a-physicsinformed-gpuaccelerated-symbolic";

describe("2602-06986 sports unit registry", () => {
  it("enforces unit algebra", () => {
    expect(combineUnits("points", "+", "points")).toBe("points");
    expect(combineUnits("points", "+", "yards")).toBe(null);
    expect(combineUnits("epa", "*", "dimensionless")).toBe("epa");
    expect(combineUnits("yards", "/", "yards")).toBe("dimensionless");
    expect(combineUnits("yards", "*", "yards")).toBe(null);
  });
  it("prunes unit-invalid candidates before the search", () => {
    const cands = [
      { name: "epa_play", unit: "epa" as SportsUnit },
      { name: "air_yards", unit: "yards" as SportsUnit },
      { name: "wp_delta", unit: "probability" as SportsUnit },
      { name: "k", unit: "dimensionless" as SportsUnit },
    ];
    const { kept, pruned } = pruneByUnits(cands, "epa");
    expect(kept.map((c) => c.name).sort()).toEqual(["epa_play", "k"]);
    expect(pruned.map((c) => c.name).sort()).toEqual(["air_yards", "wp_delta"]);
  });
});
