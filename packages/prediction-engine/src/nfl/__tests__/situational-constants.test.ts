import { describe, expect, it } from "vitest";
import {
  MATERIAL_WEIGHT,
  SITUATIONAL_CONSTANTS,
  constantWeight,
  isMaterial,
  verdictCensus,
} from "../situational-constants";

describe("registry integrity", () => {
  it("keys are unique", () => {
    const keys = SITUATIONAL_CONSTANTS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry carries evidence and a cycle", () => {
    for (const c of SITUATIONAL_CONSTANTS) {
      expect(c.evidence.length).toBeGreaterThan(40);
      expect(c.cycle).toMatch(/^c\d+/);
    }
  });

  it("weights are in [0,1]", () => {
    for (const c of SITUATIONAL_CONSTANTS) {
      expect(c.weight).toBeGreaterThanOrEqual(0);
      expect(c.weight).toBeLessThanOrEqual(1);
    }
  });

  it("REFUTED constants are inert", () => {
    for (const c of SITUATIONAL_CONSTANTS) {
      if (c.verdict === "REFUTED") expect(c.weight).toBe(0);
    }
  });
});

describe("the specific kills this file exists to enforce", () => {
  it("the OL penalty is zero-weighted", () => {
    expect(constantWeight("interior_ol_penalty")).toBe(0);
    expect(isMaterial("interior_ol_penalty")).toBe(false);
  });

  it("the ILB/CB override is parked below material", () => {
    expect(constantWeight("mutual_ilb_cb_override")).toBeGreaterThan(0);
    expect(isMaterial("mutual_ilb_cb_override")).toBe(false);
  });

  it("the safety flag carries the reversed, half weight", () => {
    expect(constantWeight("safety_out_explosive")).toBe(0.5);
    expect(SITUATIONAL_CONSTANTS.find((c) => c.key === "safety_out_explosive")?.verdict).toBe(
      "REVERSED",
    );
  });

  it("wind, crew, dispersion and steam are all zero", () => {
    for (const key of [
      "wind_axis_term",
      "offensive_crew_bias",
      "cross_book_dispersion",
      "steam_following",
    ]) {
      expect(constantWeight(key)).toBe(0);
    }
  });
});

describe("census", () => {
  it("counts every entry exactly once", () => {
    const census = verdictCensus();
    const total = Object.values(census).reduce((a, b) => a + b, 0);
    expect(total).toBe(SITUATIONAL_CONSTANTS.length);
  });

  it("reports a majority of killed or parked claims", () => {
    const census = verdictCensus();
    expect(census.REFUTED + census.PARKED).toBeGreaterThan(census.FITTED);
  });
});

describe("materiality", () => {
  it("fitted claims are material", () => {
    for (const key of ["kneeldown_haircut", "market_fair_prob_ranking", "fourth_down_aggression"]) {
      expect(isMaterial(key)).toBe(true);
    }
  });

  it("unknown keys are inert rather than throwing", () => {
    expect(constantWeight("never_measured")).toBe(0);
    expect(MATERIAL_WEIGHT).toBe(0.75);
  });
});
