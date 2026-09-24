import { describe, expect, it } from "vitest";
import { createEcdd, ecddUpdate, ecddWorstCaseDelay } from "./ecdd-monitor";

describe("ecdd-monitor", () => {
  it("stays quiet on in-control Bernoulli(0.5) outcomes", () => {
    let s = createEcdd();
    // alternating outcomes hover at the baseline
    for (let i = 0; i < 200; i++) {
      s = ecddUpdate(s, (i % 2) as 0 | 1);
    }
    expect(s.alarmed).toBe(false);
  });

  it("alarms on a sustained error run (drift)", () => {
    let s = createEcdd();
    let firedAt = -1;
    for (let i = 0; i < 60; i++) {
      s = ecddUpdate(s, 1);
      if (s.alarmed && firedAt < 0) firedAt = i;
    }
    expect(firedAt).toBeGreaterThanOrEqual(0);
    expect(firedAt).toBeLessThan(40); // fast detection for a total regime flip
  });

  it("season reset clears the alarm state", () => {
    let s = createEcdd();
    for (let i = 0; i < 60; i++) s = ecddUpdate(s, 1);
    expect(s.alarmed).toBe(true);
    const fresh = createEcdd();
    expect(fresh.alarmed).toBe(false);
    expect(fresh.n).toBe(0);
  });

  it("worst-case delay is finite and sane", () => {
    const d = ecddWorstCaseDelay();
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(100);
  });

  it("rejects invalid lambda", () => {
    expect(() => ecddUpdate(createEcdd(), 1, { lambda: 0 })).toThrow();
    expect(() => ecddUpdate(createEcdd(), 1, { lambda: 1.5 })).toThrow();
  });

  it("empty stream never alarms", () => {
    expect(createEcdd().alarmed).toBe(false);
  });
});
