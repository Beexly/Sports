import { describe, it, expect } from "vitest";
import { computeEnvironmentScore, loadEnvironmentScore, NFL_VENUE_ENV } from "./environment";
import type { EnvironmentFactor } from "./types";

const f = (value: number): EnvironmentFactor => ({ value, source: "test", tier: "modeled", asOf: "2026-06-06" });

describe("computeEnvironmentScore", () => {
  it("re-normalizes over present factors so missing data never fabricates a score", () => {
    const r = computeEnvironmentScore({ surfaceQuality: f(100) });
    expect(r.overall).toBe(100);
    expect(r.presentFactorCount).toBe(1);
  });

  it("clamps factor values into 0..100", () => {
    expect(computeEnvironmentScore({ surfaceQuality: f(9999) }).overall).toBe(100);
    expect(computeEnvironmentScore({ surfaceQuality: f(-50) }).overall).toBe(0);
  });

  it("returns 0 with no weighted factors present", () => {
    expect(computeEnvironmentScore({}).overall).toBe(0);
  });
});

describe("loadEnvironmentScore", () => {
  it("scores a grass open-air venue from public facts", () => {
    const r = loadEnvironmentScore({ team: "GB" });
    expect(r.factors.surfaceQuality?.value).toBe(85); // grass
    expect(r.factors.climateContext?.value).toBe(70); // open-air
    expect(r.overall).toBe(79); // (.15*85 + .10*70) / .25
    expect(r.presentFactorCount).toBe(2);
  });

  it("scores a synthetic controlled-roof venue from public facts", () => {
    const r = loadEnvironmentScore({ team: "det" }); // case-insensitive
    expect(r.factors.surfaceQuality?.value).toBe(60); // synthetic
    expect(r.factors.climateContext?.value).toBe(90); // controlled
    expect(r.overall).toBe(72);
  });

  it("renders an honest empty score for an unknown team", () => {
    const r = loadEnvironmentScore({ team: "ZZZ" });
    expect(r.overall).toBe(0);
    expect(r.factors).toEqual({});
    expect(r.note).toContain("empty");
  });

  it("covers all 32 NFL teams with public venue facts", () => {
    expect(Object.keys(NFL_VENUE_ENV)).toHaveLength(32);
    for (const code of Object.keys(NFL_VENUE_ENV)) {
      expect(loadEnvironmentScore({ team: code }).overall).toBeGreaterThan(0);
    }
  });
});
