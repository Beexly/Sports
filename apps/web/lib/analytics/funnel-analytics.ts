/**
 * Funnel and attribution analytics — pure TypeScript, zero npm dependencies.
 *
 * Provides funnel analysis, multi-touch attribution models, session analytics,
 * retention cohorts, LTV projection, engagement/conversion scoring,
 * AARRR metrics, and channel analytics for sports analytics platforms.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FunnelStep {
  name: string
  users: number
}

export interface FunnelResult {
  steps: Array<{
    name: string
    users: number
    conversionFromPrev: number   // rate from previous step (0-1)
    conversionFromTop: number    // rate from step 1 (0-1)
    dropOff: number              // users lost at this step
    dropOffRate: number          // fraction lost (0-1)
  }>
  overallConversion: number      // step1 to last step
  biggestDropOffStep: string     // step name with highest dropOffRate
}

export type TouchPoint = {
  source: string
  timestamp: number  // ms epoch
  value?: number     // optional attributed revenue
}

export interface AttributionResult {
  source: string
  credits: number    // total attribution credit (0-total)
  revenue: number    // attributed revenue
  touchCount: number
}

export interface UserSession {
  userId: string
  sessionStart: number  // ms epoch
  sessionEnd: number
  pageViews: number
  events: string[]
}

export interface RetentionMatrix {
  cohortSize: number
  retained: number[]  // retained[i] = users retained at period i (0-indexed)
  rates: number[]     // retained[i] / cohortSize
}

export interface ChannelMetrics {
  channel: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Aggregate touch points by source and sum up revenue for attribution.
 * Returns a map of source → { touchCount, totalValue }
 */
function groupTouches(touchPoints: TouchPoint[]): Map<string, { touchCount: number; totalValue: number }> {
  const map = new Map<string, { touchCount: number; totalValue: number }>()
  for (const tp of touchPoints) {
    const existing = map.get(tp.source) ?? { touchCount: 0, totalValue: 0 }
    map.set(tp.source, {
      touchCount: existing.touchCount + 1,
      totalValue: existing.totalValue + (tp.value ?? 0),
    })
  }
  return map
}

/**
 * Build AttributionResult[] from a credit map and touch point grouping.
 */
function buildAttributionResults(
  creditMap: Map<string, number>,
  touchGroups: Map<string, { touchCount: number; totalValue: number }>
): AttributionResult[] {
  const results: AttributionResult[] = []
  for (const [source, credits] of creditMap.entries()) {
    const group = touchGroups.get(source) ?? { touchCount: 0, totalValue: 0 }
    results.push({
      source,
      credits,
      revenue: group.totalValue,
      touchCount: group.touchCount,
    })
  }
  return results
}

// ---------------------------------------------------------------------------
// Funnel analysis
// ---------------------------------------------------------------------------

/**
 * Build a full funnel result from named steps with user counts.
 */
export function buildFunnel(steps: FunnelStep[]): FunnelResult {
  if (steps.length === 0) {
    return { steps: [], overallConversion: 0, biggestDropOffStep: '' }
  }

  const topUsers = steps[0]?.users ?? 0
  const resultSteps = steps.map((step, i) => {
    const prevUsers = i === 0 ? step.users : (steps[i - 1]?.users ?? 0)
    const conversionFromPrev = prevUsers === 0 ? 0 : step.users / prevUsers
    const conversionFromTop = topUsers === 0 ? 0 : step.users / topUsers
    const dropOff = Math.max(0, prevUsers - step.users)
    const dropOffRate = prevUsers === 0 ? 0 : dropOff / prevUsers

    return {
      name: step.name,
      users: step.users,
      conversionFromPrev,
      conversionFromTop,
      dropOff,
      dropOffRate,
    }
  })

  const lastUsers = steps[steps.length - 1]?.users ?? 0
  const overallConversion = topUsers === 0 ? 0 : lastUsers / topUsers

  // Find step with highest dropOffRate (skip step 0 since it has no previous)
  let biggestDropOffStep = resultSteps[0]?.name ?? ''
  let maxDropOffRate = -1
  for (const s of resultSteps) {
    if (s.dropOffRate > maxDropOffRate) {
      maxDropOffRate = s.dropOffRate
      biggestDropOffStep = s.name
    }
  }

  return { steps: resultSteps, overallConversion, biggestDropOffStep }
}

/**
 * Build a funnel from a total user count and per-step conversion rates.
 * stepRates[i] is the fraction of users who pass step i (relative to step i-1).
 */
