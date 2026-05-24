import { describe, it, expect } from "vitest";
import { getEntitlements, computePickGrade, PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "../index";

describe("getEntitlements", () => {
  describe("FREE tier", () => {
    const ents = getEntitlements("FREE");

    it("tier is FREE", () => expect(ents.tier).toBe("FREE"));
    it("cannot see premium picks", () => expect(ents.canSeePremiumPicks).toBe(false));
    it("cannot see confidence", () => expect(ents.canSeeConfidence).toBe(false));
    it("cannot see line movement", () => expect(ents.canSeeLineMovement).toBe(false));
    it("cannot see factor breakdown", () => expect(ents.canSeeFactorBreakdown).toBe(false));
    it("cannot see edge score", () => expect(ents.canSeeEdgeScore).toBe(false));
    it("cannot get alerts", () => expect(ents.canGetAlerts).toBe(false));
    it("daily limit is 1", () => expect(ents.dailyPickLimit).toBe(1));
  });

  describe("PRO tier", () => {
    const ents = getEntitlements("PRO");

    it("tier is PRO", () => expect(ents.tier).toBe("PRO"));
    it("can see premium picks", () => expect(ents.canSeePremiumPicks).toBe(true));
    it("can see confidence", () => expect(ents.canSeeConfidence).toBe(true));
    it("can see line movement", () => expect(ents.canSeeLineMovement).toBe(true));
    it("can see factor breakdown", () => expect(ents.canSeeFactorBreakdown).toBe(true));
    it("can see edge score", () => expect(ents.canSeeEdgeScore).toBe(true));
    it("cannot get alerts", () => expect(ents.canGetAlerts).toBe(false));
    it("unlimited picks", () => expect(ents.dailyPickLimit).toBeNull());
  });

  describe("ELITE tier", () => {
    const ents = getEntitlements("ELITE");

    it("tier is ELITE", () => expect(ents.tier).toBe("ELITE"));
    it("can see all premium content", () => {
      expect(ents.canSeePremiumPicks).toBe(true);
      expect(ents.canSeeFactorBreakdown).toBe(true);
      expect(ents.canSeeEdgeScore).toBe(true);
    });
    it("can get alerts", () => expect(ents.canGetAlerts).toBe(true));
    it("unlimited picks", () => expect(ents.dailyPickLimit).toBeNull());
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
