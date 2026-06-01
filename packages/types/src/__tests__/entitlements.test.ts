import { describe, it, expect } from "vitest";
import { getEntitlements, computePickGrade, PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "../index.js";

describe("getEntitlements", () => {
  describe("FREE tier — 'See the discipline'", () => {
    const ents = getEntitlements("FREE");

    it("tier is FREE", () => expect(ents.tier).toBe("FREE"));
    it("cannot see premium picks", () => expect(ents.canSeePremiumPicks).toBe(false));
    it("cannot see confidence", () => expect(ents.canSeeConfidence).toBe(false));
    it("cannot see line movement", () => expect(ents.canSeeLineMovement).toBe(false));
    it("cannot see factor breakdown", () => expect(ents.canSeeFactorBreakdown).toBe(false));
    it("CAN see the public edge index", () => expect(ents.canSeeEdgeScore).toBe(true));
    it("gets no alerts of any kind", () => {
      expect(ents.canGetAlerts).toBe(false);
      expect(ents.canGetCustomAlerts).toBe(false);
    });
    it("gets none of the analyst layer", () => {
      expect(ents.canSeeEarlyAccess).toBe(false);
      expect(ents.canSeeFullModel).toBe(false);
      expect(ents.canSeeCalibrationScorecard).toBe(false);
      expect(ents.canUseDecisionTools).toBe(false);
      expect(ents.canSeeLineShop).toBe(false);
    });
    it("daily limit is 1", () => expect(ents.dailyPickLimit).toBe(1));
  });

  describe("PRO tier — 'Math you can read'", () => {
    const ents = getEntitlements("PRO");

    it("tier is PRO", () => expect(ents.tier).toBe("PRO"));
    it("unlocks the reasoning layer", () => {
      expect(ents.canSeePremiumPicks).toBe(true);
      expect(ents.canSeeConfidence).toBe(true);
      expect(ents.canSeeLineMovement).toBe(true);
      expect(ents.canSeeFactorBreakdown).toBe(true);
      expect(ents.canSeeEdgeScore).toBe(true);
    });
    it("gets STANDARD alerts but not custom alerts", () => {
      expect(ents.canGetAlerts).toBe(true);
      expect(ents.canGetCustomAlerts).toBe(false);
    });
    it("does NOT get the analyst layer (that's Elite's value)", () => {
      expect(ents.canSeeEarlyAccess).toBe(false);
      expect(ents.canSeeFullModel).toBe(false);
      expect(ents.canSeeCalibrationScorecard).toBe(false);
      expect(ents.canUseDecisionTools).toBe(false);
      expect(ents.canSeeLineShop).toBe(false);
    });
    it("unlimited picks", () => expect(ents.dailyPickLimit).toBeNull());
  });

  describe("ELITE tier — 'Operate like the analyst'", () => {
    const ents = getEntitlements("ELITE");

    it("tier is ELITE", () => expect(ents.tier).toBe("ELITE"));
    it("keeps every Pro reasoning entitlement", () => {
      expect(ents.canSeePremiumPicks).toBe(true);
      expect(ents.canSeeConfidence).toBe(true);
      expect(ents.canSeeLineMovement).toBe(true);
      expect(ents.canSeeFactorBreakdown).toBe(true);
      expect(ents.canGetAlerts).toBe(true);
    });
    it("adds the full analyst layer on top of Pro", () => {
      expect(ents.canGetCustomAlerts).toBe(true);
      expect(ents.canSeeEarlyAccess).toBe(true);
      expect(ents.canSeeFullModel).toBe(true);
      expect(ents.canSeeCalibrationScorecard).toBe(true);
      expect(ents.canUseDecisionTools).toBe(true);
      expect(ents.canSeeLineShop).toBe(true);
    });
    it("unlimited picks", () => expect(ents.dailyPickLimit).toBeNull());
  });

  describe("VIP tier — 'Founder' anchor", () => {
    const ents = getEntitlements("VIP");

    it("tier is VIP", () => expect(ents.tier).toBe("VIP"));
    it("inherits every Elite feature flag", () => {
      const elite = getEntitlements("ELITE");
      const flagsOf = (e: typeof ents) => {
        const { tier: _tier, ...flags } = e;
        return flags;
      };
      expect(flagsOf(ents)).toEqual(flagsOf(elite));
    });
    it("unlimited picks", () => expect(ents.dailyPickLimit).toBeNull());
  });

  describe("value differentiation (the Pro≡Elite bug must stay fixed)", () => {
    it("Pro and Elite are NOT identical — Elite adds the analyst layer", () => {
      const pro = getEntitlements("PRO");
      const elite = getEntitlements("ELITE");
      // The whole point of the reweight: Elite must differ from Pro by more
      // than a single alerts flag.
      const differing = (Object.keys(pro) as (keyof typeof pro)[]).filter(
        (k) => k !== "tier" && pro[k] !== elite[k]
      );
      expect(differing).toEqual(
        expect.arrayContaining([
          "canGetCustomAlerts",
          "canSeeEarlyAccess",
          "canSeeFullModel",
          "canSeeCalibrationScorecard",
          "canUseDecisionTools",
          "canSeeLineShop",
        ])
      );
      expect(differing.length).toBeGreaterThanOrEqual(6);
    });

    it("every paid tier unlocks premium picks; free does not", () => {
      expect(getEntitlements("FREE").canSeePremiumPicks).toBe(false);
      expect(getEntitlements("PRO").canSeePremiumPicks).toBe(true);
      expect(getEntitlements("ELITE").canSeePremiumPicks).toBe(true);
      expect(getEntitlements("VIP").canSeePremiumPicks).toBe(true);
    });
  });
});

describe("computePickGrade", () => {
  it("ELITE_PLAY when confidence >= 85 and edge >= 80", () => {
    expect(computePickGrade(85, 80)).toBe("ELITE_PLAY");
    expect(computePickGrade(90, 90)).toBe("ELITE_PLAY");
  });

  it("STRONG_PLAY when confidence >= 75 and edge >= 65", () => {
    expect(computePickGrade(75, 65)).toBe("STRONG_PLAY");
    expect(computePickGrade(80, 70)).toBe("STRONG_PLAY");
  });

  it("SOLID_PLAY when confidence >= 65 and edge >= 50", () => {
    expect(computePickGrade(65, 50)).toBe("SOLID_PLAY");
    expect(computePickGrade(70, 55)).toBe("SOLID_PLAY");
  });

  it("LEAN below thresholds", () => {
    expect(computePickGrade(55, 30)).toBe("LEAN");
    expect(computePickGrade(60, 40)).toBe("LEAN");
  });

  it("falls back to SOLID_PLAY when confidence is high but edge is mid", () => {
    // confidence 85 but edge only 50 → satisfies SOLID (edge >= 50) but not STRONG (needs edge >= 65)
    expect(computePickGrade(85, 50)).toBe("SOLID_PLAY");
  });

  it("falls back to LEAN when edge is below SOLID threshold", () => {
    // confidence 85 but edge only 40 → does not satisfy SOLID (needs edge >= 50)
    expect(computePickGrade(85, 40)).toBe("LEAN");
  });
});

describe("PICK_GRADE_LABELS", () => {
  it("all grades have label, color, bgColor", () => {
    for (const grade of ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"] as const) {
      const entry = PICK_GRADE_LABELS[grade];
      expect(entry.label).toBeTruthy();
      expect(entry.color).toMatch(/^text-/);
      expect(entry.bgColor).toMatch(/^bg-/);
    }
  });
});

describe("RISK_LEVEL_LABELS", () => {
  it("all risk levels have label and color", () => {
    for (const level of ["LOW_RISK", "MODERATE", "HIGH_VARIANCE", "INJURY_RISK", "LINE_STEAM"] as const) {
      const entry = RISK_LEVEL_LABELS[level];
      expect(entry.label).toBeTruthy();
      expect(entry.color).toMatch(/^text-/);
    }
  });
});
