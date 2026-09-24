import { describe, expect, it } from "vitest";
import {
  OFFLINE_STRENGTH_BAKEOFF_FIXTURE,
  eloWinProb,
  runOfflineStrengthFeatureBakeoff,
} from "./offline-strength-feature-bakeoff";

describe("eloWinProb", () => {
  it("is 0.5 at equal ratings", () => {
    expect(eloWinProb(0)).toBeCloseTo(0.5);
  });
  it("rises with positive Elo differential", () => {
    expect(eloWinProb(200)).toBeGreaterThan(0.5);
  });
});

describe("runOfflineStrengthFeatureBakeoff", () => {
  it("scores fixture without DB", () => {
    const r = runOfflineStrengthFeatureBakeoff(OFFLINE_STRENGTH_BAKEOFF_FIXTURE);
    expect(r.n).toBe(6);
    expect(r.byFeature.map((f) => f.feature)).toEqual([
      "current",
      "elo",
      "btl",
      "pi",
      "market",
    ]);
    expect(r.byFeature.every((f) => f.n === 6)).toBe(true);
    expect(r.bySport.length).toBe(3);
  });

  it("handles empty", () => {
    const r = runOfflineStrengthFeatureBakeoff([]);
    expect(r.n).toBe(0);
    expect(r.byFeature.every((f) => f.brier === null)).toBe(true);
  });

  it("does not mutate fixture", () => {
    const copy = structuredClone(OFFLINE_STRENGTH_BAKEOFF_FIXTURE);
    runOfflineStrengthFeatureBakeoff(OFFLINE_STRENGTH_BAKEOFF_FIXTURE);
    expect(OFFLINE_STRENGTH_BAKEOFF_FIXTURE).toEqual(copy);
  });
});
