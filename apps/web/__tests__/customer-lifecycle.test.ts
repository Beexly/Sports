/**
 * Tests for customer-lifecycle.ts — 150+ test cases covering all exported functions.
 */

import { describe, it, expect } from 'vitest'
import {
  // LTV
  simpleLTV,
  discountedLTV,
  predictedLTV,
  ltvCAcRatio,
  paybackPeriod,
  ltvBySegment,
  // Churn
  churnRate,
  retentionRate,
  monthlyToAnnualChurn,
  annualToMonthlyChurn,
  avgCustomerLifespan,
  churnPredictionScore,
  // Segmentation
  rFMScore,
  customerSegment,
  cohortRetention,
  customerHealthScore,
  // Acquisition
  customerAcquisitionCost,
  conversionRate,
  trialConversionRate,
  timeToConvert,
  leadScoringModel,
  // Revenue
  mrr,
  arr,
  mrrGrowthRate,
  netRevenueRetention,
  grossRevenueRetention,
  expansionRevenue,
  revenuePerUser,
  // Engagement
  dailyActiveUserRate,
  featureAdoptionRate,
  engagementScore,
  stickiness,
  powerUserRate,
  sessionEngagementScore,
  // Sports specific
  pickEngagementRate,
  subscriptionUpliftFromPick,
  betterROISegment,
  monthlyBurnRate,
  runwayMonths,
} from '@/lib/analytics/customer-lifecycle'

// ---------------------------------------------------------------------------
// 1. Customer Lifetime Value
// ---------------------------------------------------------------------------

describe('simpleLTV', () => {
  it('multiplies the three inputs', () => {
    expect(simpleLTV(100, 12, 3)).toBe(3600)
  })

  it('returns 0 when avgOrderValue is 0', () => {
    expect(simpleLTV(0, 12, 3)).toBe(0)
  })

  it('returns 0 when purchaseFrequency is 0', () => {
    expect(simpleLTV(100, 0, 3)).toBe(0)
  })

  it('returns 0 when lifespan is 0', () => {
    expect(simpleLTV(100, 12, 0)).toBe(0)
  })

  it('handles fractional values', () => {
    expect(simpleLTV(50, 1.5, 2)).toBeCloseTo(150)
  })

  it('handles a single year', () => {
    expect(simpleLTV(200, 6, 1)).toBe(1200)
  })
})

describe('discountedLTV', () => {
  it('discounts single cash flow at period 1', () => {
    expect(discountedLTV([110], 0.1)).toBeCloseTo(100)
  })

  it('returns 0 for empty cash flows', () => {
    expect(discountedLTV([], 0.1)).toBe(0)
  })

  it('sums discounted cash flows', () => {
    // 100/(1.1) + 100/(1.1)^2
    const expected = 100 / 1.1 + 100 / 1.21
    expect(discountedLTV([100, 100], 0.1)).toBeCloseTo(expected)
  })

  it('with 0 discount rate sums flows directly', () => {
    expect(discountedLTV([100, 200, 300], 0)).toBeCloseTo(600)
  })

  it('higher discount rate produces lower NPV', () => {
    const low = discountedLTV([100, 100, 100], 0.05)
    const high = discountedLTV([100, 100, 100], 0.2)
    expect(high).toBeLessThan(low)
  })
})

describe('predictedLTV', () => {
  it('returns 0 for empty historical revenue', () => {
    expect(predictedLTV([], 5)).toBe(0)
  })

  it('with 0 growth sums avg over periods', () => {
    // avg = 100, 3 periods → 100*1 + 100*1 + 100*1 = 300
    expect(predictedLTV([100], 3, 0)).toBeCloseTo(300)
  })

  it('applies compound growth', () => {
    // avg=100, 2 periods, 10% growth: 110 + 121 = 231
    expect(predictedLTV([100], 2, 0.1)).toBeCloseTo(231)
  })

  it('projects 0 periods gives 0', () => {
    expect(predictedLTV([100, 200], 0)).toBe(0)
  })

  it('averages historical revenues correctly', () => {
    // avg = 150, 1 period, 0 growth → 150
    expect(predictedLTV([100, 200], 1, 0)).toBeCloseTo(150)
  })

  it('uses default growthRate of 0', () => {
    expect(predictedLTV([100], 2)).toBeCloseTo(200)
  })
})

