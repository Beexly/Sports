import { describe, it, expect } from "vitest";
import { describeHitRate, MIN_HIT_RATE_SAMPLE } from "./hit-rate-display";

// public-number-audit-2026-07-16, finding #5: buy-low/sell-high hit-rates
// rendered a colored headline percentage for ANY n, including n=3. These
// tests pin the substantiation guard: below the sample floor, no percentage
// and no tone; at/above it, the point estimate AND the Wilson 95% lower
// bound both render, and the tone comes from the LOWER BOUND.

describe("describeHitRate", () => {
  it("withholds the percentage below the sample floor (n=3, high rate)", () => {
    const d = describeHitRate(1.0, 3);
    expect(d.status).toBe("insufficient");
    if (d.status !== "insufficient") throw new Error("unreachable");
    expect(d.n).toBe(3);
    expect(d.label).toBe("n=3 — too few to rate");
    // No numeric percentage anywhere in the label.
    expect(d.label).not.toMatch(/%/);
  });

  it("withholds right up to (but not including) the floor", () => {
    const justBelow = describeHitRate(0.6, MIN_HIT_RATE_SAMPLE - 1);
    expect(justBelow.status).toBe("insufficient");
    if (justBelow.status !== "insufficient") throw new Error("unreachable");
    expect(justBelow.label).toBe(`n=${MIN_HIT_RATE_SAMPLE - 1} — too few to rate`);
  });

  it("treats a null rate as insufficient regardless of n", () => {
    const d = describeHitRate(null, 500);
    expect(d.status).toBe("insufficient");
    if (d.status !== "insufficient") throw new Error("unreachable");
    expect(d.n).toBe(500);
  });

  it("publishes the rate + Wilson LCB exactly at the floor", () => {
    const d = describeHitRate(0.6, MIN_HIT_RATE_SAMPLE);
    expect(d.status).toBe("rated");
    if (d.status !== "rated") throw new Error("unreachable");
    expect(d.n).toBe(MIN_HIT_RATE_SAMPLE);
    expect(d.pct).toBe(60);
    // Wilson 95% LCB for 60% at n=25 is comfortably below the point estimate.
    expect(d.lcbPct).toBeLessThan(d.pct);
    expect(d.lcbPct).toBeGreaterThanOrEqual(0);
    expect(d.label).toBe(`${d.pct}% (LCB ${d.lcbPct}%)`);
  });

  it("colors by the LOWER BOUND, not the point estimate — a thin-but-passing sample stays neutral", () => {
    // 65% point estimate at n=25 sounds like "good" (>55% upper band), but the
    // Wilson LCB for 0.65/25 sits below 0.55 — must NOT tone as good.
    const d = describeHitRate(0.65, 25);
    expect(d.status).toBe("rated");
    if (d.status !== "rated") throw new Error("unreachable");
    expect(d.pct).toBe(65);
    expect(d.lcbPct).toBeLessThan(55);
    expect(d.tone).not.toBe("good");
  });

  it("tones good only once the lower bound itself clears the upper band", () => {
    // A large, comfortably-above-coinflip sample: LCB should clear 55%.
    const d = describeHitRate(0.7, 400);
    expect(d.status).toBe("rated");
    if (d.status !== "rated") throw new Error("unreachable");
    expect(d.lcbPct).toBeGreaterThan(55);
    expect(d.tone).toBe("good");
  });

  it("tones bad when the lower bound is below the lower band", () => {
    const d = describeHitRate(0.3, 400);
    expect(d.status).toBe("rated");
    if (d.status !== "rated") throw new Error("unreachable");
    expect(d.tone).toBe("bad");
  });

  it("tones neutral when the lower bound sits inside the coin-flip band", () => {
    const d = describeHitRate(0.5, 400);
    expect(d.status).toBe("rated");
    if (d.status !== "rated") throw new Error("unreachable");
    expect(d.tone).toBe("neutral");
  });

  it("never lets a small sample produce a 'good' tone even at a perfect rate", () => {
    // The whole point of the floor: 3/3 = 100% must not render green.
    const d = describeHitRate(1.0, 3);
    expect(d.status).toBe("insufficient");
  });
});
