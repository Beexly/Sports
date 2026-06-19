/**
 * Customer lifecycle analytics — pure TypeScript, zero npm dependencies.
 *
 * Covers: LTV, churn analysis, customer segmentation, acquisition/conversion,
 * revenue analytics, engagement scoring, and sports-platform specific metrics.
 */

// ---------------------------------------------------------------------------
// 1. Customer Lifetime Value
// ---------------------------------------------------------------------------

/**
 * Simple LTV: avgOrderValue × purchaseFrequency × customerLifespanYears
 */
export function simpleLTV(
  avgOrderValue: number,
  purchaseFrequency: number,
  customerLifespanYears: number,
): number {
  return avgOrderValue * purchaseFrequency * customerLifespanYears
}

/**
 * Discounted LTV: Net Present Value of a series of cash flows.
 * NPV = sum of cashFlows[i] / (1 + discountRate)^(i+1)
 */
export function discountedLTV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cf, i) => npv + cf / Math.pow(1 + discountRate, i + 1), 0)
}

/**
 * Predicted LTV: project historicalRevenue forward by `periods` using compound growth.
 * avgHistorical * (1 + growthRate)^t for t = 1..periods, summed.
 * Default growthRate = 0.
 */
export function predictedLTV(
  historicalRevenue: number[],
  periods: number,
  growthRate = 0,
): number {
  if (historicalRevenue.length === 0) return 0
  const avg = historicalRevenue.reduce((s, v) => s + v, 0) / historicalRevenue.length
  let total = 0
  for (let t = 1; t <= periods; t++) {
    total += avg * Math.pow(1 + growthRate, t)
  }
  return total
}

/**
 * LTV/CAC ratio. Infinity if CAC=0 and LTV>0. 0 if both 0.
 */
export function ltvCAcRatio(ltv: number, cac: number): number {
  if (cac === 0 && ltv > 0) return Infinity
  if (cac === 0) return 0
  return ltv / cac
}

/**
 * Payback period in months: CAC / (MRR × grossMargin).
 * Infinity if mrr=0. Default grossMargin=0.8.
 */
export function paybackPeriod(cac: number, mrr: number, grossMargin = 0.8): number {
  if (mrr === 0) return Infinity
  return cac / (mrr * grossMargin)
}

/**
 * Average LTV per segment. Each customer's LTV = revenue × lifespan.
 * Returns a Map<segmentName, avgLTV>.
 */
export function ltvBySegment(
  customers: Array<{ segment: string; revenue: number; lifespan: number }>,
): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>()
  for (const c of customers) {
    const ltv = c.revenue * c.lifespan
    const entry = sums.get(c.segment) ?? { total: 0, count: 0 }
    entry.total += ltv
    entry.count += 1
    sums.set(c.segment, entry)
  }
  const result = new Map<string, number>()
  for (const [seg, { total, count }] of sums) {
    result.set(seg, total / count)
  }
  return result
}

// ---------------------------------------------------------------------------
// 2. Churn Analysis
// ---------------------------------------------------------------------------

/**
 * Churn rate: churned / totalAtStart. Returns 0 if totalAtStart=0.
 */
export function churnRate(churned: number, totalAtStart: number): number {
  if (totalAtStart === 0) return 0
  return churned / totalAtStart
}

/**
 * Retention rate: 1 - churnRate.
 */
export function retentionRate(churnRate: number): number {
  return 1 - churnRate
}

/**
 * Monthly to annual churn: 1 - (1 - monthlyChurn)^12
 */
export function monthlyToAnnualChurn(monthlyChurn: number): number {
  return 1 - Math.pow(1 - monthlyChurn, 12)
}

/**
 * Annual to monthly churn: 1 - (1 - annualChurn)^(1/12)
 */
export function annualToMonthlyChurn(annualChurn: number): number {
  return 1 - Math.pow(1 - annualChurn, 1 / 12)
}

/**
 * Average customer lifespan in months: 1 / monthlyChurnRate.
 * Returns Infinity if monthlyChurnRate=0.
 */
export function avgCustomerLifespan(monthlyChurnRate: number): number {
  if (monthlyChurnRate === 0) return Infinity
  return 1 / monthlyChurnRate
}

