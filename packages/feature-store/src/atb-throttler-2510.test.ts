import { describe, expect, it } from "vitest";
import {
  atbAllow,
  atbObserve,
  initAtb,
  simulateWeek,
  DEFAULT_ATB_CONFIG,
} from "./atb-throttler-2510.js";

describe("atb throttler", () => {
  it("allows requests while tokens remain, then asks to wait", () => {
    let s = initAtb(DEFAULT_ATB_CONFIG, 0);
    for (let i = 0; i < DEFAULT_ATB_CONFIG.capacity; i++) {
      const r = atbAllow(s, DEFAULT_ATB_CONFIG, 0);
      expect(r.verdict).toBe("allow");
      s = r.state;
    }
    const r = atbAllow(s, DEFAULT_ATB_CONFIG, 0);
    expect(r.verdict).toBe("wait");
    expect(r.waitMs).toBeGreaterThan(0);
  });

  it("refills tokens over time", () => {
    let s = initAtb(DEFAULT_ATB_CONFIG, 0);
    for (let i = 0; i < DEFAULT_ATB_CONFIG.capacity; i++) s = atbAllow(s, DEFAULT_ATB_CONFIG, 0).state;
    const later = atbAllow(s, DEFAULT_ATB_CONFIG, 60_000);
    expect(later.verdict).toBe("allow");
  });

  it("shrinks the rate on 429s and regrows on success", () => {
    let s = initAtb(DEFAULT_ATB_CONFIG, 0);
    const before = s.rate;
    s = atbObserve(s, DEFAULT_ATB_CONFIG, "rate_limited");
    expect(s.rate).toBeCloseTo(before * DEFAULT_ATB_CONFIG.beta, 9);
    expect(s.rate).toBeGreaterThanOrEqual(DEFAULT_ATB_CONFIG.minRate);
    for (let i = 0; i < 200; i++) s = atbObserve(s, DEFAULT_ATB_CONFIG, "success");
    expect(s.rate).toBe(DEFAULT_ATB_CONFIG.maxRate);
  });

  it("hard errors leave the rate untouched", () => {
    const s = initAtb(DEFAULT_ATB_CONFIG, 0);
    const s2 = atbObserve(s, DEFAULT_ATB_CONFIG, "error");
    expect(s2.rate).toBe(s.rate);
    expect(s2.throttled429s).toBe(0);
  });

  it("simulation shows 429 reduction vs the fixed-sleep baseline", () => {
    const outcomes = Array.from({ length: 200 }, (_, i) =>
      i % 5 === 4 ? "rate_limited" : "success",
    ) as Array<"success" | "rate_limited">;
    const sim = simulateWeek(outcomes);
    expect(sim.baseline429s).toBe(40);
    expect(sim.atb429s).toBeLessThan(sim.baseline429s);
    expect(sim.reduction).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const sim = simulateWeek([]);
    expect(sim.atb429s).toBe(0);
    expect(sim.reduction).toBe(0);
  });
});
