/**
 * Tests for ./regularized-partial-plus-minus (arXiv:1510.02172v2, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT the L1 partial-PM as a GSE player metric if on the mover test (players changing teams
 * 2024->2025) partial-PM predicts 2025 team EPA/play contribution better (higher R^2 or rank
 * correlation) than raw on/off EPA and matches or beats nflWAR.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./regularized-partial-plus-minus";

describe("regularized partial plus-minus (arXiv:1510.02172v2)", () => {
  it("pfpFromCounts shrinks to prior", () => {
    expect(mod.pfpFromCounts(0, 0)).toBeCloseTo(0.5, 10);
    expect(mod.pfpFromCounts(80, 100)).toBeCloseTo((80 + 5) / 110, 10);
    expect(mod.pfpFromCounts(5, 3)).toBeNull();
  });
  it("shrunkOnOff pulls small samples to prior", () => {
    const small = mod.shrunkOnOff(0.5, 0, 4, 100, 0, 25)!;
    const big = mod.shrunkOnOff(0.5, 0, 400, 100, 0, 25)!;
    expect(Math.abs(small)).toBeLessThan(Math.abs(big));
    expect(mod.shrunkOnOff(0.5, 0, -1, 100)).toBeNull();
  });
  it("partialPlusMinus accounting", () => {
    expect(mod.partialPlusMinus(0.5, 100, 0.1)).toBeCloseTo(0, 10);
    expect(mod.partialPlusMinus(0.6, 100, 0.1)).toBeCloseTo(2, 10);
    expect(mod.partialPlusMinus(1.5, 100, 0.1)).toBeNull();
  });
  it("aggregateOnOff splits on/off", () => {
    const rows = [
      { playerIds: ["A", "B"], teamScored: 1, epaPerEvent: 0.4 },
      { playerIds: ["A"], teamScored: 0, epaPerEvent: -0.2 },
      { playerIds: ["B"], teamScored: 1, epaPerEvent: 0.2 },
      null,
    ];
    const agg = mod.aggregateOnOff(rows);
    expect(agg.get("A")?.nOn).toBe(2);
    expect(agg.get("A")?.nOff).toBe(1);
    expect(agg.get("B")?.onEpa).toBeCloseTo(0.6, 10);
  });
});
