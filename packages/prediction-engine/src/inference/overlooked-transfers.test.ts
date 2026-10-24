import { describe, expect, it } from "vitest";
import { scheduleMarketEmissionCount } from "./deepinfer-dspark-speculator.js";
import { composeFromMeasuredContrast } from "../continual/harness2-propose-probe-compose.js";

describe("overlooked transfers", () => {
  it("emits one market on a coin flip and more when the game is sharp", () => {
    expect(scheduleMarketEmissionCount(0.5)).toBe(1);
    expect(scheduleMarketEmissionCount(0.97)).toBeGreaterThan(1);
    expect(scheduleMarketEmissionCount(0.97)).toBeLessThanOrEqual(5);
  });

  it("emits nothing for a probability that is not a forecast", () => {
    expect(scheduleMarketEmissionCount(0)).toBe(0);
    expect(scheduleMarketEmissionCount(1)).toBe(0);
    expect(scheduleMarketEmissionCount(Number.NaN)).toBe(0);
  });

  it("does not adopt a harness mutation without a positive measured contrast", () => {
    const kept = composeFromMeasuredContrast("baseline", "mutated", null);
    expect(kept.adopted).toBe(false);
    expect(kept.selected).toBe("baseline");
    expect(kept.claimedImprovement).toBe(0);
    const adopted = composeFromMeasuredContrast("baseline", "mutated", 0.02);
    expect(adopted.adopted).toBe(true);
    expect(adopted.selected).toBe("mutated");
  });
});
