import { describe, it, expect } from "vitest";
import { DIMENSIONS, computeProfile, type BiasKey } from "./mirror";

const all = (v: number): Record<BiasKey, number> =>
  Object.fromEntries(DIMENSIONS.map((d) => [d.key, v])) as Record<BiasKey, number>;

describe("computeProfile — protective, threshold-based reflection", () => {
  it("low tendencies → Standard mode, strengths, no patterns", () => {
    const p = computeProfile(all(0.1));
    expect(p.mode).toBe("Standard");
    expect(p.patterns.length).toBe(0);
    expect(p.strengths.length).toBe(DIMENSIONS.length);
  });

  it("high tendencies → Cool-down mode, all patterns flagged, guidance given", () => {
    const p = computeProfile(all(0.9));
    expect(p.mode).toBe("Cool-down");
    expect(p.patterns.length).toBe(DIMENSIONS.length);
    expect(p.strengths.length).toBe(0);
    expect(p.guidance.length).toBeGreaterThan(0);
  });

  it("mid tendencies → Watch Mode", () => {
    const p = computeProfile(all(0.45));
    expect(p.mode).toBe("Watch Mode");
  });

  it("always returns at least one piece of guidance", () => {
    expect(computeProfile(all(0.1)).guidance.length).toBeGreaterThan(0);
    expect(computeProfile(all(0.5)).guidance.length).toBeGreaterThan(0);
  });
});