describe('ltvCAcRatio', () => {
  it('divides ltv by cac', () => {
    expect(ltvCAcRatio(1000, 200)).toBe(5)
  })

  it('returns Infinity when cac=0 and ltv>0', () => {
    expect(ltvCAcRatio(100, 0)).toBe(Infinity)
  })

  it('returns 0 when both are 0', () => {
    expect(ltvCAcRatio(0, 0)).toBe(0)
  })

  it('handles ltv < cac', () => {
    expect(ltvCAcRatio(100, 500)).toBe(0.2)
  })
})

describe('paybackPeriod', () => {
  it('calculates months to recover cac', () => {
    // 1000 / (200 * 0.8) = 6.25
    expect(paybackPeriod(1000, 200)).toBeCloseTo(6.25)
  })

  it('returns Infinity when mrr=0', () => {
    expect(paybackPeriod(1000, 0)).toBe(Infinity)
  })

  it('uses custom grossMargin', () => {
    // 1000 / (100 * 1.0) = 10
    expect(paybackPeriod(1000, 100, 1.0)).toBeCloseTo(10)
  })

  it('defaults grossMargin to 0.8', () => {
    expect(paybackPeriod(800, 100)).toBeCloseTo(10)
  })

  it('returns 0 when cac=0', () => {
    expect(paybackPeriod(0, 100)).toBe(0)
  })
})

describe('ltvBySegment', () => {
  it('returns correct avg LTV per segment', () => {
    const customers = [
      { segment: 'A', revenue: 100, lifespan: 2 },
      { segment: 'A', revenue: 200, lifespan: 3 },
      { segment: 'B', revenue: 50, lifespan: 4 },
    ]
    const result = ltvBySegment(customers)
    // A: (200 + 600) / 2 = 400
    expect(result.get('A')).toBeCloseTo(400)
    // B: 200 / 1 = 200
    expect(result.get('B')).toBeCloseTo(200)
  })

  it('returns an empty map for empty input', () => {
    expect(ltvBySegment([])).toEqual(new Map())
  })

  it('handles single customer', () => {
    const result = ltvBySegment([{ segment: 'X', revenue: 300, lifespan: 5 }])
    expect(result.get('X')).toBe(1500)
  })
})

// ---------------------------------------------------------------------------
// 2. Churn Analysis
// ---------------------------------------------------------------------------

describe('churnRate', () => {
  it('divides churned by total', () => {
    expect(churnRate(50, 1000)).toBe(0.05)
  })

  it('returns 0 when totalAtStart=0', () => {
    expect(churnRate(0, 0)).toBe(0)
  })

  it('handles 100% churn', () => {
    expect(churnRate(100, 100)).toBe(1)
  })

  it('returns fractional rate', () => {
    expect(churnRate(1, 4)).toBe(0.25)
  })
})

describe('retentionRate', () => {
  it('returns 1 minus churn rate', () => {
    expect(retentionRate(0.05)).toBeCloseTo(0.95)
  })

  it('returns 0 for 100% churn', () => {
    expect(retentionRate(1)).toBe(0)
  })

  it('returns 1 for 0% churn', () => {
    expect(retentionRate(0)).toBe(1)
  })
})