export function microFunnel(total: number, stepRates: number[]): FunnelResult {
  const steps: FunnelStep[] = [{ name: 'Step 1', users: total }]
  let current = total
  for (let i = 0; i < stepRates.length; i++) {
    current = Math.round(current * (stepRates[i] ?? 0))
    steps.push({ name: `Step ${i + 2}`, users: current })
  }
  return buildFunnel(steps)
}

/**
 * Compare two funnels step by step. Returns per-step deltas.
 */
export function funnelCompare(
  funnelA: FunnelStep[],
  funnelB: FunnelStep[]
): Array<{ step: string; rateA: number; rateB: number; delta: number; improved: boolean }> {
  const fA = buildFunnel(funnelA)
  const fB = buildFunnel(funnelB)
  const len = Math.min(fA.steps.length, fB.steps.length)

  const result: Array<{ step: string; rateA: number; rateB: number; delta: number; improved: boolean }> = []
  for (let i = 0; i < len; i++) {
    const rateA = fA.steps[i]?.conversionFromTop ?? 0
    const rateB = fB.steps[i]?.conversionFromTop ?? 0
    const delta = rateB - rateA
    result.push({
      step: fA.steps[i]?.name ?? '',
      rateA,
      rateB,
      delta,
      improved: delta > 0,
    })
  }
  return result
}

// ---------------------------------------------------------------------------
// Attribution models
// ---------------------------------------------------------------------------

/**
 * Last-touch attribution: 100% credit to the last touch point.
 */
export function lastTouchAttribution(touchPoints: TouchPoint[]): AttributionResult[] {
  if (touchPoints.length === 0) return []

  const groups = groupTouches(touchPoints)
  const sorted = [...touchPoints].sort((a, b) => b.timestamp - a.timestamp)
  const lastSource = sorted[0]?.source ?? ''

  const creditMap = new Map<string, number>()
  for (const source of groups.keys()) {
    creditMap.set(source, source === lastSource ? 1 : 0)
  }

  return buildAttributionResults(creditMap, groups)
}

/**
 * First-touch attribution: 100% credit to the first touch point.
 */
export function firstTouchAttribution(touchPoints: TouchPoint[]): AttributionResult[] {
  if (touchPoints.length === 0) return []

  const groups = groupTouches(touchPoints)
  const sorted = [...touchPoints].sort((a, b) => a.timestamp - b.timestamp)
  const firstSource = sorted[0]?.source ?? ''

  const creditMap = new Map<string, number>()
  for (const source of groups.keys()) {
    creditMap.set(source, source === firstSource ? 1 : 0)
  }

  return buildAttributionResults(creditMap, groups)
}

/**
 * Linear attribution: equal credit distributed to all unique sources.
 */
export function linearAttribution(touchPoints: TouchPoint[]): AttributionResult[] {
  if (touchPoints.length === 0) return []

  const groups = groupTouches(touchPoints)
  const uniqueSources = groups.size
  const creditPerSource = uniqueSources === 0 ? 0 : 1 / uniqueSources

  const creditMap = new Map<string, number>()
  for (const source of groups.keys()) {
    creditMap.set(source, creditPerSource)
  }

  return buildAttributionResults(creditMap, groups)
}

/**
 * Time-decay attribution: most recent touch gets the most credit.
 * Credit decays exponentially with half-life halfLifeMs (default 7 days).
 */
export function timeDecayAttribution(
  touchPoints: TouchPoint[],
  halfLifeMs: number = 7 * 24 * 60 * 60 * 1000
): AttributionResult[] {
  if (touchPoints.length === 0) return []

  const groups = groupTouches(touchPoints)
  const maxTimestamp = Math.max(...touchPoints.map(tp => tp.timestamp))

  // Compute raw weights per touch
  const rawWeightsBySource = new Map<string, number>()
  for (const tp of touchPoints) {
    const age = maxTimestamp - tp.timestamp
    const weight = Math.pow(2, -age / halfLifeMs)
    rawWeightsBySource.set(tp.source, (rawWeightsBySource.get(tp.source) ?? 0) + weight)
  }

  const totalWeight = Array.from(rawWeightsBySource.values()).reduce((a, b) => a + b, 0)

  const creditMap = new Map<string, number>()
  for (const [source, weight] of rawWeightsBySource.entries()) {
    creditMap.set(source, totalWeight === 0 ? 0 : weight / totalWeight)
  }

  return buildAttributionResults(creditMap, groups)
}

/**
 * Position-based (U-shaped) attribution.
 * Default: 40% first touch, 40% last touch, 20% split among middle touches.
 */
