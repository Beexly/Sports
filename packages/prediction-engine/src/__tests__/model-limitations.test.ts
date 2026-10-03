import { describe, expect, it } from "vitest";
import { assessUncertainty, wilsonInterval } from "../model-limitations.js";

describe("wilsonInterval", () => {
  it("returns the full [0,1] band with no data", () => {
    expect(wilsonInterval(0.6, 0)).toEqual({ low: 0, high: 1 });
  });

  it("brackets the estimate and tightens as n grows", () => {
    const wide = wilsonInterval(0.6, 20);
    const tight = wilsonInterval(0.6, 500);
    expect(tight.high - tight.low).toBeLessThan(wide.high - wide.low);
    expect(tight.low).toBeLessThan(0.6);
    expect(tight.high).toBeGreaterThan(0.6);
  });
});

describe("assessUncertainty", () => {
  it("rates a large, clean sample as high reliability with no flags", () => {
    const d = assessUncertainty({ probability: 0.6, sampleSize: 500, evidenceScore: 90, dataAgeHours: 1 });
    expect(d.reliability).toBe("high");
    expect(d.trustworthy).toBe(true);
    expect(d.flags).toHaveLength(0);
    expect(d.intervalWidth).toBeLessThanOrEqual(0.1);
  });

  it("flags a tiny sample as insufficient and not trustworthy", () => {
    const d = assessUncertainty({ probability: 0.6, sampleSize: 5 });
    expect(d.reliability).toBe("insufficient");
    expect(d.trustworthy).toBe(false);
    expect(d.flags).toEqual(expect.arrayContaining(["small_sample"]));
  });

  it("raises the right limitation flags for stale, thin-evidence, regime-shifted inputs", () => {
    const d = assessUncertainty({
      probability: 0.6,
      sampleSize: 200,
      evidenceScore: 30,
      dataAgeHours: 48,
      regimeShift: true,
    });
    expect(d.flags).toEqual(expect.arrayContaining(["low_evidence", "stale_data", "regime_shift"]));
  });
});
