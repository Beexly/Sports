import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pregameFeatureIsPriced, pressureStateEpa, snapStateEpa } from "./snap-state";

describe("snap state, not a Tuesday side", () => {
  it("prices motion and play-action only once the shell is known", () => {
    const bothSingle = snapStateEpa(true, true, "single");
    const bothTwo = snapStateEpa(true, true, "two");
    const nothing = snapStateEpa(false, false, "single");
    expect(bothSingle).toEqual({ n: 5232, epa: 0.173 });
    expect(bothTwo.n).toBe(3044);
    expect(bothSingle.epa).toBeGreaterThan(bothTwo.epa);
    expect(Math.abs(nothing.epa)).toBeLessThan(0.02);
    expect(nothing.n).toBeGreaterThan(10000);
  });

  it("shows pressure costing the held ball and not the quick throw", () => {
    const heldClean = pressureStateEpa(false, false);
    const heldPressure = pressureStateEpa(false, true);
    const quickPressure = pressureStateEpa(true, true);
    expect(heldClean.epa).toBeGreaterThan(0.2);
    expect(heldPressure.epa).toBeLessThan(0);
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
  });
});
