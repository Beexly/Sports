import { describe, expect, it } from "vitest";
import {
  DEFAULT_MIN_SAMPLE,
  formatRateRead,
  isWideBand,
  readRate,
} from "@/lib/tracker/inconclusive";

describe("inconclusive — sample floor", () => {
  it("reports no rate at all below the floor", () => {
    const r = readRate(6, 10);
    expect(r.rate).toBeNull();
    expect(r.confidence).toBe("inconclusive");
    expect(r.reason).toContain("minimum");
  });

  it("never renders an unmeasured rate as 0%", () => {
    expect(formatRateRead(readRate(0, 5))).not.toContain("0.0%");
    expect(formatRateRead(readRate(0, 5))).toContain("not yet measurable");
  });

  it("honours a caller-supplied floor", () => {
    expect(readRate(55, 60, { minSample: 50 }).rate).not.toBeNull();
    expect(readRate(55, 60, { minSample: 100 }).rate).toBeNull();
  });

  it("defaults the floor to the published constant", () => {
    expect(readRate(0, DEFAULT_MIN_SAMPLE - 1).rate).toBeNull();
    expect(readRate(0, DEFAULT_MIN_SAMPLE).rate).not.toBeNull();
  });
});

describe("inconclusive — the band gets a vote", () => {
  it("labels a straddling band inconclusive (thin, ambiguous sample)", () => {
    // 18/30 = 60% but the Wilson band comfortably contains 50%.
    const r = readRate(18, 30);
    expect(r.confidence).toBe("inconclusive");
    expect(r.low).toBeLessThan(0.5);
    expect(r.high).toBeGreaterThan(0.5);
    expect(r.reason).toContain("inconclusive");
  });

  it("labels a decisive band conclusive", () => {
    // 400/500 = 80% with a tight band far above 50%.
    const r = readRate(400, 500);
    expect(r.confidence).toBe("conclusive");
    expect(r.low).toBeGreaterThan(0.5);
    expect(r.reason).toContain("above");
  });

  it("labels a decisively bad band conclusive below the threshold", () => {
    const r = readRate(100, 500);
    expect(r.confidence).toBe("conclusive");
    expect(r.high).toBeLessThan(0.5);
    expect(r.reason).toContain("below");
  });

  it("supports a zero threshold for ROI-style reads", () => {
    // 0-for-40: the Wilson band still contains 0, so we cannot call it negative.
    const flat = readRate(0, 40, { threshold: 0 });
    expect(flat.threshold).toBe(0);
    expect(flat.confidence).toBe("inconclusive");
    expect(flat.reason).toContain("0.0%");
    // 40/51 is decisively above zero.
    expect(readRate(40, 51, { threshold: 0 }).confidence).toBe("conclusive");
  });

  it("treats a threshold exactly on the boundary as inconclusive", () => {
    const r = readRate(30, 60, { threshold: 0.5 });
    expect(r.confidence).toBe("inconclusive");
  });
});

describe("inconclusive — band integrity", () => {
  it("never emits a point estimate without its band", () => {
    const r = readRate(400, 500);
    expect(r.rate).not.toBeNull();
    expect(r.low).toBeLessThan(r.rate);
    expect(r.high).toBeGreaterThan(r.rate);
  });

  it("keeps the band inside [0,1]", () => {
    for (const [h, n] of [[0, 30], [30, 30], [1, 100]] as const) {
      const r = readRate(h, n);
      expect(r.low).toBeGreaterThanOrEqual(0);
      expect(r.high).toBeLessThanOrEqual(1);
    }
  });

  it("flags a wide band as too weak to carry a claim", () => {
    // 18/30 carries a 0.33-wide band: too weak at a 0.25 tolerance, acceptable at 0.4.
    expect(isWideBand(readRate(18, 30), 0.25)).toBe(true);
    expect(isWideBand(readRate(18, 30), 0.4)).toBe(false);
    expect(isWideBand(readRate(400, 500))).toBe(false);
  });

  it("always returns a reason", () => {
    for (const [h, n] of [[6, 10], [18, 30], [400, 500], [100, 500]] as const) {
      expect(readRate(h, n).reason.length).toBeGreaterThan(10);
    }
  });

  it("throws on impossible counts instead of silently clamping", () => {
    expect(() => readRate(11, 10)).toThrow();
    expect(() => readRate(-1, 10)).toThrow();
    expect(() => readRate(1, Number.NaN)).toThrow();
  });
});

describe("inconclusive — formatting", () => {
  it("attaches the band and sample to the formatted headline", () => {
    const s = formatRateRead(readRate(400, 500));
    expect(s).toContain("%");
    expect(s).toContain("n=500");
    expect(s).toContain("conclusive");
    expect(s).toContain("[");
  });
});