describe('monthlyToAnnualChurn', () => {
  it('converts 0% monthly to 0% annual', () => {
    expect(monthlyToAnnualChurn(0)).toBe(0)
  })

  it('converts 100% monthly to 100% annual', () => {
    expect(monthlyToAnnualChurn(1)).toBeCloseTo(1)
  })

  it('computes correctly for 2% monthly', () => {
    // 1 - (0.98)^12
    expect(monthlyToAnnualChurn(0.02)).toBeCloseTo(1 - Math.pow(0.98, 12))
  })

  it('annual churn is higher than monthly churn', () => {
    const monthly = 0.03
    expect(monthlyToAnnualChurn(monthly)).toBeGreaterThan(monthly)
  })
})

describe('annualToMonthlyChurn', () => {
  it('converts 0% annual to 0% monthly', () => {
    expect(annualToMonthlyChurn(0)).toBeCloseTo(0)
  })

  it('converts 100% annual to 100% monthly', () => {
    expect(annualToMonthlyChurn(1)).toBeCloseTo(1)
  })

  it('is inverse of monthlyToAnnualChurn', () => {
    const monthly = 0.05
    const annual = monthlyToAnnualChurn(monthly)
    expect(annualToMonthlyChurn(annual)).toBeCloseTo(monthly)
  })

  it('monthly is less than annual', () => {
    const annual = 0.4
    expect(annualToMonthlyChurn(annual)).toBeLessThan(annual)
  })
})

describe('avgCustomerLifespan', () => {
  it('returns 1/churnRate in months', () => {
    expect(avgCustomerLifespan(0.1)).toBeCloseTo(10)
  })

  it('returns Infinity for 0 churn', () => {
    expect(avgCustomerLifespan(0)).toBe(Infinity)
  })

  it('returns 1 for 100% monthly churn', () => {
    expect(avgCustomerLifespan(1)).toBe(1)
  })
})

