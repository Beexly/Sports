import { describe, it, expect } from "vitest";
import {
  PRICING_PHASES,
  getCurrentPricingPhase,
  getCurrentPricingPhaseId,
  getPricingPhase,
  annualSavingsPct,
  annualMonthlyEquivalent,
  STANDARD_RATES,
  APEX_ADDON,
  getCurrentPricingMode,
  getNewSubscriberRates,
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

describe("orthogonal standard-rate layer (Elite-first restructure)", () => {
  it("pins the STANDARD_RATES card (Pro $24.99/$149, Elite $39.99/$199)", () => {
    expect(STANDARD_RATES.pro.monthly).toBe(24.99);
    expect(STANDARD_RATES.pro.annual).toBe(149);
    expect(STANDARD_RATES.elite.monthly).toBe(39.99);
    expect(STANDARD_RATES.elite.annual).toBe(199);
  });

  it("pins the Apex add-on prices ($9.99/pick, $49.99/5-pack)", () => {
    expect(APEX_ADDON.perPick).toBe(9.99);
    expect(APEX_ADDON.fivePack).toBe(49.99);
  });

  it("defaults PRICING_MODE to founding (owner-gated flip)", () => {
    // No PRICING_MODE in the test env → safest, live default.
    expect(getCurrentPricingMode()).toBe("founding");
  });

  it("getNewSubscriberRates returns FOUNDING pro/elite under the default mode", () => {
    const founding = getPricingPhase("FOUNDING");
    const rates = getNewSubscriberRates();
    expect(rates.pro.monthly).toBe(founding.pro.monthly);
    expect(rates.pro.annual).toBe(founding.pro.annual);
    expect(rates.elite.monthly).toBe(founding.elite.monthly);
    expect(rates.elite.annual).toBe(founding.elite.annual);
  });

  it("does not mutate the proof-gated FOUNDING floor", () => {
    const founding = getPricingPhase("FOUNDING");
    expect(founding.pro.monthly).toBe(14.99);
    expect(founding.elite.monthly).toBe(24.99);
  });
});
