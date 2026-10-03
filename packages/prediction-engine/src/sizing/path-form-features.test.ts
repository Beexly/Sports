import { describe, expect, it } from "vitest";
import {
  bankrollRegimeAllowsRamp,
  decomposePath,
  pathQualityScore,
} from "./path-form-features";

describe("path-form-features", () => {
  it("decomposes a path with a slump and recovery", () => {
    // +5, +5 (peak 10), -8, -8 (trough -6), +10 (end 4)
    const d = decomposePath([5, 5, -8, -8, 10]);
    expect(d.cumulative).toBeCloseTo(4, 10);
    expect(d.maxDrawdown).toBeCloseTo(16, 10); // 10 -> -6
    expect(d.recovery).toBeCloseTo(10, 10); // -6 -> 4
    expect(d.troughIndex).toBe(3);
  });

  it("no-slump path has zero MDD and zero recovery", () => {
    const d = decomposePath([3, 3, 3]);
    expect(d.maxDrawdown).toBe(0);
    expect(d.recovery).toBe(0);
    expect(d.cumulative).toBe(9);
  });

  it("empty path is degenerate-but-safe", () => {
    const d = decomposePath([]);
    expect(d).toEqual({ cumulative: 0, maxDrawdown: 0, recovery: 0, troughIndex: -1 });
  });

  it("path quality rewards recovery and penalizes slumps", () => {
    const healthy = decomposePath([5, 5, -2, 6]);
    const slumpy = decomposePath([5, 5, -16, 6]);
    expect(pathQualityScore(healthy)).toBeGreaterThan(pathQualityScore(slumpy));
  });

  it("bankroll gate blocks ramp-up mid-slump, allows after recovery", () => {
    expect(bankrollRegimeAllowsRamp([10, -30])).toBe(false); // deep, no recovery
    expect(bankrollRegimeAllowsRamp([10, -30, 25])).toBe(true); // recovered
    expect(bankrollRegimeAllowsRamp([5, 5, 5])).toBe(true); // no slump
    expect(bankrollRegimeAllowsRamp([])).toBe(true);
  });
});
