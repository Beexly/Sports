import { describe, it, expect } from "vitest";
import {
  wilsonInterval,
  formatWilsonPct,
  clearsThreshold,
  Z_95,
} from "@/lib/performance/wilson-interval";

describe("Wilson score interval", () => {
  it("returns null with no data", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(5, -1)).toBeNull();
    expect(wilsonInterval(5, Number.NaN)).toBeNull();
  });

  it("matches the known Wilson band for 60/100 at 95%", () => {
    const ci = wilsonInterval(60, 100, Z_95)!;
    expect(ci.point).toBe(0.6);
    // Textbook Wilson 95% for 0.6, n=100 ≈ [0.5022, 0.6904].
    expect(ci.low).toBeCloseTo(0.5022, 3);
    expect(ci.high).toBeCloseTo(0.6904, 3);
  });

  it("is much wider for tiny samples — the whole point", () => {
    const small = wilsonInterval(6, 10)!;
    const large = wilsonInterval(600, 1000)!;
    const smallWidth = small.high - small.low;
    const largeWidth = large.high - large.low;
    expect(smallWidth).toBeGreaterThan(largeWidth * 5);
  });

  it("stays inside [0,1] at the extremes (unlike the normal approximation)", () => {
    const allWins = wilsonInterval(10, 10)!;
    expect(allWins.high).toBeLessThanOrEqual(1);
    expect(allWins.low).toBeGreaterThanOrEqual(0);
    const allLoss = wilsonInterval(0, 10)!;
    expect(allLoss.low).toBeGreaterThanOrEqual(0);
    expect(allLoss.high).toBeLessThanOrEqual(1);
  });

  it("clamps successes to the trial count", () => {
    const ci = wilsonInterval(50, 10)!;
    expect(ci.point).toBe(1);
  });

  it("answers 'do we honestly clear vig break-even (52.4%)?' via the lower bound", () => {
    // 6/10 looks like 60% but is too small to claim beating break-even.
    const tiny = wilsonInterval(6, 10)!;
    expect(tiny.point).toBe(0.6);
    expect(clearsThreshold(tiny, 0.524)).toBe(false);
    // 600/1000 at 60% clears it comfortably.
    const big = wilsonInterval(600, 1000)!;
    expect(clearsThreshold(big, 0.524)).toBe(true);
  });

  it("formats a readable percentage band", () => {
    const ci = wilsonInterval(60, 100)!;
    expect(formatWilsonPct(ci)).toMatch(/^50\.\d-69\.\d%$/);
  });
});