export function positionBasedAttribution(
  touchPoints: TouchPoint[],
  firstWeight: number = 0.4,
  lastWeight: number = 0.4
): AttributionResult[] {
  if (touchPoints.length === 0) return []

  const groups = groupTouches(touchPoints)
  const sorted = [...touchPoints].sort((a, b) => a.timestamp - b.timestamp)
  const creditMap = new Map<string, number>()

  // Initialize all sources to 0
  for (const source of groups.keys()) {
    creditMap.set(source, 0)
  }

  if (sorted.length === 1) {
    creditMap.set(sorted[0]!.source, 1)
    return buildAttributionResults(creditMap, groups)
  }

  if (sorted.length === 2) {
    // First and last are the same two points
    const firstSrc = sorted[0]!.source
    const lastSrc = sorted[sorted.length - 1]!.source
    if (firstSrc === lastSrc) {
      creditMap.set(firstSrc, 1)
    } else {
      creditMap.set(firstSrc, (creditMap.get(firstSrc) ?? 0) + firstWeight)
      creditMap.set(lastSrc, (creditMap.get(lastSrc) ?? 0) + lastWeight)
      // Remaining middle weight (1 - firstWeight - lastWeight) split among no middle touches
      const remaining = 1 - firstWeight - lastWeight
      if (remaining > 0) {
        // No middle touches, distribute remaining equally between first and last
        creditMap.set(firstSrc, (creditMap.get(firstSrc) ?? 0) + remaining / 2)
        creditMap.set(lastSrc, (creditMap.get(lastSrc) ?? 0) + remaining / 2)
      }
    }
    return buildAttributionResults(creditMap, groups)
  }

  // 3+ touch points
  const firstSrc = sorted[0]!.source
  const lastSrc = sorted[sorted.length - 1]!.source
  const middleTouches = sorted.slice(1, sorted.length - 1)
  const middleWeight = 1 - firstWeight - lastWeight
  const middlePerTouch = middleTouches.length > 0 ? middleWeight / middleTouches.length : 0

  creditMap.set(firstSrc, (creditMap.get(firstSrc) ?? 0) + firstWeight)
  creditMap.set(lastSrc, (creditMap.get(lastSrc) ?? 0) + lastWeight)
  for (const tp of middleTouches) {
    creditMap.set(tp.source, (creditMap.get(tp.source) ?? 0) + middlePerTouch)
  }

  return buildAttributionResults(creditMap, groups)
}

/**
 * Data-driven attribution (simplified): weight by touch frequency.
 * Sources with more touches get proportionally more credit.
 */
export function dataDrivernAttribution(
  touchPoints: TouchPoint[],
  conversionValue: number
): AttributionResult[] {
  if (touchPoints.length === 0) return []

  const groups = groupTouches(touchPoints)
  const totalTouches = touchPoints.length

  const creditMap = new Map<string, number>()
  for (const [source, { touchCount }] of groups.entries()) {
    creditMap.set(source, totalTouches === 0 ? 0 : touchCount / totalTouches)
  }

  // Build results but override revenue with conversionValue-based attribution
  const baseResults = buildAttributionResults(creditMap, groups)
  return baseResults.map(r => ({
    ...r,
    revenue: r.credits * conversionValue,
  }))
}

// ---------------------------------------------------------------------------
// Session analytics
// ---------------------------------------------------------------------------

/**
 * Session duration in milliseconds.
 */
export function sessionDuration(session: UserSession): number {
  return session.sessionEnd - session.sessionStart
}

/**
 * Average session duration in milliseconds across all sessions.
 */
export function avgSessionDuration(sessions: UserSession[]): number {
  if (sessions.length === 0) return 0
  const total = sessions.reduce((sum, s) => sum + sessionDuration(s), 0)
  return total / sessions.length
}

/**
 * Bounce rate: fraction of sessions with pageViews <= 1.
 */
export function bounceRate(sessions: UserSession[]): number {
  if (sessions.length === 0) return 0
  const bounced = sessions.filter(s => s.pageViews <= 1).length
  return bounced / sessions.length
}

/**
 * Average pages viewed per session.
 */
export function pagesPerSession(sessions: UserSession[]): number {
  if (sessions.length === 0) return 0
  const total = sessions.reduce((sum, s) => sum + s.pageViews, 0)
  return total / sessions.length
}

/**
 * Average occurrences of a specific event name per session.
 */
export function eventFrequency(sessions: UserSession[], eventName: string): number {
  if (sessions.length === 0) return 0
  const total = sessions.reduce(
    (sum, s) => sum + s.events.filter(e => e === eventName).length,
    0
  )
  return total / sessions.length
}

/**
 * Group session counts by a source key function.
 */
