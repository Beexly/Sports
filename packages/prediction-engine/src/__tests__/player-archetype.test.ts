import { describe, it, expect } from "vitest";
import { classifyUsageProfile, type UsageProfileInput } from "../player-archetype.js";

function rb(o: Partial<UsageProfileInput>): UsageProfileInput {
  return { position: "RB", games: 16, carries: 0, receptions: 0, targets: 0, rushingYards: 0, receivingYards: 0, ...o };
}

describe("classifyUsageProfile", () => {
  it("flags a receiving back by reception share", () => {
    const p = classifyUsageProfile(rb({ carries: 80, receptions: 70, receivingYards: 600, rushingYards: 350 }));
    expect(p.receivingShare).toBeCloseTo(0.47, 2);
    expect(p.archetype).toBe("receiving");
  });

  it("flags an early-down / power back", () => {
    const p = classifyUsageProfile(rb({ carries: 250, receptions: 20, rushingYards: 1100, receivingYards: 120 }));
    expect(p.archetype).toBe("early-down/power");
    expect(p.workloadTier).toBe("lead"); // 270/16 ≈ 16.9
  });

  it("flags a bell-cow by touches per game", () => {
    const p = classifyUsageProfile(rb({ carries: 280, receptions: 60 }));
    expect(p.touchesPerGame).toBeCloseTo(21.25, 2);
    expect(p.workloadTier).toBe("bell-cow");
    expect(p.archetype).toBe("balanced"); // 60/340 ≈ 0.176
  });

  it("flags a low-usage depth player", () => {
    const p = classifyUsageProfile(rb({ carries: 10, receptions: 5 }));
    expect(p.archetype).toBe("low-usage");
    expect(p.workloadTier).toBe("depth");
  });

  it("computes yards per touch", () => {
    const p = classifyUsageProfile(rb({ carries: 100, rushingYards: 500, receptions: 50, receivingYards: 400 }));
    expect(p.yardsPerTouch).toBeCloseTo(6, 2); // 900 / 150
  });

  it("is safe with zero usage", () => {
    const p = classifyUsageProfile(rb({}));
    expect(p.receivingShare).toBe(0);
    expect(p.yardsPerTouch).toBe(0);
    expect(p.archetype).toBe("low-usage");
  });
});