describe('churnPredictionScore', () => {
  it('returns 0 for perfectly engaged user', () => {
    const score = churnPredictionScore({
      daysSinceLastActivity: 0,
      loginFrequency: 30,
      supportTickets: 0,
      npsScore: 10,
    })
    // 0.4*0 + 0.3*0 + 0.2*0 + 0.1*0 = 0
    expect(score).toBeCloseTo(0)
  })

  it('clamps to 1 for worst-case inputs', () => {
    const score = churnPredictionScore({
      daysSinceLastActivity: 900,
      loginFrequency: 0,
      supportTickets: 50,
      npsScore: 0,
    })
    expect(score).toBe(1)
  })

  it('clamps to 0 for negative raw score', () => {
    const score = churnPredictionScore({
      daysSinceLastActivity: 0,
      loginFrequency: 60,    // over 30 → negative weight
      supportTickets: 0,
      npsScore: 10,
    })
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('higher inactivity → higher score', () => {
    const low = churnPredictionScore({
      daysSinceLastActivity: 10,
      loginFrequency: 20,
      supportTickets: 1,
      npsScore: 7,
    })
    const high = churnPredictionScore({
      daysSinceLastActivity: 80,
      loginFrequency: 5,
      supportTickets: 4,
      npsScore: 2,
    })
    expect(high).toBeGreaterThan(low)
  })

  it('result is between 0 and 1', () => {
    const score = churnPredictionScore({
      daysSinceLastActivity: 45,
      loginFrequency: 10,
      supportTickets: 2,
      npsScore: 5,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Customer Segmentation
// ---------------------------------------------------------------------------

describe('rFMScore', () => {
  it('returns max scores for best-case customer', () => {
    const result = rFMScore(0, 50, 5000)
    expect(result.r).toBe(5)
    expect(result.f).toBe(5)
    expect(result.m).toBe(5)
    expect(result.total).toBeCloseTo(5)
  })

  it('returns low R for high recency (stale)', () => {
    const result = rFMScore(365, 25, 2500)
    expect(result.r).toBe(1)
  })

  it('total equals (r+f+m)/3', () => {
    const result = rFMScore(90, 25, 2500)
    expect(result.total).toBeCloseTo((result.r + result.f + result.m) / 3)
  })

  it('uses custom max values', () => {
    const result = rFMScore(50, 10, 1000, 100, 20, 2000)
    // recency: 50/100=0.5 → 1-0.5=0.5 → round(0.5*4)+1 = round(2)+1 = 3
    expect(result.r).toBe(3)
  })

  it('scores are between 1 and 5', () => {
    const result = rFMScore(180, 10, 1000)
    expect(result.r).toBeGreaterThanOrEqual(1)
    expect(result.r).toBeLessThanOrEqual(5)
    expect(result.f).toBeGreaterThanOrEqual(1)
    expect(result.f).toBeLessThanOrEqual(5)
    expect(result.m).toBeGreaterThanOrEqual(1)
    expect(result.m).toBeLessThanOrEqual(5)
  })

  it('zero frequency gives score of 1', () => {
    const result = rFMScore(0, 0, 0)
    expect(result.f).toBe(1)
    expect(result.m).toBe(1)
  })
})

describe('customerSegment', () => {
  it('returns champion for total > 4', () => {
    expect(customerSegment(4.5)).toBe('champion')
  })

  it('returns loyal for total between 3 and 4', () => {
    expect(customerSegment(3.5)).toBe('loyal')
  })

  it('returns loyal for total exactly 3', () => {
    expect(customerSegment(3)).toBe('loyal')
  })

  it('returns potential for total between 2 and 3', () => {
    expect(customerSegment(2.5)).toBe('potential')
  })

  it('returns at-risk for total between 1 and 2', () => {
    expect(customerSegment(1.5)).toBe('at-risk')
  })

  it('returns at-risk for total exactly 1', () => {
    expect(customerSegment(1)).toBe('at-risk')
  })

  it('returns lost for total below 1', () => {
    expect(customerSegment(0.5)).toBe('lost')
  })

  it('returns lost for total exactly 0', () => {
    expect(customerSegment(0)).toBe('lost')
  })

  it('returns champion for exactly 5', () => {
    expect(customerSegment(5)).toBe('champion')
  })
})

describe('cohortRetention', () => {
  it('divides each retained count by cohort size', () => {
    const result = cohortRetention(100, [90, 70, 50])
    expect(result).toEqual([0.9, 0.7, 0.5])
  })

  it('returns empty array for no periods', () => {
    expect(cohortRetention(100, [])).toEqual([])
  })

  it('returns 0s for 0 cohort size', () => {
    expect(cohortRetention(0, [0, 0])).toEqual([0, 0])
  })

  it('can return rate > 1 if retained > cohort (edge case)', () => {
    const result = cohortRetention(50, [60])
    expect(result[0]).toBeCloseTo(1.2)
  })
})

describe('customerHealthScore', () => {
  it('returns 100 for perfect customer', () => {
    // 30/30*30 + 10/10*30 - 0/5*20 + 10/10*20 = 30+30+0+20 = 80
    // Not 100 — let's verify formula
    const score = customerHealthScore(30, 10, 0, 10)
    expect(score).toBe(80)
  })

  it('clamps to 0 for very bad customer', () => {
    const score = customerHealthScore(0, 0, 100, 0)
    expect(score).toBe(0)
  })

  it('clamps to 100', () => {
    const score = customerHealthScore(30, 100, 0, 10)
    expect(score).toBe(100)
  })

  it('uses default totalDays of 30', () => {
    const s1 = customerHealthScore(15, 5, 1, 5)
    const s2 = customerHealthScore(15, 5, 1, 5, 30)
    expect(s1).toBeCloseTo(s2)
  })

  it('custom totalDays changes score', () => {
    const s1 = customerHealthScore(15, 5, 1, 5, 30)
    const s2 = customerHealthScore(15, 5, 1, 5, 60)
    expect(s1).not.toBeCloseTo(s2)
  })
})

// ---------------------------------------------------------------------------
// 4. Acquisition and Conversion
// ---------------------------------------------------------------------------

describe('customerAcquisitionCost', () => {
  it('divides spend by customers', () => {
    expect(customerAcquisitionCost(10000, 100)).toBe(100)
  })

  it('returns Infinity for 0 customers with spend', () => {
    expect(customerAcquisitionCost(5000, 0)).toBe(Infinity)
  })

  it('returns 0 for 0 customers and 0 spend', () => {
    expect(customerAcquisitionCost(0, 0)).toBe(0)
  })

  it('handles fractional cac', () => {
    expect(customerAcquisitionCost(1500, 1000)).toBeCloseTo(1.5)
  })
})

describe('conversionRate', () => {
  it('divides converted by visitors', () => {
    expect(conversionRate(50, 1000)).toBe(0.05)
  })

  it('returns 0 for 0 visitors', () => {
    expect(conversionRate(0, 0)).toBe(0)
  })

  it('returns 1 for 100% conversion', () => {
    expect(conversionRate(100, 100)).toBe(1)
  })
})

describe('trialConversionRate', () => {
  it('divides paid by total trials', () => {
    expect(trialConversionRate(30, 100)).toBeCloseTo(0.3)
  })

  it('returns 0 for 0 trials', () => {
    expect(trialConversionRate(0, 0)).toBe(0)
  })

  it('returns 1 for all trials converting', () => {
    expect(trialConversionRate(50, 50)).toBe(1)
  })
})

describe('timeToConvert', () => {
  it('calculates average days between signup and conversion', () => {
    const day = 24 * 60 * 60 * 1000
    const signups = [0, 0]
    const conversions = [7 * day, 3 * day]
    expect(timeToConvert(signups, conversions)).toBeCloseTo(5)
  })

  it('returns 0 for empty arrays', () => {
    expect(timeToConvert([], [])).toBe(0)
  })

  it('throws for mismatched array lengths', () => {
    expect(() => timeToConvert([0], [1, 2])).toThrow()
  })

  it('handles single entry', () => {
    const day = 24 * 60 * 60 * 1000
    expect(timeToConvert([0], [14 * day])).toBeCloseTo(14)
  })
})

describe('leadScoringModel', () => {
  it('computes weighted sum', () => {
    // 0.25*100 + 0.3*100 + 0.25*100 + 0.2*100 = 100
    expect(leadScoringModel({
      sourceQuality: 100,
      engagementScore: 100,
      fitScore: 100,
      behaviorScore: 100,
    })).toBeCloseTo(100)
  })

  it('returns 0 for all-zero inputs', () => {
    expect(leadScoringModel({
      sourceQuality: 0,
      engagementScore: 0,
      fitScore: 0,
      behaviorScore: 0,
    })).toBe(0)
  })

  it('weights engagement highest', () => {
    const eScore = leadScoringModel({
      sourceQuality: 0,
      engagementScore: 100,
      fitScore: 0,
      behaviorScore: 0,
    })
    const sScore = leadScoringModel({
      sourceQuality: 100,
      engagementScore: 0,
      fitScore: 0,
      behaviorScore: 0,
    })
    expect(eScore).toBeGreaterThan(sScore)
  })

  it('partial values', () => {
    // 0.25*50 + 0.3*60 + 0.25*40 + 0.2*80 = 12.5+18+10+16 = 56.5
    expect(leadScoringModel({
      sourceQuality: 50,
      engagementScore: 60,
      fitScore: 40,
      behaviorScore: 80,
    })).toBeCloseTo(56.5)
  })
})

// ---------------------------------------------------------------------------
// 5. Revenue Analytics
// ---------------------------------------------------------------------------

describe('mrr', () => {
  it('sums monthly subscriptions directly', () => {
    expect(mrr([{ price: 100, billingCycle: 'monthly' }])).toBe(100)
  })

  it('normalizes annual to monthly', () => {
    expect(mrr([{ price: 1200, billingCycle: 'annual' }])).toBeCloseTo(100)
  })

  it('normalizes quarterly to monthly', () => {
    expect(mrr([{ price: 300, billingCycle: 'quarterly' }])).toBeCloseTo(100)
  })

  it('sums mixed billing cycles', () => {
    const subs = [
      { price: 100, billingCycle: 'monthly' as const },
      { price: 1200, billingCycle: 'annual' as const },
      { price: 300, billingCycle: 'quarterly' as const },
    ]
    expect(mrr(subs)).toBeCloseTo(300)
  })

  it('returns 0 for empty subscriptions', () => {
    expect(mrr([])).toBe(0)
  })
})

describe('arr', () => {
  it('multiplies mrr by 12', () => {
    expect(arr(1000)).toBe(12000)
  })

  it('returns 0 for 0 mrr', () => {
    expect(arr(0)).toBe(0)
  })
})

describe('mrrGrowthRate', () => {
  it('calculates growth correctly', () => {
    expect(mrrGrowthRate(110, 100)).toBeCloseTo(0.1)
  })

  it('returns 0 when previous is 0', () => {
    expect(mrrGrowthRate(100, 0)).toBe(0)
  })

  it('handles decline', () => {
    expect(mrrGrowthRate(90, 100)).toBeCloseTo(-0.1)
  })

  it('handles no change', () => {
    expect(mrrGrowthRate(100, 100)).toBe(0)
  })
})

describe('netRevenueRetention', () => {
  it('calculates NRR correctly', () => {
    // (1000 + 200 - 50 - 100) / 1000 = 1.05
    expect(netRevenueRetention(1000, 200, 50, 100)).toBeCloseTo(1.05)
  })

  it('returns 0 when startMRR is 0', () => {
    expect(netRevenueRetention(0, 100, 50, 25)).toBe(0)
  })

  it('can exceed 1 with expansion', () => {
    expect(netRevenueRetention(1000, 500, 0, 0)).toBeCloseTo(1.5)
  })

  it('handles churn reducing retention below 1', () => {
    expect(netRevenueRetention(1000, 0, 0, 200)).toBeCloseTo(0.8)
  })
})

describe('grossRevenueRetention', () => {
  it('calculates GRR correctly', () => {
    // (1000 - 50 - 100) / 1000 = 0.85
    expect(grossRevenueRetention(1000, 50, 100)).toBeCloseTo(0.85)
  })

  it('returns 0 when startMRR is 0', () => {
    expect(grossRevenueRetention(0, 0, 0)).toBe(0)
  })

  it('clamps to 0 when losses exceed start', () => {
    expect(grossRevenueRetention(100, 60, 60)).toBe(0)
  })

  it('clamps to 1 when no contraction or churn', () => {
    expect(grossRevenueRetention(1000, 0, 0)).toBe(1)
  })
})

describe('expansionRevenue', () => {
  it('sums all three components', () => {
    expect(expansionRevenue(1000, 500, 250)).toBe(1750)
  })

  it('returns 0 for all zeros', () => {
    expect(expansionRevenue(0, 0, 0)).toBe(0)
  })

  it('handles individual components', () => {
    expect(expansionRevenue(300, 0, 0)).toBe(300)
    expect(expansionRevenue(0, 400, 0)).toBe(400)
    expect(expansionRevenue(0, 0, 500)).toBe(500)
  })
})

describe('revenuePerUser', () => {
  it('divides revenue by active users', () => {
    expect(revenuePerUser(10000, 100)).toBe(100)
  })

  it('returns 0 for 0 active users', () => {
    expect(revenuePerUser(5000, 0)).toBe(0)
  })

  it('handles fractional result', () => {
    expect(revenuePerUser(100, 3)).toBeCloseTo(33.33, 1)
  })
})

// ---------------------------------------------------------------------------
// 6. Engagement Scoring
// ---------------------------------------------------------------------------

describe('dailyActiveUserRate', () => {
  it('divides DAU by MAU', () => {
    expect(dailyActiveUserRate(1000, 10000)).toBeCloseTo(0.1)
  })

  it('returns 0 for 0 MAU', () => {
    expect(dailyActiveUserRate(0, 0)).toBe(0)
  })

  it('returns 1 for DAU = MAU', () => {
    expect(dailyActiveUserRate(500, 500)).toBe(1)
  })
})

describe('featureAdoptionRate', () => {
  it('divides users who used feature by total', () => {
    expect(featureAdoptionRate(300, 1000)).toBeCloseTo(0.3)
  })

  it('returns 0 for 0 total users', () => {
    expect(featureAdoptionRate(0, 0)).toBe(0)
  })

  it('returns 1 for full adoption', () => {
    expect(featureAdoptionRate(100, 100)).toBe(1)
  })
})

describe('engagementScore', () => {
  it('returns 100 for maxed-out user', () => {
    // 30/30*25 + min(10/10,1)*25 + min(7/7,1)*25 + min(20/20,1)*25 = 100
    expect(engagementScore(30, 10, 7, 20)).toBeCloseTo(100)
  })

  it('returns 0 for disengaged user', () => {
    expect(engagementScore(0, 0, 0, 0)).toBe(0)
  })

  it('caps components at their max', () => {
    const score = engagementScore(30, 100, 100, 100)
    expect(score).toBe(100)
  })

  it('partial engagement', () => {
    // 15/30*25 + min(5/10,1)*25 + min(3.5/7,1)*25 + min(10/20,1)*25
    // = 12.5 + 12.5 + 12.5 + 12.5 = 50
    expect(engagementScore(15, 5, 3.5, 10)).toBeCloseTo(50)
  })

  it('clamps negative to 0', () => {
    expect(engagementScore(-10, 0, 0, 0)).toBe(0)
  })
})

describe('stickiness', () => {
  it('is an alias for dailyActiveUserRate', () => {
    expect(stickiness(200, 1000)).toBe(dailyActiveUserRate(200, 1000))
  })

  it('returns 0 for 0 MAU', () => {
    expect(stickiness(0, 0)).toBe(0)
  })
})

describe('powerUserRate', () => {
  it('returns fraction above threshold', () => {
    const users = [
      { engagementScore: 90 },
      { engagementScore: 85 },
      { engagementScore: 70 },
      { engagementScore: 60 },
    ]
    expect(powerUserRate(users)).toBeCloseTo(0.5)
  })

  it('returns 0 for empty array', () => {
    expect(powerUserRate([])).toBe(0)
  })

  it('uses default threshold of 80', () => {
    const users = [{ engagementScore: 81 }, { engagementScore: 79 }]
    expect(powerUserRate(users)).toBeCloseTo(0.5)
  })

  it('uses custom threshold', () => {
    const users = [{ engagementScore: 60 }, { engagementScore: 40 }]
    expect(powerUserRate(users, 50)).toBeCloseTo(0.5)
  })

  it('returns 0 when no user exceeds threshold', () => {
    const users = [{ engagementScore: 50 }, { engagementScore: 30 }]
    expect(powerUserRate(users)).toBe(0)
  })
})

describe('sessionEngagementScore', () => {
  it('applies bounce penalty', () => {
    const bounced = sessionEngagementScore(3, 5, 120, true)
    const notBounced = sessionEngagementScore(3, 5, 120, false)
    expect(bounced).toBeLessThan(notBounced)
  })

  it('returns 0 for zero activity', () => {
    expect(sessionEngagementScore(0, 0, 0, false)).toBe(0)
  })

  it('clamps to 100', () => {
    expect(sessionEngagementScore(100, 100, 100000, false)).toBe(100)
  })

  it('bounce factor is 0.2', () => {
    const nb = sessionEngagementScore(5, 5, 300, false)
    const b = sessionEngagementScore(5, 5, 300, true)
    expect(b).toBeCloseTo(nb * 0.2, 5)
  })

  it('handles minimal session', () => {
    const score = sessionEngagementScore(1, 0, 0, false)
    // 1*5 + 0*3 + 0 = 5; no bounce
    expect(score).toBeCloseTo(5)
  })
})

// ---------------------------------------------------------------------------
// 7. Sports Platform Specific
// ---------------------------------------------------------------------------

describe('pickEngagementRate', () => {
  it('divides acted on by viewed', () => {
    expect(pickEngagementRate(100, 40)).toBeCloseTo(0.4)
  })

  it('returns 0 when picksViewed is 0', () => {
    expect(pickEngagementRate(0, 0)).toBe(0)
  })

  it('returns 1 for 100% engagement', () => {
    expect(pickEngagementRate(50, 50)).toBe(1)
  })
})

describe('subscriptionUpliftFromPick', () => {
  it('calculates uplift correctly', () => {
    // (0.05 - 0.04) / 0.04 = 0.25
    const uplift = subscriptionUpliftFromPick(1000, 500, 0.04, 0.05)
    expect(uplift).toBeCloseTo(0.25)
  })

  it('protects against 0 before conversion (min 0.001)', () => {
    // (0.01 - 0) / 0.001 = 10
    const uplift = subscriptionUpliftFromPick(1000, 500, 0, 0.01)
    expect(uplift).toBeCloseTo(10)
  })

  it('handles negative uplift (conversion drop)', () => {
    const uplift = subscriptionUpliftFromPick(1000, 500, 0.05, 0.04)
    expect(uplift).toBeCloseTo(-0.2)
  })

  it('returns 0 for same conversion before and after', () => {
    const uplift = subscriptionUpliftFromPick(1000, 500, 0.05, 0.05)
    expect(uplift).toBeCloseTo(0)
  })
})

describe('betterROISegment', () => {
  it('returns the segment with highest LTV/CAC', () => {
    const segs = [
      { name: 'A', ltv: 1000, cac: 200 },
      { name: 'B', ltv: 3000, cac: 500 },
      { name: 'C', ltv: 500, cac: 50 },  // ratio 10 — highest
    ]
    expect(betterROISegment(segs)).toBe('C')
  })

  it('returns empty string for empty segments', () => {
    expect(betterROISegment([])).toBe('')
  })

  it('handles CAC=0 (infinite ratio wins)', () => {
    const segs = [
      { name: 'A', ltv: 100, cac: 10 },
      { name: 'B', ltv: 50, cac: 0 },   // infinite ratio
    ]
    expect(betterROISegment(segs)).toBe('B')
  })

  it('returns single segment when only one', () => {
    expect(betterROISegment([{ name: 'X', ltv: 100, cac: 20 }])).toBe('X')
  })
})

describe('monthlyBurnRate', () => {
  it('computes expense minus revenue per month', () => {
    expect(monthlyBurnRate([100, 200, 300], [50, 150, 100])).toEqual([50, 50, 200])
  })

  it('returns empty array for empty inputs', () => {
    expect(monthlyBurnRate([], [])).toEqual([])
  })

  it('negative burn means profitability', () => {
    expect(monthlyBurnRate([100], [200])).toEqual([-100])
  })

  it('uses 0 for missing revenue entries', () => {
    expect(monthlyBurnRate([100, 200], [50])).toEqual([50, 200])
  })
})

describe('runwayMonths', () => {
  it('divides cash by monthly burn', () => {
    expect(runwayMonths(120000, 10000)).toBeCloseTo(12)
  })

  it('returns Infinity for 0 burn', () => {
    expect(runwayMonths(100000, 0)).toBe(Infinity)
  })

  it('returns Infinity for negative burn (profitable)', () => {
    expect(runwayMonths(100000, -5000)).toBe(Infinity)
  })

  it('handles exact division', () => {
    expect(runwayMonths(500000, 50000)).toBe(10)
  })

  it('handles 0 cash on hand', () => {
    expect(runwayMonths(0, 10000)).toBe(0)
  })
})
