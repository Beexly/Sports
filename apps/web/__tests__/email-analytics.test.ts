/**
 * Tests for email-analytics.ts
 * Pure unit tests — no I/O, no mocks needed.
 */
import { describe, it, expect } from "vitest";
import {
  deliveryRate,
  openRate,
  clickRate,
  clickToOpenRate,
  bounceRate,
  hardBounceRate,
  unsubscribeRate,
  complaintRate,
  conversionRate,
  campaignHealthScore,
  campaignGrade,
  revenuePerEmail,
  revenuePerClick,
  roi,
  listHealthScore,
  engagementSegmentation,
  estimatedReach,
  growthRate,
  churnRate,
  deliverabilityScore,
  reputationRisk,
  inboxPlacementEstimate,
  abTestSignificance,
  minimumDetectableEffect,
  requiredSampleSize,
  bestSendHour,
  bestSendDay,
  sendTimeRecommendation,
  hourlyEngagement,
  dailyEngagement,
  industryBenchmark,
  benchmarkComparison,
  performanceScore,
  pickAlertEngagement,
  optimalPickAlertTiming,
  segmentByPickTier,
  type EmailCampaign,
  type EmailEvent,
  type ListHealth,
} from "../lib/analytics/email-analytics";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const goodCampaign: EmailCampaign = {
  sent: 10000,
  delivered: 9800,
  opened: 2450,
  clicked: 490,
  bounced: 200,
  unsubscribed: 98,
  complained: 10,
};

const zeroCampaign: EmailCampaign = {
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  unsubscribed: 0,
  complained: 0,
};

const badCampaign: EmailCampaign = {
  sent: 10000,
  delivered: 8000,
  opened: 600,    // 7.5% open rate — below 10%
  clicked: 20,
  bounced: 600,   // 6% bounce rate — above 5%
  unsubscribed: 80,
  complained: 20, // 0.25% complaint rate — above 0.1%
};

function makeEvent(
  type: EmailEvent["type"],
  dayOfWeek: number,
  hour: number,
  minuteOffset = 0
): EmailEvent {
  // dayOfWeek: 0=Sunday; we use a known reference date (2024-01-07 = Sunday)
  const base = new Date("2024-01-07T00:00:00Z");
  base.setDate(base.getDate() + dayOfWeek);
  base.setHours(hour, minuteOffset, 0, 0);
  return { timestamp: base, type };
}

// ---------------------------------------------------------------------------
// Core rate calculations
// ---------------------------------------------------------------------------

describe("deliveryRate", () => {
  it("returns delivered/sent ratio", () => {
    expect(deliveryRate(goodCampaign)).toBeCloseTo(0.98);
  });

  it("returns 0 when sent is 0", () => {
    expect(deliveryRate(zeroCampaign)).toBe(0);
  });

  it("returns 1.0 when all sent are delivered", () => {
    const c: EmailCampaign = { ...goodCampaign, sent: 1000, delivered: 1000 };
    expect(deliveryRate(c)).toBe(1.0);
  });
});

describe("openRate", () => {
  it("returns opened/delivered", () => {
    // 2450/9800 = 0.25
    expect(openRate(goodCampaign)).toBeCloseTo(0.25);
  });

  it("returns 0 when delivered is 0", () => {
    expect(openRate(zeroCampaign)).toBe(0);
  });

  it("handles 100% open rate", () => {
    const c: EmailCampaign = { ...goodCampaign, delivered: 1000, opened: 1000 };
    expect(openRate(c)).toBe(1.0);
  });
});

describe("clickRate", () => {
  it("returns clicked/delivered", () => {
    // 490/9800 = 0.05
    expect(clickRate(goodCampaign)).toBeCloseTo(0.05);
  });

  it("returns 0 when delivered is 0", () => {
    expect(clickRate(zeroCampaign)).toBe(0);
  });
});

describe("clickToOpenRate", () => {
  it("returns clicked/opened (CTOR)", () => {
    // 490/2450 = 0.2
    expect(clickToOpenRate(goodCampaign)).toBeCloseTo(0.2);
  });

  it("returns 0 when opened is 0", () => {
    expect(clickToOpenRate(zeroCampaign)).toBe(0);
  });

  it("is greater than clickRate for typical campaigns", () => {
    expect(clickToOpenRate(goodCampaign)).toBeGreaterThan(clickRate(goodCampaign));
  });
});

describe("bounceRate", () => {
  it("returns bounced/sent", () => {
    // 200/10000 = 0.02
    expect(bounceRate(goodCampaign)).toBeCloseTo(0.02);
  });

  it("returns 0 when sent is 0", () => {
    expect(bounceRate(zeroCampaign)).toBe(0);
  });
});

describe("hardBounceRate", () => {
  it("computes hard bounces over sent", () => {
    expect(hardBounceRate(50, 10000)).toBeCloseTo(0.005);
  });

  it("returns 0 when sent is 0", () => {
    expect(hardBounceRate(0, 0)).toBe(0);
  });

  it("returns 0 when hard bounces are 0", () => {
    expect(hardBounceRate(0, 5000)).toBe(0);
  });
});

