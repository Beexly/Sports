import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { playActionMotion } from "./situational-reality";
import { pregameFeatureIsPriced, pressureStateEpa, snapStateEpa } from "./snap-state";

describe("one snap table", () => {
  it("pools the shell cube, and the gap holds in every season", () => {
    const single = snapStateEpa(true, true, "single");
    const split = snapStateEpa(true, true, "split");
    expect(single.n).toBe(1645 + 2003 + 2008);
    expect(split.n).toBe(733 + 888 + 1107);
    expect(single.epa).toBeCloseTo(946.694 / 5656, 5);
    expect(single.epa).toBeGreaterThan(split.epa);
    for (const season of [2023, 2024, 2025]) {
      const s = playActionMotion(season, "PA", "MOT", "SINGLE");
      const t = playActionMotion(season, "PA", "MOT", "SPLIT");
      expect(s!.epaPerPlay).toBeGreaterThan(t!.epaPerPlay);
    }
  });

  it("keeps an empty call small relative to motion and play-action against single-high", () => {
    const empty = snapStateEpa(false, false, "single");
    const called = snapStateEpa(true, true, "single");
    expect(empty.n).toBe(5484 + 5133 + 4203);
    expect(called.epa).toBeGreaterThan(empty.epa * 3);
  });

  it("shows pressure costing the held ball and not the quick throw", () => {
    const heldClean = pressureStateEpa(false, false);
    const heldPressure = pressureStateEpa(false, true);
    const quickPressure = pressureStateEpa(true, true);
    expect(heldClean).toEqual({ n: 28414, epa: 0.277 });
    expect(heldPressure).toEqual({ n: 11681, epa: -0.141 });
    expect(heldClean.epa - heldPressure.epa).toBeGreaterThan(0.4);
    expect(quickPressure.epa).toBeGreaterThan(heldPressure.epa);
  });

  it("does not let a pre-game average of those rates move a side", () => {
    expect(pregameFeatureIsPriced("motion")).toBe(true);
    expect(pregameFeatureIsPriced("playAction")).toBe(true);
    expect(pregameFeatureIsPriced("epa")).toBe(true);
  });

  it("is not imported by scoring", () => {
    const scoring = readFileSync(join(__dirname, "..", "scoring.ts"), "utf8");
    expect(scoring.includes("snap-state")).toBe(false);
    expect(scoring.includes("league_sii")).toBe(false);
  });
});