/**
 * Churn prediction score (0–1 risk, clamped).
 * weights: 0.4*(daysSince/90) + 0.3*(1 - loginFreq/30) + 0.2*(tickets/5) + 0.1*((10 - nps)/10)
 */
export function churnPredictionScore(features: {
  daysSinceLastActivity: number
  loginFrequency: number
  supportTickets: number
  npsScore: number
}): number {
  const { daysSinceLastActivity, loginFrequency, supportTickets, npsScore } = features
  const raw =
    0.4 * (daysSinceLastActivity / 90) +
    0.3 * (1 - loginFrequency / 30) +
    0.2 * (supportTickets / 5) +
    0.1 * ((10 - npsScore) / 10)
  return Math.max(0, Math.min(1, raw))
}

// ---------------------------------------------------------------------------
// 3. Customer Segmentation
// ---------------------------------------------------------------------------

export interface RFMScore {
  r: number
  f: number
  m: number
  total: number
}

/**
 * RFM Score. R: lower recency = higher score (inverted scale).
 * F and M: higher = higher score. Each dimension 1–5.
 * total = (r + f + m) / 3.
 */
export function rFMScore(
  recencyDays: number,
  frequencyOrders: number,
  monetaryValue: number,
  maxRecency = 365,
  maxFrequency = 50,
  maxMonetary = 5000,
): RFMScore {
  // Recency: invert — lower days = higher score
  const rRaw = 1 - Math.min(recencyDays / maxRecency, 1)
  const r = Math.round(rRaw * 4) + 1   // 1–5

  const fRaw = Math.min(frequencyOrders / maxFrequency, 1)
  const f = Math.round(fRaw * 4) + 1   // 1–5

  const mRaw = Math.min(monetaryValue / maxMonetary, 1)
  const m = Math.round(mRaw * 4) + 1   // 1–5

  const total = (r + f + m) / 3
  return { r, f, m, total }
}

/**
 * Customer segment from RFM total:
 * >4: champion; 3–4: loyal; 2–3: potential; 1–2: at-risk; else: lost
 */
export function customerSegment(
  rfmTotal: number,
): 'champion' | 'loyal' | 'potential' | 'at-risk' | 'lost' {
  if (rfmTotal > 4) return 'champion'
  if (rfmTotal >= 3) return 'loyal'
  if (rfmTotal >= 2) return 'potential'
  if (rfmTotal >= 1) return 'at-risk'
  return 'lost'
}

/**
 * Cohort retention rates: retainedByPeriod[i] / cohortSize per period.
 */
export function cohortRetention(
  cohortSize: number,
  retainedByPeriod: number[],
): number[] {
  return retainedByPeriod.map((r) => (cohortSize === 0 ? 0 : r / cohortSize))
}

/**
 * Customer health score (0–100, clamped).
 * loginDays/totalDays*30 + featureUsage/10*30 - supportTickets/5*20 + nps/10*20
 * default totalDays=30
 */
export function customerHealthScore(
  loginDays: number,
  featureUsage: number,
  supportTickets: number,
  nps: number,
  totalDays = 30,
): number {
  const raw =
    (loginDays / totalDays) * 30 +
    (featureUsage / 10) * 30 -
    (supportTickets / 5) * 20 +
    (nps / 10) * 20
  return Math.max(0, Math.min(100, raw))
}

// ---------------------------------------------------------------------------
// 4. Acquisition and Conversion
// ---------------------------------------------------------------------------

/**
 * Customer Acquisition Cost: marketingSpend / newCustomers.
 * Infinity if newCustomers=0 and spend>0.
 */
export function customerAcquisitionCost(
  marketingSpend: number,
  newCustomers: number,
): number {
  if (newCustomers === 0 && marketingSpend > 0) return Infinity
  if (newCustomers === 0) return 0
  return marketingSpend / newCustomers
}

/**
 * Conversion rate: converted / visitors.
 */
export function conversionRate(converted: number, visitors: number): number {
  if (visitors === 0) return 0
  return converted / visitors
}

/**
 * Trial-to-paid conversion rate: trialToPaid / totalTrials.
 */