export function sessionsBySource(
  sessions: UserSession[],
  source: (s: UserSession) => string
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const session of sessions) {
    const key = source(session)
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}

// ---------------------------------------------------------------------------
// Retention & churn
// ---------------------------------------------------------------------------

/**
 * Build a retention matrix assuming a fixed churn rate per period.
 */
export function buildRetentionCohort(
  cohortSize: number,
  periods: number,
  churnRatePerPeriod: number
): RetentionMatrix {
  const retained: number[] = []
  const rates: number[] = []

  for (let i = 0; i < periods; i++) {
    const surviving = Math.round(cohortSize * Math.pow(1 - churnRatePerPeriod, i))
    retained.push(surviving)
    rates.push(cohortSize === 0 ? 0 : surviving / cohortSize)
  }

  return { cohortSize, retained, rates }
}

/**
 * Get retention rate at a specific period (0-indexed). Returns 0 if out of range.
 */
export function retentionAtPeriod(matrix: RetentionMatrix, period: number): number {
  if (period < 0 || period >= matrix.rates.length) return 0
  return matrix.rates[period] ?? 0
}

/**
 * Average retention rate up to a given period (inclusive, 0-indexed).
 * If upToPeriod is omitted, averages all periods.
 */
export function avgRetention(matrix: RetentionMatrix, upToPeriod?: number): number {
  const end = upToPeriod !== undefined ? Math.min(upToPeriod + 1, matrix.rates.length) : matrix.rates.length
  if (end === 0) return 0
  const slice = matrix.rates.slice(0, end)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

/**
 * Extract retention rates at 30, 60, and 90 period marks (0-indexed).
 * Returns last known rate if the period exceeds the array length.
 */
export function naturalRetentionCurve(
  retentionRates: number[]
): { l30: number; l60: number; l90: number } {
  const getRate = (period: number): number => {
    if (retentionRates.length === 0) return 0
    if (period >= retentionRates.length) return retentionRates[retentionRates.length - 1] ?? 0
    return retentionRates[period] ?? 0
  }

  return {
    l30: getRate(30),
    l60: getRate(60),
    l90: getRate(90),
  }
}

// ---------------------------------------------------------------------------
// LTV projection
// ---------------------------------------------------------------------------

/**
 * Calculate lifetime value.
 * If periods is finite: arpu * (1 - (1-churnRate)^periods) / churnRate
 * If periods is Infinity (default): arpu / churnRate
 */
export function ltv(
  arpu: number,
  churnRate: number,
  periods: number = Infinity
): number {
  if (churnRate <= 0) return Infinity
  if (!isFinite(periods)) {
    return arpu / churnRate
  }
  return (arpu * (1 - Math.pow(1 - churnRate, periods))) / churnRate
}

/**
 * Cumulative LTV at each period 1..periods.
 */
export function cumulativeLtv(arpu: number, churnRate: number, periods: number): number[] {
  const result: number[] = []
  for (let p = 1; p <= periods; p++) {
    result.push(ltv(arpu, churnRate, p))
  }
  return result
}

/**
 * Period at which cumulative LTV >= CAC. Returns Infinity if never.
 */
export function paybackPeriod(cac: number, arpu: number, churnRate: number): number {
  if (arpu <= 0) return Infinity
  if (churnRate <= 0) {
    // With zero churn, payback = cac / arpu periods (ceiling)
    return Math.ceil(cac / arpu)
  }

  // Search iteratively up to a reasonable cap
  const maxPeriods = 10000
  for (let p = 1; p <= maxPeriods; p++) {
    if (ltv(arpu, churnRate, p) >= cac) return p
  }
  return Infinity
}

/**
 * LTV to CAC ratio.
 */
export function ltvToCacRatio(ltvValue: number, cac: number): number {
  if (cac === 0) return Infinity
  return ltvValue / cac
}

// ---------------------------------------------------------------------------
// Conversion & engagement scoring
// ---------------------------------------------------------------------------

/**
 * Engagement score 0-100 based on weighted normalized inputs.
 * Defaults: sessions*0.25 + duration*0.25 + pageViews*0.25 + events*0.25
 * Normalize: sessions/10, duration/300000, pageViews/20, events/30
 */
export function engagementScore(
  sessions: number,
  avgSessionDurationMs: number,
  pageViews: number,
  events: number,
  weights?: {
    sessions?: number
    duration?: number
    pageViews?: number
    events?: number
  }
): number {
  const w = {
    sessions: weights?.sessions ?? 0.25,
    duration: weights?.duration ?? 0.25,
    pageViews: weights?.pageViews ?? 0.25,
    events: weights?.events ?? 0.25,
  }

  const normalizedSessions = Math.min(sessions / 10, 1)
  const normalizedDuration = Math.min(avgSessionDurationMs / 300000, 1)
  const normalizedPageViews = Math.min(pageViews / 20, 1)
  const normalizedEvents = Math.min(events / 30, 1)

  const score =
    normalizedSessions * w.sessions * 100 +
    normalizedDuration * w.duration * 100 +
    normalizedPageViews * w.pageViews * 100 +
    normalizedEvents * w.events * 100

  return Math.min(100, Math.max(0, score))
}

/**
 * Conversion likelihood score 0-100 using weighted heuristics.
 * daysActive*0.2 + adoption*0.3 + engagement*0.3 + pricing*0.2
 * Normalize: daysActive/30, adoption/5, score/100, pricingViews/3
 */
export function conversionLikelihoodScore(
  daysActive: number,
  featureAdoptionCount: number,
  avgEngagementScoreVal: number,
  pricingPageViews: number
): number {
  const normDays = Math.min(daysActive / 30, 1)
  const normAdoption = Math.min(featureAdoptionCount / 5, 1)
  const normEngagement = Math.min(avgEngagementScoreVal / 100, 1)
  const normPricing = Math.min(pricingPageViews / 3, 1)

  const score =
    normDays * 0.2 * 100 +
    normAdoption * 0.3 * 100 +
    normEngagement * 0.3 * 100 +
    normPricing * 0.2 * 100

  return Math.min(100, Math.max(0, score))
}

/**
 * Churn risk score 0-100. Higher = more likely to churn.
 */
export function churnRiskScore(
  daysSinceLastActive: number,
  decliningEngagement: boolean,
  supportTickets: number,
  billingIssues: number
): number {
  // Normalize components
  const activityRisk = Math.min(daysSinceLastActive / 30, 1) * 40  // max 40 pts
  const engagementRisk = decliningEngagement ? 25 : 0               // 25 pts
  const supportRisk = Math.min(supportTickets / 5, 1) * 20          // max 20 pts
  const billingRisk = Math.min(billingIssues / 3, 1) * 15           // max 15 pts

  const score = activityRisk + engagementRisk + supportRisk + billingRisk
  return Math.min(100, Math.max(0, score))
}

// ---------------------------------------------------------------------------
// AARRR framework metrics
// ---------------------------------------------------------------------------

/** Acquisition rate: new users / total marketing reach */
export function acquisitionRate(newUsers: number, totalMarketingReach: number): number {
  if (totalMarketingReach === 0) return 0
  return newUsers / totalMarketingReach
}

/** Activation rate: activated users / new users */
export function activationRate(activatedUsers: number, newUsers: number): number {
  if (newUsers === 0) return 0
  return activatedUsers / newUsers
}

/** Revenue per user: total revenue / paying users */
export function revenuePerUser(totalRevenue: number, payingUsers: number): number {
  if (payingUsers === 0) return 0
  return totalRevenue / payingUsers
}

/** Referral rate: referrals / total users */
export function referralRate(referrals: number, totalUsers: number): number {
  if (totalUsers === 0) return 0
  return referrals / totalUsers
}

/** Retention rate: retained users / cohort size */
export function retentionRate(retained: number, cohortSize: number): number {
  if (cohortSize === 0) return 0
  return retained / cohortSize
}

// ---------------------------------------------------------------------------
// Channel analytics
// ---------------------------------------------------------------------------

/** Click-through rate: clicks / impressions */
export function channelCtr(metrics: ChannelMetrics): number {
  if (metrics.impressions === 0) return 0
  return metrics.clicks / metrics.impressions
}

/** Conversion rate: conversions / clicks */
export function channelConversionRate(metrics: ChannelMetrics): number {
  if (metrics.clicks === 0) return 0
  return metrics.conversions / metrics.clicks
}

/** Return on ad spend: revenue / spend */
export function channelRoas(metrics: ChannelMetrics): number {
  if (metrics.spend === 0) return 0
  return metrics.revenue / metrics.spend
}

/** Cost per acquisition: spend / conversions */
export function channelCpa(metrics: ChannelMetrics): number {
  if (metrics.conversions === 0) return 0
  return metrics.spend / metrics.conversions
}

/**
 * Rank channels by ROAS descending. Rank 1 = best.
 */
export function channelRankings(
  channels: ChannelMetrics[]
): Array<ChannelMetrics & { rank: number }> {
  const sorted = [...channels].sort((a, b) => channelRoas(b) - channelRoas(a))
  return sorted.map((c, i) => ({ ...c, rank: i + 1 }))
}
