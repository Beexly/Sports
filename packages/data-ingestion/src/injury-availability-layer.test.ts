/**
 * Tests for ./injury-availability-layer (arXiv:1705.08079v2, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADOPT iff the model achieves precision >= 0.35 with recall >= 0.50 in the forward weekly
 * simulation on the 2025 test season.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./injury-availability-layer";

describe("injury availability layer (arXiv:1705.08079v2)", () => {
  it("ewma converges toward recent values", () => {
    const e = mod.ewma([10, 10, 10, 50, 50], 4)!;
    expect(e[e.length - 1]!).toBeGreaterThan(30);
    expect(e[0]).toBe(10);
    expect(mod.ewma([], 4)).toBeNull();
    expect(mod.ewma([1, 2], 1)).toBeNull();
  });
  it("acwr", () => {
    expect(mod.acwr(1.2, 0.8)).toBeCloseTo(1.5, 10);
    expect(mod.acwr(1, 0)).toBeNull();
    expect(mod.acwr(-1, 1)).toBeNull();
  });
  it("monotony", () => {
    expect(mod.monotony([10, 10, 10])).toBeNull();
    expect(mod.monotony([8, 10, 12])!).toBeGreaterThan(0);
  });
  it("builds the full feature row", () => {
    const row = mod.buildInjuryFeatures({
      snapLoads: [60, 65, 70, 55, 68, 72, 66],
      practice: ["full", "full", "limited", "full", "full"],
      priorInjuries: [0, 0, 1, 0, 0],
      daysSinceGame: 7,
      restDays: 6,
      travelMiles: 1200,
      age: 26,
      bmi: 28.5,
      position: "WR",
    })!;
    expect(row.ewmaLoad).toBeGreaterThan(0);
    expect(row.position).toBe("WR");
  });
  it("null on malformed", () => {
    expect(
      mod.buildInjuryFeatures({
        snapLoads: [], practice: ["full"], priorInjuries: [0],
        daysSinceGame: 7, restDays: 6, travelMiles: 0, age: 25, bmi: 27, position: "QB",
      }),
    ).toBeNull();
  });
});