export function trialConversionRate(trialToPaid: number, totalTrials: number): number {
  if (totalTrials === 0) return 0
  return trialToPaid / totalTrials
}

/**
 * Average time to convert in days (paired by index).
 * Throws if arrays have different lengths.
 */
export function timeToConvert(
  signupTimestamps: number[],
  conversionTimestamps: number[],
): number {
  if (signupTimestamps.length !== conversionTimestamps.length) {
    throw new Error('signupTimestamps and conversionTimestamps must have the same length')
  }
  if (signupTimestamps.length === 0) return 0
  const totalDays = signupTimestamps.reduce((sum, signup, i) => {
    const conversion = conversionTimestamps[i] ?? 0
    const diffMs = conversion - signup
    return sum + diffMs / (1000 * 60 * 60 * 24)
  }, 0)
  return totalDays / signupTimestamps.length
}

/**
 * Lead scoring model: 0.25*source + 0.3*engagement + 0.25*fit + 0.2*behavior (all 0–100).
 * Returns 0–100.
 */
export function leadScoringModel(lead: {
  sourceQuality: number
  engagementScore: number
  fitScore: number
  behaviorScore: number
}): number {
  return (
    0.25 * lead.sourceQuality +
    0.3 * lead.engagementScore +
    0.25 * lead.fitScore +
    0.2 * lead.behaviorScore
  )
}

// ---------------------------------------------------------------------------
// 5. Revenue Analytics
// ---------------------------------------------------------------------------

export interface Subscription {
  price: number
  billingCycle: 'monthly' | 'annual' | 'quarterly'
}

/**
 * Monthly Recurring Revenue: normalizes all subscriptions to monthly.
 * annual/12, quarterly/3, monthly as-is.
 */
export function mrr(subscriptions: Subscription[]): number {
  return subscriptions.reduce((total, sub) => {
    if (sub.billingCycle === 'annual') return total + sub.price / 12
    if (sub.billingCycle === 'quarterly') return total + sub.price / 3
    return total + sub.price
  }, 0)
}

/**
 * Annual Recurring Revenue: mrr * 12.
 */
export function arr(mrrValue: number): number {
  return mrrValue * 12
}

/**
 * MRR growth rate: (current - previous) / previous. Returns 0 if previous=0.
 */
export function mrrGrowthRate(currentMRR: number, previousMRR: number): number {
  if (previousMRR === 0) return 0
  return (currentMRR - previousMRR) / previousMRR
}

/**
 * Net Revenue Retention: (startMRR + expansion - contraction - churned) / startMRR.
 * Returns 0 if startMRR=0.
 */
export function netRevenueRetention(
  startMRR: number,
  expansionMRR: number,
  contractionMRR: number,
  churnedMRR: number,
): number {
  if (startMRR === 0) return 0
  return (startMRR + expansionMRR - contractionMRR - churnedMRR) / startMRR
}

/**
 * Gross Revenue Retention: (startMRR - contraction - churned) / startMRR; clamped 0–1.
 * Returns 0 if startMRR=0.
 */
export function grossRevenueRetention(
  startMRR: number,
  contractionMRR: number,
  churnedMRR: number,
): number {
  if (startMRR === 0) return 0
  const raw = (startMRR - contractionMRR - churnedMRR) / startMRR
  return Math.max(0, Math.min(1, raw))
}

/**
 * Expansion revenue: upsells + crossSells + priceIncreases.
 */
export function expansionRevenue(
  upsells: number,
  crossSells: number,
  priceIncreases: number,
): number {
  return upsells + crossSells + priceIncreases
}

/**
 * Revenue per user: totalRevenue / activeUsers.
 */
export function revenuePerUser(totalRevenue: number, activeUsers: number): number {
  if (activeUsers === 0) return 0
  return totalRevenue / activeUsers
}

// ---------------------------------------------------------------------------
// 6. Engagement Scoring
// ---------------------------------------------------------------------------

/**
 * Daily Active User rate: DAU / MAU. Returns 0 if MAU=0.
 */
export function dailyActiveUserRate(dau: number, mau: number): number {
  if (mau === 0) return 0
  return dau / mau
}

