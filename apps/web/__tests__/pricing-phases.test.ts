import { describe, it, expect } from "vitest";
import {
  PRICING_PHASES,
  getCurrentPricingPhase,
  getCurrentPricingPhaseId,
  getPricingPhase,
  annualSavingsPct,
  annualMonthlyEquivalent,
} from "@/lib/pricing/pricing-phases";

describe("pricing-phases", () => {
  it("defaults to FOUNDING when PRICING_PHASE is unset/invalid", () => {
    // No PRICING_PHASE in the test env → safest rung.
    expect(getCurrentPricingPhaseId()).toBe("FOUNDING");
    expect(getCurrentPricingPhase().id).toBe("FOUNDING");
  });

  it("names a four-rung ladder in ascending order", () => {
    expect(PRICING_PHASES.map((p) => p.id)).toEqual([
      "FOUNDING",
      "PROVEN",
      "ESTABLISHED",
      "AUTHORITY",
    ]);
    PRICING_PHASES.forEach((p, i) => expect(p.order).toBe(i));
  });

  it("ties later rungs to real proof thresholds", () => {
    expect(getPricingPhase("PROVEN").triggerMetrics.minCanonicalSettledPicks).toBe(100);
    expect(getPricingPhase("PROVEN").triggerMetrics.requiresPublishedCalibration).toBe(true);
    // ESTABLISHED requires beating the closing line at the vig break-even rate.
    expect(getPricingPhase("ESTABLISHED").triggerMetrics.minBeatCloseRate).toBe(0.524);
  });

  it("computes annual savings and monthly-equivalent", () => {
    const founding = getPricingPhase("FOUNDING");
    // Pro: $99/yr vs $14.99×12 = $179.88 → ~45% off, ≈$8.25/mo.
    expect(annualSavingsPct(founding.pro)).toBe(45);
    expect(annualMonthlyEquivalent(founding.pro)).toBeCloseTo(8.25, 2);
  });
});
