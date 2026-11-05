import { describe, it, expect } from "vitest";
import {
  computeThalerHedonicBundleFraming,
  buildSahniPersonalizedEmailDispatch,
  computeFaderHardieBgNbdRetentionAndClv,
  computeXLearnerPromoUpliftScore,
  computeBayesianMmmHillAllocation,
  computeBassViralCascadeProjection,
} from "../lib/marketing/marketing-science-conversion-engine";
import { GET as getThursdayConversionPack } from "../app/api/storefront/thursday-conversion-pack/route";

describe("24-Paper Marketing Science Conversion Engine & Thursday Live Storefront Route", () => {
  it("computes Thaler (1985) hedonic bundle framing with segregated gains > integrated gain", () => {
    const res = computeThalerHedonicBundleFraming(
      [
        { label: "Week 9 TNF 360° Call Sheet", standaloneValueUsd: 29 },
        { label: "10,000-World Trench Braid Projections", standaloneValueUsd: 19 },
        { label: "DK/FD Showdown Optimal Lineup Packet", standaloneValueUsd: 15 },
      ],
      9.99,
      49.0,
    );
    expect(res.segregatedGainsUtility).toBeGreaterThan(res.integratedGainUtility);
    expect(res.transactionUtility).toBeGreaterThan(0);
    expect(res.prospectTheoryLossAvoidanceHeadline).toContain("Lamar Jackson");
  });

  it("builds Sahni et al. (2018) personalized email dispatch (+20% open / +31% lead multipliers)", () => {
    const email = buildSahniPersonalizedEmailDispatch(
      "Garrett",
      "Baltimore @ Jacksonville",
      "16-5 (76.2%, +10.45u)",
      "JAX +3.5, UNDER 47.5 & Zay Flowers OVER 5.5 Receptions",
    );
    expect(email.subjectLine).toContain("Garrett");
    expect(email.expectedOpenRateMultiplier).toBeCloseTo(1.2, 2);
    expect(email.expectedLeadGenMultiplier).toBeCloseTo(1.31, 2);
  });

  it("computes Fader-Hardie BG/NBD + sBG retention and Gupta 5x valuation elasticity", () => {
    const clv = computeFaderHardieBgNbdRetentionAndClv({
      frequencyX: 4,
      recencyTxWeeks: 6,
      observationTWeeks: 8,
      r: 0.85,
      alpha: 2.1,
      a: 0.7,
      b: 3.5,
      weeklyMarginUsd: 19.75,
      discountRateWeekly: 0.002,
    });
    expect(clv.pAlive).toBeGreaterThan(0.5);
    expect(clv.pAlive).toBeLessThanOrEqual(1.0);
    expect(clv.expectedClvUsd).toBeGreaterThan(50);
    expect(clv.guptaOnePercentRetentionValuationLiftPct).toBeCloseTo(5.0, 1);
  });

  it("segments visitors via Künzel X-Learner & Wager-Athey Causal Uplift CATE", () => {
    const persuadable = computeXLearnerPromoUpliftScore({
      priorFreeViews: 4,
      clickedPicksTab: true,
      daysSinceSignup: 2,
      priceSensitivityScore: 0.65,
    });
    expect(persuadable.segment).toBe("PERSUADABLE");
    expect(persuadable.recommendedOfferSku).toBe("TNF_24H_FLASH_PASS_999");

    const sureThing = computeXLearnerPromoUpliftScore({
      priorFreeViews: 14,
      clickedPicksTab: true,
      daysSinceSignup: 10,
      priceSensitivityScore: 0.15,
    });
    expect(sureThing.segment).toBe("SURE_THING");
    expect(sureThing.recommendedOfferSku).toBe("FOUNDING_SOVEREIGN_ANNUAL_399");
  });

  it("allocates budget via Jin/Robyn Bayesian MMM Hill saturation & Heusch Geo-Experiment lift", () => {
    const mmm = computeBayesianMmmHillAllocation([
      {
        channel: "X_ORGANIC_SNIPER_THREADS",
        spendUsd: 250,
        adstockDecayLambda: 0.6,
        hillHalfSaturationK: 200,
        hillSlopeS: 1.8,
        organicCannibalizationDiscount: 0.0,
      },
      {
        channel: "BRANDED_PAID_SEARCH",
        spendUsd: 250,
        adstockDecayLambda: 0.3,
        hillHalfSaturationK: 300,
        hillSlopeS: 1.2,
        organicCannibalizationDiscount: 0.75,
      },
    ]);
    expect(mmm[0]!.netIncrementalRoas).toBeGreaterThan(mmm[1]!.netIncrementalRoas);
  });

  it("projects Bass (1969) + Goel (2015) structural virality cascade", () => {
    const viral = computeBassViralCascadeProjection({
      innovationP: 0.03,
      imitationQ: 0.42,
      marketPotentialM: 50000,
      currentAdoptersN: 2400,
      structuralViralityNu: 3.4,
    });
    expect(viral.nextStepAdopters).toBeGreaterThan(100);
    expect(viral.cascadeRegime).toBe("PEER_TO_PEER_VIRAL_TREE");
  });

  it("serves the live Thursday conversion pack API with Stage-0-clean players and XX/100 confidence", async () => {
    const response = await getThursdayConversionPack();
    const payload = await response.json();
    expect(payload.officialRecord.recordDisplay).toBe("62-23-1 (72.9%, +26.50u)");
    expect(payload.tnfMatchup).toBe("JAX @ BAL");
    for (const play of payload.decisivePlays) {
      expect(play.confidenceScore).toMatch(/^\d+\/100$/);
      expect(play.selection).not.toContain("Lamar Jackson");
      expect(play.selection).not.toContain("Travis Etienne");
    }
  });
});