/**
 * Feature adoption rate: usersWhoUsedFeature / totalUsers. Returns 0 if totalUsers=0.
 */
export function featureAdoptionRate(
  usersWhoUsedFeature: number,
  totalUsers: number,
): number {
  if (totalUsers === 0) return 0
  return usersWhoUsedFeature / totalUsers
}

/**
 * Engagement score (0–100, clamped):
 * (loginDays/30)*25 + min(actionsPerSession/10,1)*25 + min(sessionsPerWeek/7,1)*25 + min(contentViewed/20,1)*25
 */
export function engagementScore(
  loginDays: number,
  actionsPerSession: number,
  sessionsPerWeek: number,
  contentViewed: number,
): number {
  const raw =
    (loginDays / 30) * 25 +
    Math.min(actionsPerSession / 10, 1) * 25 +
    Math.min(sessionsPerWeek / 7, 1) * 25 +
    Math.min(contentViewed / 20, 1) * 25
  return Math.max(0, Math.min(100, raw))
}

/**
 * Stickiness: alias for dailyActiveUserRate (DAU/MAU).
 */
export function stickiness(dau: number, mau: number): number {
  return dailyActiveUserRate(dau, mau)
}

/**
 * Power user rate: fraction of users with engagementScore above threshold.
 * Default threshold=80.
 */
export function powerUserRate(
  users: Array<{ engagementScore: number }>,
  threshold = 80,
): number {
  if (users.length === 0) return 0
  return users.filter((u) => u.engagementScore > threshold).length / users.length
}

/**
 * Session engagement score (0–100, clamped):
 * (pages*5 + actions*3 + duration/60) * (bounced ? 0.2 : 1)
 */
export function sessionEngagementScore(
  pages: number,
  actions: number,
  duration: number,
  bounced: boolean,
): number {
  const raw = (pages * 5 + actions * 3 + duration / 60) * (bounced ? 0.2 : 1)
  return Math.max(0, Math.min(100, raw))
}

// ---------------------------------------------------------------------------
// 7. Sports Platform Specific
// ---------------------------------------------------------------------------

/**
 * Pick engagement rate: picksActedOn / picksViewed. Returns 0 if picksViewed=0.
 */
export function pickEngagementRate(picksViewed: number, picksActedOn: number): number {
  if (picksViewed === 0) return 0
  return picksActedOn / picksViewed
}

/**
 * Subscription uplift from pick:
 * uplift = (conversionAfterPick - conversionBeforePick) / max(0.001, conversionBeforePick)
 */
export function subscriptionUpliftFromPick(
  _freeUsers: number,
  _usersWhoSawPick: number,
  conversionBeforePick: number,
  conversionAfterPick: number,
): number {
  const denom = Math.max(0.001, conversionBeforePick)
  return (conversionAfterPick - conversionBeforePick) / denom
}

/**
 * Better ROI segment: name of segment with highest LTV/CAC ratio.
 * Returns empty string if no segments.
 */
export function betterROISegment(
  segments: Array<{ name: string; ltv: number; cac: number }>,
): string {
  if (segments.length === 0) return ''
  const first = segments[0]
  if (!first) return ''
  let bestName = first.name
  let bestRatio = first.cac === 0 ? (first.ltv > 0 ? Infinity : 0) : first.ltv / first.cac
  for (const seg of segments.slice(1)) {
    const ratio = seg.cac === 0 ? (seg.ltv > 0 ? Infinity : 0) : seg.ltv / seg.cac
    if (ratio > bestRatio) {
      bestName = seg.name
      bestRatio = ratio
    }
  }
  return bestName
}

/**
 * Monthly burn rate per month: expenses[i] - revenue[i]. Positive = burning cash.
 */
export function monthlyBurnRate(expenses: number[], revenue: number[]): number[] {
  return expenses.map((exp, i) => exp - (revenue[i] ?? 0))
}

/**
 * Runway in months: cashOnHand / avgMonthlyBurn. Infinity if avgMonthlyBurn<=0.
 */
export function runwayMonths(cashOnHand: number, avgMonthlyBurn: number): number {
  if (avgMonthlyBurn <= 0) return Infinity
  return cashOnHand / avgMonthlyBurn
}
