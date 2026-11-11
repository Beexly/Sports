import { describe, it, expect } from "vitest";
import { checkDimension, filterByDimension, SLOT_DIMENSIONS } from "../../research/dimensions.js";
import { resolveProjectionWiring, PARAM_NAMES } from "../../research/projection-params.js";
import { loadRegistry } from "../../research/registry.js";
import { DEFAULT_PROJECTION_PARAMETERS } from "../../player-projection.js";

describe("dimension gate", () => {
  it("accepts a value inside the declared range", () => {
    expect(checkDimension("regression_games", 8).accepted).toBe(true);
  });

  it("rejects a day-scale half-life offered to a games-based slot", () => {
    // real corpus value: 390 days, from a Premier League Elo paper
    const v = checkDimension("recency_half_life", 390);
    expect(v.accepted).toBe(false);
    expect(v.reason).toContain("outside");
  });

  it("rejects an oversized shrinkage constant", () => {
    // real corpus value: 640, which was actually a match-progress bucket
    expect(checkDimension("shrinkage_k", 640).accepted).toBe(false);
  });

  it("accepts every Brier score in [0,1] and rejects outside it", () => {
    expect(checkDimension("brier_target", 0).accepted).toBe(true);
    expect(checkDimension("brier_target", 0.25).accepted).toBe(true);
    expect(checkDimension("brier_target", 1).accepted).toBe(true);
    expect(checkDimension("brier_target", 1.2).accepted).toBe(false);
  });

  it("rejects unknown slots and non-finite values", () => {
    expect(checkDimension("not_a_slot", 1).accepted).toBe(false);
    expect(checkDimension("regression_games", Number.NaN).accepted).toBe(false);
  });

  it("splits a list without rescaling or silently dropping silently-reported items", () => {
    const { kept, rejected } = filterByDimension([
      { name: "brier_target", value: 0.2072 },
      { name: "recency_half_life", value: 390 },
      { name: "shrinkage_k", value: 640 },
      { name: "calibration_bins", value: 20 },
    ]);
    expect(kept.map((k) => k.name)).toEqual(["brier_target", "calibration_bins"]);
    expect(rejected).toHaveLength(2);
    expect(rejected.every((r) => typeof r.reason === "string")).toBe(true);
  });

  it("declares a unit for every slot it knows about", () => {
    for (const [name, dim] of Object.entries(SLOT_DIMENSIONS)) {
      expect(dim.unit.length).toBeGreaterThan(0);
      expect(dim.min).toBeLessThanOrEqual(dim.max);
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe("wiring applies the gate", () => {
  it("never lets an out-of-dimension value move a projection slot", () => {
    const evidence = loadRegistry([
      {
        paper_title: "Elo half-life paper",
        lane: "calibration",
        confidence: 1,
        enabled: true,
        parameters: [{ name: "recency_half_life", value: 390 }],
      },
    ]);
    const r = resolveProjectionWiring(evidence, 1);
    expect(r.moved).toBe(false);
    expect(r.parameters.regressionGames).toBe(DEFAULT_PROJECTION_PARAMETERS.regressionGames);
  });

  it("lets an in-dimension value through", () => {
    const evidence = loadRegistry([
      {
        paper_title: "Tau shrinkage paper",
        lane: "modeling",
        confidence: 1,
        enabled: true,
        parameters: [{ name: PARAM_NAMES.regressionGames, value: 10 }],
      },
    ]);
    const r = resolveProjectionWiring(evidence, 1);
    expect(r.moved).toBe(true);
    expect(r.parameters.regressionGames).toBe(10);
  });
});
