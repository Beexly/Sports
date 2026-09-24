import { describe, expect, it } from "vitest";
import {
  flagMispriced,
  quantizeToTiers,
  tierErrorCost,
  top3TierAccuracy,
} from "./value-tier";

describe("value-tier", () => {
  it("quantizeToTiers spreads values across tiers monotonically", () => {
    const vals = [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
    const tiers = quantizeToTiers(vals, 4);
    expect(tiers).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(quantizeToTiers([], 4)).toEqual([]);
    expect(() => quantizeToTiers(vals, 1)).toThrow();
  });

  it("tierErrorCost penalizes far misses more", () => {
    const near = tierErrorCost([5, 6], [5, 7]);
    const far = tierErrorCost([5, 10], [5, 7]);
    expect(far).toBeGreaterThan(near);
    expect(tierErrorCost([5], [5])).toBe(0);
    expect(() => tierErrorCost([1], [])).toThrow();
  });

  it("top3TierAccuracy counts near misses", () => {
    expect(top3TierAccuracy([10, 1], [12, 10])).toBe(0.5);
    expect(() => top3TierAccuracy([], [])).toThrow();
  });

  it("flagMispriced finds model-tier >> salary-tier value", () => {
    const flags = flagMispriced(
      ["a", "b", "c"],
      [5, 15, 10],
      [12, 14, 10],
      3,
    );
    expect(flags.find((f) => f.id === "a")!.value).toBe(true); // gap 7
    expect(flags.find((f) => f.id === "b")!.value).toBe(false); // gap -1
    expect(flags.find((f) => f.id === "c")!.value).toBe(false); // gap 0
    expect(() => flagMispriced(["a"], [1], [1, 2])).toThrow();
  });
});
