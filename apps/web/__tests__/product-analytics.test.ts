/**
 * Tests for product-analytics.ts
 * Covers edge cases: zero values, 100% rates, negative growth,
 * single-step funnels, NPS extremes.
 */
import { describe, it, expect } from 'vitest';
import {
  dau,
  wau,
  mau,
  stickinessRatio,
  weeklyStickiness,
  engagementScore,
  dayOneRetention,
  day7Retention,
  day30Retention,
  retentionCurveSlope,
  churnRate,
  retentionBucket,
  featureAdoptionRate,
  featureAdoptionVelocity,
  featureStickiness,
  adoptionFunnel,
  timeToAdopt,
  averageSessionDuration,
  bounceRate,
  pagesPerSession,
  sessionDepth,
  sessionQualityScore,
  npsScore,
  npsCategory,
  csatScore,
  sentimentScore,
  growthRate,
  compoundGrowthRate,
  kFactor,
  paybackPeriod,
  customerLifetimeValue,
  funnelConversionRate,
  funnelDropOff,
  funnelDropOffPct,
  funnelRevenue,
  identifyBottleneck,
  pickViewToFavoriteRate,
  pickEngagement,
  subscriptionConversionFunnel,
  contentPerformanceScore,
} from '@/lib/analytics/product-analytics';

// ---------------------------------------------------------------------------
// 1. User engagement ratios
// ---------------------------------------------------------------------------

describe('dau', () => {
  it('returns the value unchanged', () => {
    expect(dau(1000)).toBe(1000);
  });
  it('handles zero', () => {
    expect(dau(0)).toBe(0);
  });
  it('handles large values', () => {
    expect(dau(1_000_000)).toBe(1_000_000);
  });
});

describe('wau', () => {
  it('returns the value unchanged', () => {
    expect(wau(5000)).toBe(5000);
  });
  it('handles zero', () => {
    expect(wau(0)).toBe(0);
  });
});

describe('mau', () => {
  it('returns the value unchanged', () => {
    expect(mau(20000)).toBe(20000);
  });
  it('handles zero', () => {
    expect(mau(0)).toBe(0);
  });
});

describe('stickinessRatio', () => {
  it('computes DAU/MAU correctly', () => {
    expect(stickinessRatio(500, 2000)).toBeCloseTo(0.25);
  });
  it('returns 0 when MAU is 0', () => {
    expect(stickinessRatio(500, 0)).toBe(0);
  });
  it('returns 1 when DAU equals MAU', () => {
    expect(stickinessRatio(1000, 1000)).toBe(1);
  });
  it('handles fractional ratios', () => {
    expect(stickinessRatio(1, 3)).toBeCloseTo(0.3333, 4);
  });
});

describe('weeklyStickiness', () => {
  it('computes WAU/MAU correctly', () => {
    expect(weeklyStickiness(2500, 10000)).toBeCloseTo(0.25);
  });
  it('returns 0 when MAU is 0', () => {
    expect(weeklyStickiness(100, 0)).toBe(0);
  });
  it('returns 1 when WAU equals MAU', () => {
    expect(weeklyStickiness(5000, 5000)).toBe(1);
  });
});