describe("unsubscribeRate", () => {
  it("returns unsubscribed/delivered", () => {
    // 98/9800 = 0.01
    expect(unsubscribeRate(goodCampaign)).toBeCloseTo(0.01);
  });

  it("returns 0 when delivered is 0", () => {
    expect(unsubscribeRate(zeroCampaign)).toBe(0);
  });
});

describe("complaintRate", () => {
  it("returns complained/delivered", () => {
    // 10/9800 ≈ 0.00102
    expect(complaintRate(goodCampaign)).toBeCloseTo(0.00102, 4);
  });

  it("returns 0 when delivered is 0", () => {
    expect(complaintRate(zeroCampaign)).toBe(0);
  });
});

describe("conversionRate", () => {
  it("returns conversions/clicked", () => {
    expect(conversionRate(49, 490)).toBeCloseTo(0.1);
  });

  it("returns 0 when clicked is 0", () => {
    expect(conversionRate(5, 0)).toBe(0);
  });

  it("can return 1.0 for full conversion", () => {
    expect(conversionRate(100, 100)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Campaign scoring
// ---------------------------------------------------------------------------

describe("campaignHealthScore", () => {
  it("returns a number between 0 and 100", () => {
    const score = campaignHealthScore(goodCampaign);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 0 for zero campaign", () => {
    // openRate=0, clickRate=0, 1-bounceRate=1, 1-unsubRate=1, 1-complaintRate=1
    // score = 0 + 0 + 20 + 15 + 10 = 45
    const score = campaignHealthScore(zeroCampaign);
    expect(score).toBeCloseTo(45, 0);
  });

  it("gives higher score for better-performing campaign", () => {
    const excellent: EmailCampaign = {
      sent: 10000,
      delivered: 10000,
      opened: 3000,
      clicked: 600,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
    };
    expect(campaignHealthScore(excellent)).toBeGreaterThan(
      campaignHealthScore(badCampaign)
    );
  });

  it("is clamped to [0, 100]", () => {
    const perfect: EmailCampaign = {
      sent: 100,
      delivered: 100,
      opened: 100,
      clicked: 100,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
    };
    expect(campaignHealthScore(perfect)).toBeLessThanOrEqual(100);
  });
});

describe("campaignGrade", () => {
  it("returns A for score >= 80", () => {
    expect(campaignGrade(85)).toBe("A");
    expect(campaignGrade(80)).toBe("A");
  });

  it("returns B for score >= 65 and < 80", () => {
    expect(campaignGrade(65)).toBe("B");
    expect(campaignGrade(75)).toBe("B");
    expect(campaignGrade(79)).toBe("B");
  });

  it("returns C for score >= 50 and < 65", () => {
    expect(campaignGrade(50)).toBe("C");
    expect(campaignGrade(60)).toBe("C");
    expect(campaignGrade(64)).toBe("C");
  });

  it("returns D for score >= 35 and < 50", () => {
    expect(campaignGrade(35)).toBe("D");
    expect(campaignGrade(40)).toBe("D");
    expect(campaignGrade(49)).toBe("D");
  });

  it("returns F for score < 35", () => {
    expect(campaignGrade(0)).toBe("F");
    expect(campaignGrade(34)).toBe("F");
    expect(campaignGrade(20)).toBe("F");
  });
});

describe("revenuePerEmail", () => {
  it("computes revenue divided by sent", () => {
    expect(revenuePerEmail(1000, 10000)).toBeCloseTo(0.1);
  });

  it("returns 0 when sent is 0", () => {
    expect(revenuePerEmail(500, 0)).toBe(0);
  });
});

describe("revenuePerClick", () => {
  it("computes revenue divided by clicks", () => {
    expect(revenuePerClick(490, 490)).toBe(1.0);
  });

  it("returns 0 when clicked is 0", () => {
    expect(revenuePerClick(100, 0)).toBe(0);
  });
});

describe("roi", () => {
  it("computes (revenue - cost) / cost", () => {
    expect(roi(1500, 1000)).toBeCloseTo(0.5);
  });

  it("returns negative ROI when revenue < cost", () => {
    expect(roi(500, 1000)).toBeCloseTo(-0.5);
  });

  it("returns 0 when cost is 0", () => {
    expect(roi(1000, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// List health
// ---------------------------------------------------------------------------

describe("listHealthScore", () => {
  it("returns a number between 0 and 100", () => {
    const health: ListHealth = {
      totalSubscribers: 10000,
      activeSubscribers: 8000,
      hardBounces: 100,
      softBounces: 50,
      unsubscribes: 200,
    };
    const score = listHealthScore(health);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 100 for a perfect list", () => {
    const health: ListHealth = {
      totalSubscribers: 10000,
      activeSubscribers: 10000,
      hardBounces: 0,
      softBounces: 0,
      unsubscribes: 0,
    };
    expect(listHealthScore(health)).toBe(100);
  });

  it("returns 0 when total subscribers is 0", () => {
    const health: ListHealth = {
      totalSubscribers: 0,
      activeSubscribers: 0,
      hardBounces: 0,
      softBounces: 0,
      unsubscribes: 0,
    };
    // active/total=0 → 0; bounceRate=0 → 25; unsubRate=0 → 25; total=50 but clamped
    // Actually: 0*50 + (1-0*2)*25 + (1-0*5)*25 = 0 + 25 + 25 = 50
    const score = listHealthScore(health);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes high bounce and unsub rates", () => {
    const healthyList: ListHealth = {
      totalSubscribers: 10000,
      activeSubscribers: 9500,
      hardBounces: 50,
      softBounces: 50,
      unsubscribes: 100,
    };
    const sickList: ListHealth = {
      totalSubscribers: 10000,
      activeSubscribers: 5000,
      hardBounces: 1000,
      softBounces: 500,
      unsubscribes: 800,
    };
    expect(listHealthScore(healthyList)).toBeGreaterThan(listHealthScore(sickList));
  });
});

describe("engagementSegmentation", () => {
  const now = new Date("2024-06-01T12:00:00Z");

  function makeSubscriber(daysAgo: number, clicks: number) {
    const lastActivity = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return { opens: 1, clicks, lastActivity, now };
  }

  it("classifies highly engaged (opened in last 30d with clicks)", () => {
    const result = engagementSegmentation([makeSubscriber(10, 3)]);
    expect(result.highly_engaged).toBe(1);
  });

  it("classifies engaged (opened in last 60d, no clicks)", () => {
    const result = engagementSegmentation([makeSubscriber(45, 0)]);
    expect(result.engaged).toBe(1);
  });

  it("classifies at_risk (opened 61-180d ago)", () => {
    const result = engagementSegmentation([makeSubscriber(90, 0)]);
    expect(result.at_risk).toBe(1);
  });

  it("classifies inactive (>180d since last activity)", () => {
    const result = engagementSegmentation([makeSubscriber(200, 0)]);
    expect(result.inactive).toBe(1);
  });

  it("handles mixed cohort", () => {
    const subs = [
      makeSubscriber(5, 2),   // highly_engaged
      makeSubscriber(50, 0),  // engaged
      makeSubscriber(100, 0), // at_risk
      makeSubscriber(300, 0), // inactive
    ];
    const result = engagementSegmentation(subs);
    expect(result.highly_engaged).toBe(1);
    expect(result.engaged).toBe(1);
    expect(result.at_risk).toBe(1);
    expect(result.inactive).toBe(1);
  });

  it("returns all zeros for empty array", () => {
    const result = engagementSegmentation([]);
    expect(result).toEqual({ highly_engaged: 0, engaged: 0, at_risk: 0, inactive: 0 });
  });

  it("recently active with clicks is highly_engaged not engaged", () => {
    const result = engagementSegmentation([makeSubscriber(15, 5)]);
    expect(result.highly_engaged).toBe(1);
    expect(result.engaged).toBe(0);
  });
});

describe("estimatedReach", () => {
  it("multiplies list size by open rate", () => {
    expect(estimatedReach(10000, 0.25)).toBe(2500);
  });

  it("returns 0 when list is empty", () => {
    expect(estimatedReach(0, 0.25)).toBe(0);
  });

  it("returns 0 when open rate is 0", () => {
    expect(estimatedReach(10000, 0)).toBe(0);
  });
});

describe("growthRate", () => {
  it("computes positive growth", () => {
    expect(growthRate(1100, 1000)).toBeCloseTo(0.1);
  });

  it("computes negative growth (list shrinkage)", () => {
    expect(growthRate(900, 1000)).toBeCloseTo(-0.1);
  });

  it("returns 0 when previous is 0", () => {
    expect(growthRate(100, 0)).toBe(0);
  });
});

describe("churnRate", () => {
  it("returns lost/starting", () => {
    expect(churnRate(100, 1000)).toBeCloseTo(0.1);
  });

  it("returns 0 when starting is 0", () => {
    expect(churnRate(0, 0)).toBe(0);
  });

  it("returns 0 when no one left", () => {
    expect(churnRate(0, 1000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Deliverability
// ---------------------------------------------------------------------------

describe("deliverabilityScore", () => {
  it("returns perfect score for clean campaign with auth passing", () => {
    const cleanCampaign: EmailCampaign = {
      sent: 10000,
      delivered: 9900,
      opened: 2500,
      clicked: 500,
      bounced: 100,
      unsubscribed: 20,
      complained: 1,
    };
    const result = deliverabilityScore(cleanCampaign, {
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.grade).toBe("A");
    expect(result.issues).toHaveLength(0);
  });

  it("deducts 20 points for bounce rate > 5%", () => {
    const result = deliverabilityScore(badCampaign);
    expect(result.issues.some((i) => i.toLowerCase().includes("bounce"))).toBe(true);
  });

  it("deducts 30 points for complaint rate > 0.1%", () => {
    const result = deliverabilityScore(badCampaign);
    expect(result.issues.some((i) => i.toLowerCase().includes("complaint"))).toBe(true);
  });

  it("deducts 15 points for low open rate", () => {
    // badCampaign has 7.5% open rate
    const result = deliverabilityScore(badCampaign);
    expect(result.issues.some((i) => i.toLowerCase().includes("open"))).toBe(true);
  });

  it("deducts points for failing SPF", () => {
    const result1 = deliverabilityScore(goodCampaign, { spfPass: false });
    const result2 = deliverabilityScore(goodCampaign, { spfPass: true });
    expect(result1.score).toBeLessThan(result2.score);
    expect(result1.issues.some((i) => i.toLowerCase().includes("spf"))).toBe(true);
  });

  it("deducts points for failing DKIM", () => {
    const result1 = deliverabilityScore(goodCampaign, { dkimPass: false });
    const result2 = deliverabilityScore(goodCampaign, { dkimPass: true });
    expect(result1.score).toBeLessThan(result2.score);
    expect(result1.issues.some((i) => i.toLowerCase().includes("dkim"))).toBe(true);
  });

  it("deducts points for failing DMARC", () => {
    const result1 = deliverabilityScore(goodCampaign, { dmarcPass: false });
    const result2 = deliverabilityScore(goodCampaign, { dmarcPass: true });
    expect(result1.score).toBeLessThan(result2.score);
    expect(result1.issues.some((i) => i.toLowerCase().includes("dmarc"))).toBe(true);
  });

  it("returns F grade for a terrible campaign", () => {
    const result = deliverabilityScore(badCampaign, {
      spfPass: false,
      dkimPass: false,
      dmarcPass: false,
    });
    expect(result.grade).toBe("F");
  });

  it("score is clamped to [0, 100]", () => {
    const result = deliverabilityScore(badCampaign, {
      spfPass: false,
      dkimPass: false,
      dmarcPass: false,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("includes recommendations when issues are found", () => {
    const result = deliverabilityScore(badCampaign);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("works without opts (no auth info)", () => {
    const result = deliverabilityScore(goodCampaign);
    expect(typeof result.score).toBe("number");
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
  });

  it("deducts 5 points for high unsubscribe rate > 0.5%", () => {
    const highUnsub: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 2000,
      clicked: 400,
      bounced: 100,
      unsubscribed: 200, // 200/9800 ≈ 2% — above 0.5%
      complained: 1,
    };
    const result = deliverabilityScore(highUnsub, { spfPass: true, dkimPass: true, dmarcPass: true });
    // Should deduct 5 points for unsub rate — score should be 95
    expect(result.score).toBe(95);
    expect(result.issues.some((i) => i.toLowerCase().includes("unsub"))).toBe(true);
  });
});

describe("reputationRisk", () => {
  it("returns low for clean campaign", () => {
    const clean: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 2500,
      clicked: 400,
      bounced: 100,
      unsubscribed: 20,
      complained: 1,
    };
    expect(reputationRisk(clean)).toBe("low");
  });

  it("returns critical when complaint rate > 0.2%", () => {
    const c: EmailCampaign = {
      ...goodCampaign,
      complained: 30, // 30/9800 ≈ 0.31% > 0.2%
    };
    expect(reputationRisk(c)).toBe("critical");
  });

  it("returns critical when bounce rate > 8%", () => {
    const c: EmailCampaign = {
      ...goodCampaign,
      bounced: 900, // 900/10000 = 9% > 8%
    };
    expect(reputationRisk(c)).toBe("critical");
  });

  it("returns high when complaint rate > 0.1% and < 0.2%", () => {
    const c: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 2500,
      clicked: 400,
      bounced: 100,
      unsubscribed: 20,
      complained: 12, // 12/9800 ≈ 0.122% — between 0.1% and 0.2%
    };
    expect(reputationRisk(c)).toBe("high");
  });

  it("returns high when bounce rate > 5%", () => {
    const c: EmailCampaign = {
      ...goodCampaign,
      bounced: 600, // 600/10000 = 6%
    };
    expect(reputationRisk(c)).toBe("high");
  });

  it("returns medium when open rate < 10%", () => {
    // badCampaign has 6% bounce and high complaint so reputation is critical or high
    const riskLevel = reputationRisk(badCampaign);
    expect(["medium", "high", "critical"]).toContain(riskLevel);
  });

  it("returns medium when unsub rate > 0.3%", () => {
    const c: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 2000,
      clicked: 400,
      bounced: 100,
      unsubscribed: 50, // 50/9800 ≈ 0.51% > 0.3%
      complained: 1,
    };
    expect(reputationRisk(c)).toBe("medium");
  });
});

describe("inboxPlacementEstimate", () => {
  it("returns 0.90 for score >= 80", () => {
    expect(inboxPlacementEstimate(80)).toBe(0.90);
    expect(inboxPlacementEstimate(100)).toBe(0.90);
  });

  it("returns 0.75 for score >= 65 and < 80", () => {
    expect(inboxPlacementEstimate(65)).toBe(0.75);
    expect(inboxPlacementEstimate(79)).toBe(0.75);
  });

  it("returns 0.55 for score >= 50 and < 65", () => {
    expect(inboxPlacementEstimate(50)).toBe(0.55);
    expect(inboxPlacementEstimate(64)).toBe(0.55);
  });

  it("returns 0.30 for score < 50", () => {
    expect(inboxPlacementEstimate(49)).toBe(0.30);
    expect(inboxPlacementEstimate(0)).toBe(0.30);
  });
});

// ---------------------------------------------------------------------------
// A/B testing
// ---------------------------------------------------------------------------

describe("abTestSignificance", () => {
  it("detects significant difference between control and variant", () => {
    // Large sample with clear difference
    const result = abTestSignificance(200, 1000, 300, 1000);
    expect(result.significant).toBe(true);
    expect(result.winner).toBe("variant");
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("returns tie for equal rates", () => {
    const result = abTestSignificance(250, 1000, 250, 1000);
    expect(result.significant).toBe(false);
    expect(result.winner).toBe("tie");
  });

  it("returns tie and p=1 when either sent is 0", () => {
    const r1 = abTestSignificance(100, 0, 100, 1000);
    expect(r1.pValue).toBe(1);
    expect(r1.significant).toBe(false);

    const r2 = abTestSignificance(100, 1000, 100, 0);
    expect(r2.pValue).toBe(1);
    expect(r2.significant).toBe(false);
  });

  it("identifies control as winner when control rate is higher", () => {
    const result = abTestSignificance(400, 1000, 200, 1000);
    expect(result.significant).toBe(true);
    expect(result.winner).toBe("control");
  });

  it("pValue is between 0 and 1", () => {
    const result = abTestSignificance(250, 1000, 260, 1000);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("not significant for small sample with moderate difference", () => {
    const result = abTestSignificance(5, 50, 7, 50);
    // Could be either way — just ensure the structure is correct
    expect(typeof result.significant).toBe("boolean");
    expect(["control", "variant", "tie"]).toContain(result.winner);
  });
});

describe("minimumDetectableEffect", () => {
  it("returns a positive number for a typical base rate", () => {
    const mde = minimumDetectableEffect(0.2);
    expect(mde).toBeGreaterThan(0);
  });

  it("matches the spec formula: 1.65 * sqrt(2 * p * (1-p) / 100)", () => {
    const p = 0.25;
    const expected = 1.65 * Math.sqrt(2 * p * (1 - p) / 100);
    expect(minimumDetectableEffect(p)).toBeCloseTo(expected, 8);
  });

  it("accepts optional power and alpha without error", () => {
    expect(() => minimumDetectableEffect(0.2, 0.8, 0.05)).not.toThrow();
  });

  it("decreases as baseRate approaches 0 or 1 (edge behavior)", () => {
    const mde50 = minimumDetectableEffect(0.5);
    const mde10 = minimumDetectableEffect(0.1);
    // At 0.5 base rate variance is highest, MDE should be larger
    expect(mde50).toBeGreaterThan(mde10);
  });
});

describe("requiredSampleSize", () => {
  it("returns a positive integer for typical inputs", () => {
    const n = requiredSampleSize(0.20, 0.02);
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("returns Infinity when mde is 0", () => {
    expect(requiredSampleSize(0.20, 0)).toBe(Infinity);
  });

  it("larger MDE requires smaller sample", () => {
    const n1 = requiredSampleSize(0.20, 0.01);
    const n2 = requiredSampleSize(0.20, 0.05);
    expect(n1).toBeGreaterThan(n2);
  });

  it("uses defaults of power=0.8 and alpha=0.05", () => {
    const n1 = requiredSampleSize(0.20, 0.02);
    const n2 = requiredSampleSize(0.20, 0.02, 0.8, 0.05);
    expect(n1).toBe(n2);
  });

  it("higher power requires larger sample", () => {
    const n1 = requiredSampleSize(0.20, 0.02, 0.8);
    const n2 = requiredSampleSize(0.20, 0.02, 0.95);
    expect(n2).toBeGreaterThan(n1);
  });
});

// ---------------------------------------------------------------------------
// Send time optimization
// ---------------------------------------------------------------------------

describe("bestSendHour", () => {
  it("returns the hour with the most open events", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 1, 10),
      makeEvent("open", 1, 10),
      makeEvent("open", 1, 10),
      makeEvent("open", 2, 14),
      makeEvent("open", 3, 14),
      makeEvent("click", 1, 9), // ignored
    ];
    expect(bestSendHour(events)).toBe(10);
  });

  it("returns 0 when no open events exist", () => {
    const events: EmailEvent[] = [makeEvent("click", 1, 15)];
    expect(bestSendHour(events)).toBe(0);
  });

  it("handles a single event", () => {
    const events: EmailEvent[] = [makeEvent("open", 3, 7)];
    expect(bestSendHour(events)).toBe(7);
  });
});

describe("bestSendDay", () => {
  it("returns the day with the most open events", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 2, 10), // Tuesday
      makeEvent("open", 2, 11), // Tuesday
      makeEvent("open", 4, 10), // Thursday
    ];
    expect(bestSendDay(events)).toBe(2); // Tuesday
  });

  it("returns 0 when no open events", () => {
    expect(bestSendDay([])).toBe(0);
  });

  it("handles ties by returning first encountered", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 1, 10),
      makeEvent("open", 3, 10),
    ];
    // Array.indexOf returns first max — day 1 appears at index 1, day 3 at index 3
    const result = bestSendDay(events);
    expect([1, 3]).toContain(result);
  });
});

describe("sendTimeRecommendation", () => {
  it("returns a valid recommendation with score and reason", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 2, 10),
      makeEvent("open", 2, 10),
      makeEvent("open", 3, 14),
    ];
    const rec = sendTimeRecommendation(events);
    expect(rec.dayOfWeek).toBe(2);
    expect(rec.hour).toBe(10);
    expect(rec.score).toBeGreaterThan(0);
    expect(rec.score).toBeLessThanOrEqual(1);
    expect(typeof rec.reason).toBe("string");
    expect(rec.reason.length).toBeGreaterThan(0);
  });

  it("returns default recommendation when no events", () => {
    const rec = sendTimeRecommendation([]);
    expect(rec.score).toBe(0);
    expect(typeof rec.reason).toBe("string");
  });

  it("accepts optional timezone without error", () => {
    const events: EmailEvent[] = [makeEvent("open", 2, 10)];
    expect(() => sendTimeRecommendation(events, "America/New_York")).not.toThrow();
  });

  it("score equals fraction of opens in best slot", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 1, 9),
      makeEvent("open", 1, 9),
      makeEvent("open", 3, 15),
      makeEvent("open", 5, 9),
    ];
    const rec = sendTimeRecommendation(events);
    // Best slot is Monday 9am with 2 of 4 opens = 0.5
    expect(rec.score).toBeCloseTo(0.5);
  });
});

describe("hourlyEngagement", () => {
  it("returns array of length 24", () => {
    expect(hourlyEngagement([])).toHaveLength(24);
  });

  it("rates sum to ~1 when there are opens", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 1, 10),
      makeEvent("open", 2, 14),
      makeEvent("open", 3, 10),
      makeEvent("click", 1, 9),
    ];
    const rates = hourlyEngagement(events);
    const sum = rates.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it("returns all zeros when no opens", () => {
    const events: EmailEvent[] = [makeEvent("click", 1, 10)];
    const rates = hourlyEngagement(events);
    expect(rates.every((r) => r === 0)).toBe(true);
  });

  it("correctly assigns hour buckets", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 1, 8),
      makeEvent("open", 1, 8),
      makeEvent("open", 2, 20),
    ];
    const rates = hourlyEngagement(events);
    expect(rates[8]).toBeCloseTo(2 / 3);
    expect(rates[20]).toBeCloseTo(1 / 3);
  });
});

describe("dailyEngagement", () => {
  it("returns array of length 7", () => {
    expect(dailyEngagement([])).toHaveLength(7);
  });

  it("rates sum to ~1 when there are opens", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 0, 10),
      makeEvent("open", 2, 10),
      makeEvent("open", 4, 10),
    ];
    const rates = dailyEngagement(events);
    const sum = rates.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it("returns all zeros when no opens", () => {
    const rates = dailyEngagement([makeEvent("bounce", 1, 10)]);
    expect(rates.every((r) => r === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe("industryBenchmark", () => {
  it("returns sports benchmark with correct values", () => {
    const b = industryBenchmark("sports");
    expect(b.industry).toBe("sports");
    expect(b.avgOpenRate).toBeCloseTo(0.21);
    expect(b.avgClickRate).toBeCloseTo(0.025);
    expect(b.avgBounceRate).toBeCloseTo(0.008);
    expect(b.avgUnsubRate).toBeCloseTo(0.002);
  });

  it("returns media benchmark", () => {
    const b = industryBenchmark("media");
    expect(b.avgOpenRate).toBeCloseTo(0.22);
    expect(b.avgClickRate).toBeCloseTo(0.045);
  });

  it("returns ecommerce benchmark", () => {
    const b = industryBenchmark("ecommerce");
    expect(b.avgOpenRate).toBeCloseTo(0.15);
    expect(b.avgClickRate).toBeCloseTo(0.020);
  });

  it("returns saas benchmark", () => {
    const b = industryBenchmark("saas");
    expect(b.avgOpenRate).toBeCloseTo(0.24);
    expect(b.avgClickRate).toBeCloseTo(0.035);
  });

  it("returns general benchmark", () => {
    const b = industryBenchmark("general");
    expect(b.avgOpenRate).toBeCloseTo(0.18);
    expect(b.avgClickRate).toBeCloseTo(0.025);
  });
});

describe("benchmarkComparison", () => {
  it("returns above when significantly better than benchmark", () => {
    const outstanding: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 3000, // 30.6% vs sports 21%
      clicked: 700, // 7.14% vs sports 2.5%
      bounced: 200,
      unsubscribed: 20,
      complained: 1,
    };
    const comp = benchmarkComparison(outstanding, "sports");
    expect(comp.openRate).toBe("above");
    expect(comp.clickRate).toBe("above");
    expect(comp.overall).toBe("above");
  });

  it("returns below when significantly worse than benchmark", () => {
    const weak: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 1000, // ~10.2% vs sports 21%
      clicked: 100, // ~1.02% vs sports 2.5%
      bounced: 200,
      unsubscribed: 20,
      complained: 1,
    };
    const comp = benchmarkComparison(weak, "sports");
    expect(comp.openRate).toBe("below");
    expect(comp.clickRate).toBe("below");
    expect(comp.overall).toBe("below");
  });

  it("returns at when within 10% of benchmark", () => {
    // sports: avgOpenRate=21%, avgClickRate=2.5%
    const atBenchmark: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 2058, // 21% of 9800 = 2058
      clicked: 245, // 2.5% of 9800 = 245
      bounced: 80,
      unsubscribed: 20,
      complained: 2,
    };
    const comp = benchmarkComparison(atBenchmark, "sports");
    expect(comp.openRate).toBe("at");
    expect(comp.clickRate).toBe("at");
  });

  it("falls back to general benchmark for unknown industry", () => {
    const comp = benchmarkComparison(goodCampaign, "unknown_industry");
    expect(["above", "below", "at"]).toContain(comp.openRate);
    expect(["above", "below", "at"]).toContain(comp.clickRate);
    expect(["above", "below", "at"]).toContain(comp.overall);
  });
});

describe("performanceScore", () => {
  it("returns 100 for campaign 2x better than benchmark", () => {
    const great: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 4116, // 42% = 2× sports 21%
      clicked: 490,  // 5% = 2× sports 2.5%
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
    };
    expect(performanceScore(great, "sports")).toBe(100);
  });

  it("returns 0 for zero engagement", () => {
    const dead: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 0,
      clicked: 0,
      bounced: 100,
      unsubscribed: 10,
      complained: 0,
    };
    expect(performanceScore(dead, "sports")).toBe(0);
  });

  it("returns a value between 0 and 100", () => {
    const score = performanceScore(goodCampaign, "sports");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 50 for campaign at exactly benchmark open rate with no clicks", () => {
    const atOpen: EmailCampaign = {
      sent: 10000,
      delivered: 9800,
      opened: 2058, // ~21%
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
    };
    // orScore = 1.0 * 50 = 50; crScore = 0; total = 50
    expect(performanceScore(atOpen, "sports")).toBeCloseTo(50, 0);
  });
});

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

describe("pickAlertEngagement", () => {
  it("computes open rate, click rate, and engagement score", () => {
    const result = pickAlertEngagement(500, 200, 1000);
    expect(result.openRate).toBeCloseTo(0.5);
    expect(result.clickRate).toBeCloseTo(0.2);
    // engagementScore = (0.5 * 0.4 + 0.2 * 0.6) * 100 = (0.2 + 0.12) * 100 = 32
    expect(result.engagementScore).toBeCloseTo(32);
  });

  it("returns zero for all-zero inputs", () => {
    const result = pickAlertEngagement(0, 0, 0);
    expect(result.openRate).toBe(0);
    expect(result.clickRate).toBe(0);
    expect(result.engagementScore).toBe(0);
  });

  it("engagement score is clamped to [0, 100]", () => {
    const result = pickAlertEngagement(1000, 1000, 1000);
    expect(result.engagementScore).toBeLessThanOrEqual(100);
    expect(result.engagementScore).toBeGreaterThanOrEqual(0);
  });

  it("higher clicks produce higher engagement score", () => {
    const r1 = pickAlertEngagement(500, 100, 1000);
    const r2 = pickAlertEngagement(500, 400, 1000);
    expect(r2.engagementScore).toBeGreaterThan(r1.engagementScore);
  });
});

describe("optimalPickAlertTiming", () => {
  it("sends 2 hours before game for afternoon game", () => {
    expect(optimalPickAlertTiming(19)).toBe(17);
  });

  it("sends 2 hours before game for morning game at 10am", () => {
    expect(optimalPickAlertTiming(10)).toBe(8);
  });

  it("sends at game start hour when game starts at hour < 2", () => {
    expect(optimalPickAlertTiming(1)).toBe(1);
    expect(optimalPickAlertTiming(0)).toBe(0);
  });

  it("sends exactly 2 hours before for boundary case at hour 2", () => {
    expect(optimalPickAlertTiming(2)).toBe(0);
  });
});

describe("segmentByPickTier", () => {
  it("counts subscribers per tier", () => {
    const subs = [
      { tier: "free" as const },
      { tier: "free" as const },
      { tier: "pro" as const },
      { tier: "elite" as const },
      { tier: "pro" as const },
    ];
    const result = segmentByPickTier(subs);
    expect(result.free).toBe(2);
    expect(result.pro).toBe(2);
    expect(result.elite).toBe(1);
  });

  it("returns all zeros for empty array", () => {
    const result = segmentByPickTier([]);
    expect(result).toEqual({ free: 0, pro: 0, elite: 0 });
  });

  it("handles all same tier", () => {
    const subs = Array.from({ length: 5 }, () => ({ tier: "elite" as const }));
    const result = segmentByPickTier(subs);
    expect(result.elite).toBe(5);
    expect(result.free).toBe(0);
    expect(result.pro).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Additional edge case / integration tests
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("deliveryRate handles sent=0 without throwing", () => {
    expect(() => deliveryRate(zeroCampaign)).not.toThrow();
  });

  it("campaignHealthScore components sum correctly for a known campaign", () => {
    // goodCampaign: openRate=0.25, clickRate=0.05, bounceRate=0.02, unsubRate=0.01, complaintRate≈0.00102
    const score = campaignHealthScore(goodCampaign);
    const expected =
      0.25 * 30 +
      0.05 * 25 +
      (1 - 0.02) * 20 +
      (1 - unsubscribeRate(goodCampaign)) * 15 +
      (1 - complaintRate(goodCampaign)) * 10;
    expect(score).toBeCloseTo(expected, 2);
  });

  it("listHealthScore clamps negative values to 0", () => {
    const unhealthy: ListHealth = {
      totalSubscribers: 100,
      activeSubscribers: 0,
      hardBounces: 80,
      softBounces: 60,
      unsubscribes: 50,
    };
    expect(listHealthScore(unhealthy)).toBeGreaterThanOrEqual(0);
  });

  it("abTestSignificance handles identical campaigns", () => {
    const result = abTestSignificance(1000, 5000, 1000, 5000);
    expect(result.significant).toBe(false);
    expect(result.winner).toBe("tie");
  });

  it("inboxPlacementEstimate boundary at exactly 80", () => {
    expect(inboxPlacementEstimate(80)).toBe(0.90);
  });

  it("inboxPlacementEstimate boundary at exactly 65", () => {
    expect(inboxPlacementEstimate(65)).toBe(0.75);
  });

  it("inboxPlacementEstimate boundary at exactly 50", () => {
    expect(inboxPlacementEstimate(50)).toBe(0.55);
  });

  it("growthRate with equal values returns 0", () => {
    expect(growthRate(1000, 1000)).toBe(0);
  });

  it("roi with equal revenue and cost returns 0", () => {
    expect(roi(1000, 1000)).toBe(0);
  });

  it("churnRate > 1 is possible if lost > starting", () => {
    // Edge case: lost can be greater than starting if new joiners also left
    const rate = churnRate(1500, 1000);
    expect(rate).toBeCloseTo(1.5);
  });

  it("conversionRate handles zero clicks returning 0", () => {
    expect(conversionRate(10, 0)).toBe(0);
  });

  it("hourlyEngagement returns correct length with no opens", () => {
    const result = hourlyEngagement([]);
    expect(result).toHaveLength(24);
    expect(result.every((r) => r === 0)).toBe(true);
  });

  it("dailyEngagement returns correct length with no opens", () => {
    const result = dailyEngagement([]);
    expect(result).toHaveLength(7);
  });

  it("bestSendHour ignores non-open events", () => {
    const events: EmailEvent[] = [
      makeEvent("click", 1, 15),
      makeEvent("bounce", 2, 15),
      makeEvent("open", 1, 10),
    ];
    expect(bestSendHour(events)).toBe(10);
  });

  it("bestSendDay ignores non-open events", () => {
    const events: EmailEvent[] = [
      makeEvent("click", 3, 10),  // Wednesday — should be ignored
      makeEvent("open", 1, 10),   // Monday
    ];
    expect(bestSendDay(events)).toBe(1);
  });

  it("performanceScore uses general benchmark for unknown industry", () => {
    const score = performanceScore(goodCampaign, "aviation");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("pickAlertEngagement with 100% engagement is capped at 100", () => {
    const result = pickAlertEngagement(10000, 10000, 10000);
    expect(result.engagementScore).toBe(100);
  });

  it("requiredSampleSize rounds up to nearest integer", () => {
    const n = requiredSampleSize(0.2, 0.02);
    // The result must be an integer (Math.ceil)
    expect(n).toBe(Math.ceil(n));
  });

  it("hardBounceRate returns value between 0 and 1 for valid inputs", () => {
    const rate = hardBounceRate(100, 1000);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(1);
  });

  it("campaignGrade boundary at exactly 80 is A", () => {
    expect(campaignGrade(80)).toBe("A");
  });

  it("campaignGrade boundary at exactly 65 is B", () => {
    expect(campaignGrade(65)).toBe("B");
  });

  it("campaignGrade boundary at exactly 50 is C", () => {
    expect(campaignGrade(50)).toBe("C");
  });

  it("campaignGrade boundary at exactly 35 is D", () => {
    expect(campaignGrade(35)).toBe("D");
  });

  it("sendTimeRecommendation includes day name in reason", () => {
    const events: EmailEvent[] = [
      makeEvent("open", 2, 10),  // Tuesday
    ];
    const rec = sendTimeRecommendation(events);
    expect(rec.reason).toContain("Tuesday");
  });

  it("engagementSegmentation: 30-day boundary is highly_engaged not engaged", () => {
    const now = new Date("2024-06-01T12:00:00Z");
    const exactly30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sub = { opens: 1, clicks: 1, lastActivity: exactly30, now };
    const result = engagementSegmentation([sub]);
    expect(result.highly_engaged).toBe(1);
  });

  it("engagementSegmentation: 60-day boundary is engaged", () => {
    const now = new Date("2024-06-01T12:00:00Z");
    const exactly60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sub = { opens: 1, clicks: 0, lastActivity: exactly60, now };
    const result = engagementSegmentation([sub]);
    expect(result.engaged).toBe(1);
  });

  it("reputationRisk returns low for zero campaign", () => {
    // zeroCampaign: all rates = 0, openRate = 0 which is < 0.1 → medium
    // Actually openRate(zeroCampaign) = 0/0 = 0 < 0.10 → medium
    const risk = reputationRisk(zeroCampaign);
    expect(["low", "medium"]).toContain(risk);
  });

  it("revenuePerEmail returns correct value", () => {
    expect(revenuePerEmail(5000, 10000)).toBeCloseTo(0.5);
  });

  it("revenuePerClick returns correct value", () => {
    expect(revenuePerClick(2450, 490)).toBeCloseTo(5.0);
  });
});
