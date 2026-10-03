import { describe, expect, it } from "vitest";
import { benjaminiHochberg, binomialP, fitRestDecay, honestyGate } from "./situational-honesty-filter";

describe("situational-honesty-filter", () => {
  it("binomialP is small for a strong ATS record", () => {
    expect(binomialP(130, 220)).toBeLessThan(0.01);
    expect(binomialP(110, 220)).toBeGreaterThan(0.2);
  });
  it("benjaminiHochberg adjusts monotone and caps at 1", () => {
    const adj = benjaminiHochberg([0.01, 0.04, 0.5]);
    expect(adj[0] ?? 0).toBeLessThanOrEqual(adj[1] ?? 0);
    expect(adj[2] ?? 0).toBeLessThanOrEqual(1);
    expect(adj[0] ?? 0).toBeCloseTo(0.03, 6);
  });
  it("honestyGate passes a clean spot and fails noisy ones", () => {
    const good = {
      covers: 125, n: 220, placeboRate: 0.5, placeboN: 220, clvBeatRate: 0.56,
    };
    const v = honestyGate(good, 0.01);
    expect(v.pass).toBe(true);
    expect(v.failedLegs).toEqual([]);
    const weak = { ...good, covers: 112 };
    expect(honestyGate(weak, 0.01).pass).toBe(false);
    const sig = { ...good, covers: 125 };
    expect(honestyGate(sig, 0.2).failedLegs.join()).toContain("significance");
    const badPlacebo = { ...good, placeboRate: 0.56, placeboN: 400 };
    expect(honestyGate(badPlacebo, 0.01).failedLegs.join()).toContain("placebo");
    const badClv = { ...good, clvBeatRate: 0.49 };
    expect(honestyGate(badClv, 0.01).failedLegs.join()).toContain("clv");
    const small = { ...good, n: 150, covers: 85 };
    expect(honestyGate(small, 0.01).failedLegs.join()).toContain("sample");
  });
  it("fitRestDecay recovers an exponential decay", () => {
    const hours = [96, 144, 192, 240, 336];
    const effects = hours.map((h) => 0.08 * Math.exp(-h / 150));
    const { a, tau } = fitRestDecay(hours, effects);
    expect(a).toBeCloseTo(0.08, 2);
    expect(tau).toBeCloseTo(150, 0);
    expect(() => fitRestDecay([100], [0.1])).toThrow();
  });
});