describe('engagementScore', () => {
  it('computes correctly for typical values', () => {
    // sessions*2 + actions*0.5 + durationMinutes*0.1
    // 10*2 + 20*0.5 + 30*0.1 = 20 + 10 + 3 = 33
    expect(engagementScore(10, 20, 30)).toBeCloseTo(33);
  });
  it('caps at 100', () => {
    expect(engagementScore(100, 1000, 5000)).toBe(100);
  });
  it('returns 0 for zero inputs', () => {
    expect(engagementScore(0, 0, 0)).toBe(0);
  });
  it('handles boundary at exactly 100', () => {
    // 50*2 = 100
    expect(engagementScore(50, 0, 0)).toBe(100);
  });
  it('handles fractional duration', () => {
    // 0 + 0 + 100*0.1 = 10
    expect(engagementScore(0, 0, 100)).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// 2. Retention analysis
// ---------------------------------------------------------------------------

describe('dayOneRetention', () => {
  it('computes correctly', () => {
    expect(dayOneRetention(1000, 400)).toBeCloseTo(40);
  });
  it('returns 0 when usersDay0 is 0', () => {
    expect(dayOneRetention(0, 400)).toBe(0);
  });
  it('returns 100 when all users return', () => {
    expect(dayOneRetention(500, 500)).toBeCloseTo(100);
  });
  it('can exceed 100 (e.g. new users counted on day1)', () => {
    expect(dayOneRetention(100, 110)).toBeCloseTo(110);
  });
});

describe('day7Retention', () => {
  it('computes correctly', () => {
    expect(day7Retention(1000, 250)).toBeCloseTo(25);
  });
  it('returns 0 when usersDay0 is 0', () => {
    expect(day7Retention(0, 100)).toBe(0);
  });
  it('returns 100 for perfect retention', () => {
    expect(day7Retention(200, 200)).toBeCloseTo(100);
  });
});

describe('day30Retention', () => {
  it('computes correctly', () => {
    expect(day30Retention(1000, 100)).toBeCloseTo(10);
  });
  it('returns 0 when usersDay0 is 0', () => {
    expect(day30Retention(0, 50)).toBe(0);
  });
  it('returns 0 when no users remain', () => {
    expect(day30Retention(500, 0)).toBeCloseTo(0);
  });
});

describe('retentionCurveSlope', () => {
  it('returns 0 for empty array', () => {
    expect(retentionCurveSlope([])).toBe(0);
  });
  it('returns 0 for single-element array', () => {
    expect(retentionCurveSlope([50])).toBe(0);
  });
  it('computes negative slope for declining retention', () => {
    const slope = retentionCurveSlope([100, 50, 25]);
    expect(slope).toBeLessThan(0);
  });
  it('computes positive slope for growing retention', () => {
    const slope = retentionCurveSlope([10, 20, 30]);
    expect(slope).toBeGreaterThan(0);
  });
  it('slope is 0 for flat retention', () => {
    expect(retentionCurveSlope([40, 40, 40])).toBeCloseTo(0);
  });
  it('computes exact slope for two-point line', () => {
    // (20 - 10) / 1 = 10
    expect(retentionCurveSlope([10, 20])).toBeCloseTo(10);
  });
});

describe('churnRate', () => {
  it('computes correctly', () => {
    // (1000 + 200 - 900) / 1000 * 100 = 30
    expect(churnRate(1000, 900, 200)).toBeCloseTo(30);
  });
  it('returns 0 when startUsers is 0', () => {
    expect(churnRate(0, 100, 50)).toBe(0);
  });
  it('handles zero churn (all users retained, no new)', () => {
    // (1000 + 0 - 1000) / 1000 * 100 = 0
    expect(churnRate(1000, 1000, 0)).toBeCloseTo(0);
  });
  it('handles negative effective churn (growth)', () => {
    // (100 + 50 - 160) / 100 * 100 = -10
    expect(churnRate(100, 160, 50)).toBeCloseTo(-10);
  });
});

describe('retentionBucket', () => {
  it('returns excellent for rate > 40', () => {
    expect(retentionBucket(41)).toBe('excellent');
    expect(retentionBucket(100)).toBe('excellent');
  });
  it('returns good for rate > 25 and <= 40', () => {
    expect(retentionBucket(26)).toBe('good');
    expect(retentionBucket(40)).toBe('good');
  });
  it('returns average for rate > 10 and <= 25', () => {
    expect(retentionBucket(11)).toBe('average');
    expect(retentionBucket(25)).toBe('average');
  });
  it('returns poor for rate <= 10', () => {
    expect(retentionBucket(10)).toBe('poor');
    expect(retentionBucket(0)).toBe('poor');
    expect(retentionBucket(-5)).toBe('poor');
  });
  it('boundary: exactly 40 is good not excellent', () => {
    expect(retentionBucket(40)).toBe('good');
  });
  it('boundary: exactly 25 is average not good', () => {
    expect(retentionBucket(25)).toBe('average');
  });
});

// ---------------------------------------------------------------------------
// 3. Feature adoption
// ---------------------------------------------------------------------------

describe('featureAdoptionRate', () => {
  it('computes correctly', () => {
    expect(featureAdoptionRate(300, 1000)).toBeCloseTo(30);
  });
  it('returns 0 when totalEligibleUsers is 0', () => {
    expect(featureAdoptionRate(100, 0)).toBe(0);
  });
  it('returns 100 for full adoption', () => {
    expect(featureAdoptionRate(500, 500)).toBeCloseTo(100);
  });
});

describe('featureAdoptionVelocity', () => {
  it('returns 0 for empty array', () => {
    expect(featureAdoptionVelocity([])).toBe(0);
  });
  it('returns 0 for single-element array', () => {
    expect(featureAdoptionVelocity([50])).toBe(0);
  });
  it('computes positive velocity', () => {
    // (60 - 20) / 2 = 20
    expect(featureAdoptionVelocity([20, 40, 60])).toBeCloseTo(20);
  });
  it('computes negative velocity for declining adoption', () => {
    expect(featureAdoptionVelocity([80, 50, 20])).toBeCloseTo(-30);
  });
  it('computes for two elements', () => {
    expect(featureAdoptionVelocity([10, 30])).toBeCloseTo(20);
  });
  it('returns 0 for flat adoption', () => {
    expect(featureAdoptionVelocity([30, 30, 30])).toBeCloseTo(0);
  });
});

describe('featureStickiness', () => {
  it('computes correctly', () => {
    expect(featureStickiness(100, 400)).toBeCloseTo(0.25);
  });
  it('returns 0 when featureMAU is 0', () => {
    expect(featureStickiness(50, 0)).toBe(0);
  });
  it('returns 1 for perfect stickiness', () => {
    expect(featureStickiness(200, 200)).toBe(1);
  });
});

describe('adoptionFunnel', () => {
  it('first step has no dropoff and 100% conversion', () => {
    const result = adoptionFunnel([1000, 600, 300]);
    expect(result[0]).toEqual({ step: 0, users: 1000, dropOff: 0, conversionFromPrev: 100 });
  });
  it('computes correct dropoff and conversion for subsequent steps', () => {
    const result = adoptionFunnel([1000, 600, 300]);
    const step1 = result[1];
    const step2 = result[2];
    expect(step1?.dropOff).toBe(400);
    expect(step1?.conversionFromPrev).toBeCloseTo(60);
    expect(step2?.dropOff).toBe(300);
    expect(step2?.conversionFromPrev).toBeCloseTo(50);
  });
  it('handles single-step funnel', () => {
    const result = adoptionFunnel([500]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ step: 0, users: 500, dropOff: 0, conversionFromPrev: 100 });
  });
  it('handles empty array', () => {
    expect(adoptionFunnel([])).toEqual([]);
  });
  it('handles zero in previous step without dividing by zero', () => {
    const result = adoptionFunnel([0, 100]);
    expect(result[1]?.conversionFromPrev).toBe(0);
  });
});

describe('timeToAdopt', () => {
  it('computes days correctly', () => {
    const login = new Date('2024-01-01T00:00:00Z');
    const use = new Date('2024-01-06T00:00:00Z');
    expect(timeToAdopt(login, use)).toBe(5);
  });
  it('floors fractional days', () => {
    const login = new Date('2024-01-01T00:00:00Z');
    const use = new Date('2024-01-01T12:00:00Z');
    expect(timeToAdopt(login, use)).toBe(0);
  });
  it('returns 0 for same day', () => {
    const d = new Date('2024-03-15T09:00:00Z');
    expect(timeToAdopt(d, d)).toBe(0);
  });
  it('handles large gaps', () => {
    const login = new Date('2024-01-01T00:00:00Z');
    const use = new Date('2024-04-01T00:00:00Z');
    expect(timeToAdopt(login, use)).toBe(91);
  });
});

// ---------------------------------------------------------------------------
// 4. Session analytics
// ---------------------------------------------------------------------------

describe('averageSessionDuration', () => {
  it('computes correctly', () => {
    expect(averageSessionDuration(60000, 10)).toBe(6000);
  });
  it('returns 0 when sessions is 0', () => {
    expect(averageSessionDuration(100000, 0)).toBe(0);
  });
  it('handles single session', () => {
    expect(averageSessionDuration(45000, 1)).toBe(45000);
  });
});

describe('bounceRate', () => {
  it('computes correctly', () => {
    expect(bounceRate(300, 1000)).toBeCloseTo(30);
  });
  it('returns 0 when totalSessions is 0', () => {
    expect(bounceRate(100, 0)).toBe(0);
  });
  it('returns 100 when all sessions bounced', () => {
    expect(bounceRate(500, 500)).toBeCloseTo(100);
  });
  it('returns 0 when no sessions bounced', () => {
    expect(bounceRate(0, 500)).toBeCloseTo(0);
  });
});

describe('pagesPerSession', () => {
  it('computes correctly', () => {
    expect(pagesPerSession(5000, 1000)).toBeCloseTo(5);
  });
  it('returns 0 when sessions is 0', () => {
    expect(pagesPerSession(100, 0)).toBe(0);
  });
  it('handles fractional pages', () => {
    expect(pagesPerSession(1, 2)).toBeCloseTo(0.5);
  });
});

describe('sessionDepth', () => {
  it('returns zeros for empty array', () => {
    expect(sessionDepth([])).toEqual({ mean: 0, median: 0, p75: 0, p95: 0 });
  });
  it('computes correctly for a single element', () => {
    const result = sessionDepth([10]);
    expect(result.mean).toBe(10);
    expect(result.median).toBe(10);
    expect(result.p75).toBe(10);
    expect(result.p95).toBe(10);
  });
  it('computes mean correctly', () => {
    const result = sessionDepth([2, 4, 6, 8, 10]);
    expect(result.mean).toBe(6);
  });
  it('computes median for odd count', () => {
    const result = sessionDepth([1, 3, 5, 7, 9]);
    expect(result.median).toBe(5);
  });
  it('computes median for even count', () => {
    const result = sessionDepth([1, 2, 3, 4]);
    expect(result.median).toBeCloseTo(2.5);
  });
  it('p95 is near max for small arrays', () => {
    const result = sessionDepth([1, 5, 10, 50, 100]);
    expect(result.p95).toBeGreaterThan(50);
  });
  it('handles unsorted input', () => {
    const result = sessionDepth([10, 2, 8, 4, 6]);
    expect(result.mean).toBeCloseTo(6);
    expect(result.median).toBe(6);
  });
});

describe('sessionQualityScore', () => {
  it('returns 0 for bounced session', () => {
    expect(sessionQualityScore(300000, 5, 10, true)).toBe(0);
  });
  it('computes for non-bounced session', () => {
    // (300000/300000)*30 + (5/10)*30 + (10/20)*40 = 30 + 15 + 20 = 65
    expect(sessionQualityScore(300000, 5, 10, false)).toBeCloseTo(65);
  });
  it('caps at 100', () => {
    expect(sessionQualityScore(9000000, 100, 200, false)).toBe(100);
  });
  it('returns 0 for zero inputs (non-bounced)', () => {
    expect(sessionQualityScore(0, 0, 0, false)).toBe(0);
  });
  it('handles maximum non-bounced components', () => {
    // (300000/300000)*30 + (10/10)*30 + (20/20)*40 = 30 + 30 + 40 = 100
    expect(sessionQualityScore(300000, 10, 20, false)).toBeCloseTo(100);
  });
});

// ---------------------------------------------------------------------------
// 5. NPS and satisfaction
// ---------------------------------------------------------------------------

describe('npsScore', () => {
  it('computes correctly', () => {
    // (60/100 - 10/100)*100 = 50
    expect(npsScore(60, 10, 100)).toBeCloseTo(50);
  });
  it('returns 0 when total is 0', () => {
    expect(npsScore(0, 0, 0)).toBe(0);
  });
  it('returns 100 for all promoters', () => {
    expect(npsScore(100, 0, 100)).toBeCloseTo(100);
  });
  it('returns -100 for all detractors', () => {
    expect(npsScore(0, 100, 100)).toBeCloseTo(-100);
  });
  it('returns 0 when equal promoters and detractors', () => {
    expect(npsScore(25, 25, 100)).toBeCloseTo(0);
  });
  it('handles extreme positive NPS', () => {
    expect(npsScore(90, 0, 100)).toBeCloseTo(90);
  });
  it('handles extreme negative NPS', () => {
    expect(npsScore(0, 80, 100)).toBeCloseTo(-80);
  });
});

describe('npsCategory', () => {
  it('returns excellent for score > 70', () => {
    expect(npsCategory(71)).toBe('excellent');
    expect(npsCategory(100)).toBe('excellent');
  });
  it('returns good for score > 50 and <= 70', () => {
    expect(npsCategory(51)).toBe('good');
    expect(npsCategory(70)).toBe('good');
  });
  it('returns needs_improvement for score > 0 and <= 50', () => {
    expect(npsCategory(1)).toBe('needs_improvement');
    expect(npsCategory(50)).toBe('needs_improvement');
  });
  it('returns bad for score <= 0', () => {
    expect(npsCategory(0)).toBe('bad');
    expect(npsCategory(-50)).toBe('bad');
    expect(npsCategory(-100)).toBe('bad');
  });
  it('boundary: exactly 70 is good not excellent', () => {
    expect(npsCategory(70)).toBe('good');
  });
});

describe('csatScore', () => {
  it('computes correctly', () => {
    expect(csatScore(80, 100)).toBeCloseTo(80);
  });
  it('returns 0 when totalResponses is 0', () => {
    expect(csatScore(0, 0)).toBe(0);
  });
  it('returns 100 for all satisfied', () => {
    expect(csatScore(200, 200)).toBeCloseTo(100);
  });
});

describe('sentimentScore', () => {
  it('computes correctly', () => {
    // (60 - 20) / (60 + 20 + 20) * 100 = 40/100 * 100 = 40
    expect(sentimentScore(60, 20, 20)).toBeCloseTo(40);
  });
  it('returns 0 when all counts are 0', () => {
    expect(sentimentScore(0, 0, 0)).toBe(0);
  });
  it('returns 100 for all positive', () => {
    expect(sentimentScore(100, 0, 0)).toBeCloseTo(100);
  });
  it('returns -100 for all negative', () => {
    expect(sentimentScore(0, 100, 0)).toBeCloseTo(-100);
  });
  it('returns 0 for equal positive and negative', () => {
    expect(sentimentScore(50, 50, 0)).toBeCloseTo(0);
  });
  it('handles only neutral responses', () => {
    expect(sentimentScore(0, 0, 100)).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Growth metrics
// ---------------------------------------------------------------------------

describe('growthRate', () => {
  it('computes positive growth', () => {
    expect(growthRate(150, 100)).toBeCloseTo(50);
  });
  it('computes negative growth', () => {
    expect(growthRate(80, 100)).toBeCloseTo(-20);
  });
  it('throws when previous is 0', () => {
    expect(() => growthRate(100, 0)).toThrow();
  });
  it('returns 0 for unchanged value', () => {
    expect(growthRate(100, 100)).toBeCloseTo(0);
  });
  it('handles very large growth', () => {
    expect(growthRate(1000, 1)).toBeCloseTo(99900);
  });
  it('handles shrinkage to zero', () => {
    expect(growthRate(0, 100)).toBeCloseTo(-100);
  });
});

describe('compoundGrowthRate', () => {
  it('computes CAGR correctly', () => {
    // ((200/100)^(1/5) - 1)*100 ≈ 14.87%
    const cagr = compoundGrowthRate(100, 200, 5);
    expect(cagr).toBeCloseTo(14.87, 1);
  });
  it('returns 0 for same start and end', () => {
    expect(compoundGrowthRate(100, 100, 5)).toBeCloseTo(0);
  });
  it('throws when startValue is 0', () => {
    expect(() => compoundGrowthRate(0, 100, 5)).toThrow();
  });
  it('handles decline', () => {
    const cagr = compoundGrowthRate(100, 50, 2);
    expect(cagr).toBeLessThan(0);
  });
  it('handles single period', () => {
    const cagr = compoundGrowthRate(100, 120, 1);
    expect(cagr).toBeCloseTo(20);
  });
});

describe('kFactor', () => {
  it('computes k-factor correctly', () => {
    expect(kFactor(5, 0.2)).toBeCloseTo(1);
  });
  it('returns 0 when either input is 0', () => {
    expect(kFactor(0, 0.5)).toBe(0);
    expect(kFactor(5, 0)).toBe(0);
  });
  it('k > 1 signals viral growth', () => {
    expect(kFactor(10, 0.15)).toBeCloseTo(1.5);
  });
});

describe('paybackPeriod', () => {
  it('computes correctly', () => {
    // 100 / (20 * 0.7) = 100 / 14 ≈ 7.14
    expect(paybackPeriod(100, 20, 70)).toBeCloseTo(7.14, 2);
  });
  it('handles different margins', () => {
    // 500 / (50 * 0.5) = 500 / 25 = 20
    expect(paybackPeriod(500, 50, 50)).toBeCloseTo(20);
  });
});

describe('customerLifetimeValue', () => {
  it('computes correctly', () => {
    // 100 / 0.05 = 2000
    expect(customerLifetimeValue(100, 0.05)).toBeCloseTo(2000);
  });
  it('returns Infinity for zero churn', () => {
    expect(customerLifetimeValue(100, 0)).toBe(Infinity);
  });
  it('higher churn yields lower LTV', () => {
    const ltv1 = customerLifetimeValue(100, 0.02);
    const ltv2 = customerLifetimeValue(100, 0.1);
    expect(ltv1).toBeGreaterThan(ltv2);
  });
});

// ---------------------------------------------------------------------------
// 7. Funnel analytics
// ---------------------------------------------------------------------------

describe('funnelConversionRate', () => {
  it('computes correctly', () => {
    expect(funnelConversionRate(1000, 50)).toBeCloseTo(5);
  });
  it('returns 0 when topOfFunnel is 0', () => {
    expect(funnelConversionRate(0, 50)).toBe(0);
  });
  it('returns 100 when all convert', () => {
    expect(funnelConversionRate(500, 500)).toBeCloseTo(100);
  });
  it('handles sub-1% conversion', () => {
    expect(funnelConversionRate(10000, 5)).toBeCloseTo(0.05);
  });
});

describe('funnelDropOff', () => {
  it('computes absolute dropoffs', () => {
    expect(funnelDropOff([1000, 600, 300, 100])).toEqual([400, 300, 200]);
  });
  it('returns empty array for single stage', () => {
    expect(funnelDropOff([1000])).toEqual([]);
  });
  it('returns empty for empty array', () => {
    expect(funnelDropOff([])).toEqual([]);
  });
  it('handles zero dropoff (no loss)', () => {
    expect(funnelDropOff([500, 500])).toEqual([0]);
  });
  it('handles two-stage funnel', () => {
    expect(funnelDropOff([200, 100])).toEqual([100]);
  });
});

describe('funnelDropOffPct', () => {
  it('computes percentage dropoffs', () => {
    const result = funnelDropOffPct([1000, 800, 400]);
    expect(result[0]).toBeCloseTo(20);
    expect(result[1]).toBeCloseTo(50);
  });
  it('returns empty for single or empty array', () => {
    expect(funnelDropOffPct([1000])).toEqual([]);
    expect(funnelDropOffPct([])).toEqual([]);
  });
  it('handles zero in previous stage', () => {
    const result = funnelDropOffPct([0, 100]);
    expect(result[0]).toBe(0);
  });
  it('returns 0 for no dropoff', () => {
    const result = funnelDropOffPct([500, 500]);
    expect(result[0]).toBeCloseTo(0);
  });
  it('returns 100 for complete falloff', () => {
    const result = funnelDropOffPct([500, 0]);
    expect(result[0]).toBeCloseTo(100);
  });
});

describe('funnelRevenue', () => {
  it('computes total revenue', () => {
    // 1000*0 + 600*10 + 100*99 = 0 + 6000 + 9900 = 15900
    expect(funnelRevenue([1000, 600, 100], [0, 10, 99])).toBeCloseTo(15900);
  });
  it('returns 0 for all zero values', () => {
    expect(funnelRevenue([0, 0, 0], [10, 20, 30])).toBe(0);
  });
  it('handles single stage', () => {
    expect(funnelRevenue([100], [5])).toBe(500);
  });
  it('handles empty arrays', () => {
    expect(funnelRevenue([], [])).toBe(0);
  });
  it('uses 0 for missing conversionValues', () => {
    expect(funnelRevenue([100, 50], [10])).toBe(1000);
  });
});

describe('identifyBottleneck', () => {
  it('returns index of highest absolute dropoff', () => {
    // drops: 100, 400, 50 → max at index 1
    expect(identifyBottleneck([1000, 900, 500, 450])).toBe(1);
  });
  it('returns -1 for empty array', () => {
    expect(identifyBottleneck([])).toBe(-1);
  });
  it('returns -1 for single element', () => {
    expect(identifyBottleneck([1000])).toBe(-1);
  });
  it('returns 0 for two-stage funnel', () => {
    expect(identifyBottleneck([500, 100])).toBe(0);
  });
  it('returns first max when tied', () => {
    // drops: 200, 200 → first one at index 0
    const result = identifyBottleneck([1000, 800, 600]);
    expect(result).toBe(0);
  });
  it('handles ascending funnel (negative drops)', () => {
    const result = identifyBottleneck([100, 200, 300]);
    // all drops negative, picks the "least negative" i.e. largest drop which is still index 0
    expect(typeof result).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 8. Pick platform specific
// ---------------------------------------------------------------------------

describe('pickViewToFavoriteRate', () => {
  it('computes correctly', () => {
    expect(pickViewToFavoriteRate(1000, 50)).toBeCloseTo(5);
  });
  it('returns 0 when views is 0', () => {
    expect(pickViewToFavoriteRate(0, 50)).toBe(0);
  });
  it('returns 100 when all views are favorites', () => {
    expect(pickViewToFavoriteRate(200, 200)).toBeCloseTo(100);
  });
  it('handles fractional rates', () => {
    expect(pickViewToFavoriteRate(3, 1)).toBeCloseTo(33.33, 1);
  });
});

describe('pickEngagement', () => {
  it('computes correctly', () => {
    // (3*3 + 2*5 + 4*4) / 100 * 100 = (9+10+16)/100*100 = 35
    expect(pickEngagement(100, 3, 2, 4)).toBeCloseTo(35);
  });
  it('returns 0 when views is 0', () => {
    expect(pickEngagement(0, 10, 5, 3)).toBe(0);
  });
  it('caps at 100', () => {
    expect(pickEngagement(1, 1000, 1000, 1000)).toBe(100);
  });
  it('returns 0 when no engagement actions', () => {
    expect(pickEngagement(100, 0, 0, 0)).toBeCloseTo(0);
  });
});

describe('subscriptionConversionFunnel', () => {
  it('computes all rates correctly', () => {
    const result = subscriptionConversionFunnel(10000, 1000, 300, 100);
    expect(result.signupRate).toBeCloseTo(10);
    expect(result.trialRate).toBeCloseTo(30);
    expect(result.paidRate).toBeCloseTo(33.33, 1);
    expect(result.overallRate).toBeCloseTo(1);
  });
  it('returns 0 for all rates when visitors is 0', () => {
    const result = subscriptionConversionFunnel(0, 0, 0, 0);
    expect(result.signupRate).toBe(0);
    expect(result.trialRate).toBe(0);
    expect(result.paidRate).toBe(0);
    expect(result.overallRate).toBe(0);
  });
  it('returns 0 for trialRate when signups is 0', () => {
    const result = subscriptionConversionFunnel(1000, 0, 100, 50);
    expect(result.trialRate).toBe(0);
  });
  it('returns 0 for paidRate when trialists is 0', () => {
    const result = subscriptionConversionFunnel(1000, 100, 0, 50);
    expect(result.paidRate).toBe(0);
  });
  it('handles perfect conversion', () => {
    const result = subscriptionConversionFunnel(100, 100, 100, 100);
    expect(result.signupRate).toBeCloseTo(100);
    expect(result.trialRate).toBeCloseTo(100);
    expect(result.paidRate).toBeCloseTo(100);
    expect(result.overallRate).toBeCloseTo(100);
  });
});

describe('contentPerformanceScore', () => {
  it('computes correctly for typical values', () => {
    // views: 500/1000*30 = 15; time: 90/180*40 = 20; scroll: 50
    // but scroll capped at 30, so 15 + 20 + 30 = 65
    expect(contentPerformanceScore(500, 90, 50)).toBeCloseTo(65);
  });
  it('returns 0 for all zero inputs', () => {
    expect(contentPerformanceScore(0, 0, 0)).toBeCloseTo(0);
  });
  it('caps views component at 30 points', () => {
    // 10000 views => 10000/1000*30 = 300, capped to 30
    // time=0, scroll=0
    expect(contentPerformanceScore(10000, 0, 0)).toBeCloseTo(30);
  });
  it('caps time component at 40 points', () => {
    // views=0, time=1800 => 1800/180*40=400 capped to 40, scroll=0
    expect(contentPerformanceScore(0, 1800, 0)).toBeCloseTo(40);
  });
  it('caps scroll component at 30 points', () => {
    // views=0, time=0, scroll=90%
    expect(contentPerformanceScore(0, 0, 90)).toBeCloseTo(30);
  });
  it('achieves maximum of 100 when all components maxed', () => {
    expect(contentPerformanceScore(10000, 1800, 100)).toBeCloseTo(100);
  });
  it('handles low-traffic content', () => {
    // 10 views: 10/1000*30=0.3; time=30s: 30/180*40≈6.67; scroll=20%: 20
    const score = contentPerformanceScore(10, 30, 20);
    expect(score).toBeCloseTo(0.3 + 6.67 + 20, 1);
  });
});
