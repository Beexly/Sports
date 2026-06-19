/**
 * User journey and funnel analytics.
 *
 * Pure TypeScript — no npm dependencies. All analytics are descriptive only.
 * No references to guaranteed outcomes, beating bookmakers, or unsupported claims.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JourneyEventType =
  | 'page_view'
  | 'sign_up'
  | 'email_verify'
  | 'subscription_start'
  | 'subscription_cancel'
  | 'pick_view'
  | 'pick_save'
  | 'track_result'
  | 'upgrade_prompt_seen'
  | 'upgrade_clicked'
  | 'upgrade_completed'
  | 'feature_used'
  | 'session_start'
  | 'session_end'

export interface JourneyEvent {
  userId: string
  eventType: JourneyEventType
  timestamp: Date
  properties?: Record<string, string | number | boolean>
  sessionId?: string
}

export interface FunnelStep {
  name: string
  eventType: JourneyEventType
}

export interface FunnelResult {
  steps: Array<{
    name: string
    eventType: JourneyEventType
    users: number
    conversionFromPrev: number   // 0-1; 0 for first step
    conversionFromStart: number  // 0-1
    dropOff: number              // users who left at this step
  }>
  totalUsers: number
  overallConversionRate: number
}

export interface SessionMetrics {
  userId: string
  sessionId: string
  startTime: Date
  endTime: Date | null
  durationMs: number | null
  eventCount: number
  pagesViewed: number
  featuresUsed: string[]
}

export interface UserEngagementScore {
  userId: string
  score: number        // 0-100
  tier: 'cold' | 'warm' | 'engaged' | 'power'
  signals: {
    sessionFrequency: number  // sessions in last 30 days
    featureDepth: number      // unique feature types used
    pickEngagement: number    // pick views + saves
    conversionSignals: number // upgrade prompts clicked
  }
}

export interface RetentionCohort {
  cohortDate: string   // "YYYY-MM" format
  userCount: number
  weeklyRetention: number[]  // [100, 80.5, 62.3, ...] — % retained each week
  day1Retention: number
  day7Retention: number
  day30Retention: number
}

export interface ChurnRiskProfile {
  userId: string
  riskScore: number    // 0-100 (100 = highest risk)
  riskTier: 'low' | 'medium' | 'high' | 'critical'
  signals: string[]    // human-readable risk reasons
  daysSinceLastActivity: number
  recommendedAction: 'monitor' | 'email' | 'offer' | 'escalate'
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000

function userEventsFor(events: JourneyEvent[], userId: string): JourneyEvent[] {
  return events.filter(e => e.userId === userId).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )
}

function distinctUsers(events: JourneyEvent[]): string[] {
  return [...new Set(events.map(e => e.userId))]
}

function isoWeek(date: Date): string {
  // Returns YYYY-WW (ISO week number)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.round(
    ((d.getTime() - week1.getTime()) / MS_PER_DAY - 3 + ((week1.getDay() + 6) % 7)) / 7
  ) + 1
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower] ?? 0
  return (sorted[lower] ?? 0) + (idx - lower) * ((sorted[upper] ?? 0) - (sorted[lower] ?? 0))
}

// ---------------------------------------------------------------------------
// buildFunnel
// ---------------------------------------------------------------------------

export function buildFunnel(
  events: JourneyEvent[],
  steps: FunnelStep[],
  options?: {
    windowDays?: number
    uniqueByUser?: boolean
  }
): FunnelResult {
  const windowDays = options?.windowDays ?? 30
  const windowMs = windowDays * MS_PER_DAY

  if (steps.length === 0) {
    return { steps: [], totalUsers: 0, overallConversionRate: 0 }
  }

  const firstStep = steps[0]!
  const allUsers = distinctUsers(events)

  // Two-pass approach: first collect step-0 users, then validate downstream steps in order
  const firstStepTimeForUser: Record<string, number> = {}
  const stepUserSetsClean: Set<string>[] = steps.map(() => new Set<string>())

  // First pass: collect all users who reached step 0
  for (const userId of allUsers) {
    const userEvents = userEventsFor(events, userId)
    const firstMatch = userEvents.find(e => e.eventType === firstStep.eventType)
    if (firstMatch) {
      stepUserSetsClean[0]!.add(userId)
      firstStepTimeForUser[userId] = firstMatch.timestamp.getTime()
    }
  }

  // Subsequent passes: each step requires the user completed the previous step
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i]
    if (step === undefined) continue
    for (const userId of stepUserSetsClean[i - 1]!) {
      const userEvents = userEventsFor(events, userId)
      // Find the timestamp of the previous step completion for this user
      // (first event that caused inclusion in i-1 set)
      // We need to track when each user completed each step
      // Walk the events in order looking for step[i] after step[i-1]
      const prevStepTime = getPrevStepCompletionTime(userEvents, steps, i - 1, firstStepTimeForUser[userId] ?? 0, windowMs)
      if (prevStepTime === null) continue

      const nextEvent = userEvents.find(e => {
        if (e.eventType !== step.eventType) return false
        if (e.timestamp.getTime() <= prevStepTime!) return false
        if (e.timestamp.getTime() - (firstStepTimeForUser[userId] ?? 0) > windowMs) return false
        return true
      })
      if (nextEvent) {
        stepUserSetsClean[i]!.add(userId)
      }
    }
  }

  const totalUsers = stepUserSetsClean[0]!.size
  const resultSteps = steps.map((step, i) => {
    const users = stepUserSetsClean[i]!.size
    const prevUsers = i > 0 ? stepUserSetsClean[i - 1]!.size : users
    const conversionFromPrev = i === 0 ? 0 : (prevUsers === 0 ? 0 : users / prevUsers)
    const conversionFromStart = totalUsers === 0 ? 0 : users / totalUsers
    const nextUsers = i < steps.length - 1 ? stepUserSetsClean[i + 1]!.size : 0
    const dropOff = users - nextUsers
    return {
      name: step.name,
      eventType: step.eventType,
      users,
      conversionFromPrev,
      conversionFromStart,
      dropOff,
    }
  })

  const lastStepUsers = resultSteps[resultSteps.length - 1]?.users ?? 0
  const overallConversionRate = totalUsers === 0 ? 0 : lastStepUsers / totalUsers

  return { steps: resultSteps, totalUsers, overallConversionRate }
}

function getPrevStepCompletionTime(
  userEvents: JourneyEvent[],
  steps: FunnelStep[],
  targetStep: number,
  firstStepTime: number,
  windowMs: number
): number | null {
  if (targetStep === 0) {
    const match = userEvents.find(e => e.eventType === steps[0]!.eventType)
    return match ? match.timestamp.getTime() : null
  }
  let prevTime = firstStepTime
  for (let i = 1; i <= targetStep; i++) {
    const stepI = steps[i]
    if (stepI === undefined) return null
    const match = userEvents.find(e => {
      if (e.eventType !== stepI.eventType) return false
      if (e.timestamp.getTime() <= prevTime) return false
      if (e.timestamp.getTime() - firstStepTime > windowMs) return false
      return true
    })
    if (!match) return null
    prevTime = match.timestamp.getTime()
  }
  return prevTime
}

// ---------------------------------------------------------------------------
// conversionRate
// ---------------------------------------------------------------------------

export function conversionRate(
  events: JourneyEvent[],
  fromEvent: JourneyEventType,
  toEvent: JourneyEventType,
  windowDays?: number
): number {
  const windowMs = (windowDays ?? 30) * MS_PER_DAY
  const allUsers = distinctUsers(events)

  let fromCount = 0
  let convertedCount = 0

  for (const userId of allUsers) {
    const userEvents = userEventsFor(events, userId)
    const fromEv = userEvents.find(e => e.eventType === fromEvent)
    if (!fromEv) continue
    fromCount++

    const toEv = userEvents.find(e =>
      e.eventType === toEvent &&
      e.timestamp.getTime() > fromEv.timestamp.getTime() &&
      e.timestamp.getTime() - fromEv.timestamp.getTime() <= windowMs
    )
    if (toEv) convertedCount++
  }

  return fromCount === 0 ? 0 : convertedCount / fromCount
}

// ---------------------------------------------------------------------------
// timeToConvert
// ---------------------------------------------------------------------------

export function timeToConvert(
  events: JourneyEvent[],
  fromEvent: JourneyEventType,
  toEvent: JourneyEventType
): { min: number; max: number; median: number; p75: number; p90: number; mean: number } {
  const allUsers = distinctUsers(events)
  const durations: number[] = []

  for (const userId of allUsers) {
    const userEvents = userEventsFor(events, userId)
    const fromEv = userEvents.find(e => e.eventType === fromEvent)
    if (!fromEv) continue

    const toEv = userEvents.find(e =>
      e.eventType === toEvent &&
      e.timestamp.getTime() > fromEv.timestamp.getTime()
    )
    if (!toEv) continue

    const hours = (toEv.timestamp.getTime() - fromEv.timestamp.getTime()) / MS_PER_HOUR
    durations.push(hours)
  }

  if (durations.length === 0) {
    return { min: 0, max: 0, median: 0, p75: 0, p90: 0, mean: 0 }
  }

  const sorted = [...durations].sort((a, b) => a - b)
  const mean = durations.reduce((s, v) => s + v, 0) / durations.length

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    median: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    mean,
  }
}

// ---------------------------------------------------------------------------
// buildSessionMetrics
// ---------------------------------------------------------------------------

const SESSION_GAP_MS = 30 * MS_PER_MINUTE

export function buildSessionMetrics(events: JourneyEvent[], userId: string): SessionMetrics[] {
  const userEvents = userEventsFor(events, userId)
  if (userEvents.length === 0) return []

  // Group by explicit sessionId first, then handle ungrouped
  const withSession = userEvents.filter(e => e.sessionId)
  const withoutSession = userEvents.filter(e => !e.sessionId)

  const sessionMap = new Map<string, JourneyEvent[]>()

  for (const ev of withSession) {
    const sid = ev.sessionId!
    if (!sessionMap.has(sid)) sessionMap.set(sid, [])
    sessionMap.get(sid)!.push(ev)
  }

  // Auto-group ungrouped events by 30-minute gap
  if (withoutSession.length > 0) {
    let autoSessionId = `auto_${userId}_0`
    let sessionIndex = 0
    let lastTime: number | null = null

    for (const ev of withoutSession) {
      const t = ev.timestamp.getTime()
      if (lastTime === null || t - lastTime > SESSION_GAP_MS) {
        sessionIndex++
        autoSessionId = `auto_${userId}_${sessionIndex}`
      }
      if (!sessionMap.has(autoSessionId)) sessionMap.set(autoSessionId, [])
      sessionMap.get(autoSessionId)!.push(ev)
      lastTime = t
    }
  }

  const results: SessionMetrics[] = []

  for (const [sid, sevents] of sessionMap) {
    const sorted = [...sevents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    const startTime = sorted[0]!.timestamp
    const endTime = sorted.length > 1 ? sorted[sorted.length - 1]!.timestamp : null
    const durationMs = endTime ? endTime.getTime() - startTime.getTime() : null

    const pagesViewed = sorted.filter(e => e.eventType === 'page_view').length
    const featuresUsedSet = new Set<string>()
    for (const e of sorted) {
      if (e.eventType === 'feature_used' && e.properties?.featureName) {
        featuresUsedSet.add(String(e.properties.featureName))
      }
    }

    results.push({
      userId,
      sessionId: sid,
      startTime,
      endTime,
      durationMs,
      eventCount: sorted.length,
      pagesViewed,
      featuresUsed: [...featuresUsedSet],
    })
  }

  return results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

// ---------------------------------------------------------------------------
// engagementScore
// ---------------------------------------------------------------------------

export function engagementScore(
  events: JourneyEvent[],
  userId: string,
  referenceDate?: Date
): UserEngagementScore {
  const ref = referenceDate ?? new Date()
  const windowStart = new Date(ref.getTime() - 30 * MS_PER_DAY)

  const userEvents = userEventsFor(events, userId)
  const recentEvents = userEvents.filter(e => e.timestamp >= windowStart && e.timestamp <= ref)

  // sessionFrequency: distinct session IDs (or auto-sessions) in last 30 days
  const sessions = buildSessionMetrics(recentEvents, userId)
  const sessionFrequency = sessions.length

  // featureDepth: distinct features used in last 30 days
  const featuresUsed = new Set<string>()
  for (const e of recentEvents) {
    if (e.eventType === 'feature_used' && e.properties?.featureName) {
      featuresUsed.add(String(e.properties.featureName))
    }
  }
  const featureDepth = featuresUsed.size

  // pickEngagement: pick_view + pick_save in last 30 days
  const pickEngagement = recentEvents.filter(
    e => e.eventType === 'pick_view' || e.eventType === 'pick_save'
  ).length

  // conversionSignals: upgrade_prompt_seen + upgrade_clicked in last 30 days
  const conversionSignals = recentEvents.filter(
    e => e.eventType === 'upgrade_prompt_seen' || e.eventType === 'upgrade_clicked'
  ).length

  // score = (sessionFrequency/30*30 + featureDepth/20*25 + pickEngagement/50*30 + conversionSignals/10*15)
  const sfComponent = Math.min(sessionFrequency, 30) / 30 * 30
  const fdComponent = Math.min(featureDepth, 20) / 20 * 25
  const peComponent = Math.min(pickEngagement, 50) / 50 * 30
  const csComponent = Math.min(conversionSignals, 10) / 10 * 15

  const rawScore = sfComponent + fdComponent + peComponent + csComponent
  const score = Math.max(0, Math.min(100, rawScore))

  let tier: UserEngagementScore['tier']
  if (score <= 25) tier = 'cold'
  else if (score <= 50) tier = 'warm'
  else if (score <= 75) tier = 'engaged'
  else tier = 'power'

  return {
    userId,
    score,
    tier,
    signals: {
      sessionFrequency,
      featureDepth,
      pickEngagement,
      conversionSignals,
    },
  }
}

// ---------------------------------------------------------------------------
// buildRetentionCohort
// ---------------------------------------------------------------------------

export function buildRetentionCohort(
  events: JourneyEvent[],
  cohortEvent: JourneyEventType,
  activityEvent: JourneyEventType,
  cohortMonth: string  // "YYYY-MM"
): RetentionCohort {
  // Find all users who did cohortEvent in the given month
  const [yearStr, monthStr] = cohortMonth.split('-')
  const year = parseInt(yearStr ?? '', 10)
  const month = parseInt(monthStr ?? '', 10) - 1 // 0-indexed
  const cohortStart = new Date(year, month, 1)
  const cohortEnd = new Date(year, month + 1, 1)

  const cohortEntryTimes = new Map<string, Date>()
  for (const ev of events) {
    if (ev.eventType !== cohortEvent) continue
    if (ev.timestamp < cohortStart || ev.timestamp >= cohortEnd) continue
    const existing = cohortEntryTimes.get(ev.userId)
    if (!existing || ev.timestamp < existing) {
      cohortEntryTimes.set(ev.userId, ev.timestamp)
    }
  }

  const cohortUsers = [...cohortEntryTimes.keys()]
  const userCount = cohortUsers.length

  if (userCount === 0) {
    return {
      cohortDate: cohortMonth,
      userCount: 0,
      weeklyRetention: [0, 0, 0, 0, 0],
      day1Retention: 0,
      day7Retention: 0,
      day30Retention: 0,
    }
  }

  // Weekly retention: for each week 0-4, % of cohort who did activityEvent in that week
  const weeklyRetention: number[] = []
  for (let week = 0; week <= 4; week++) {
    let retained = 0
    for (const userId of cohortUsers) {
      const entryTime = cohortEntryTimes.get(userId)!
      const weekStart = new Date(entryTime.getTime() + week * 7 * MS_PER_DAY)
      const weekEnd = new Date(entryTime.getTime() + (week + 1) * 7 * MS_PER_DAY)

      const hasActivity = events.some(e =>
        e.userId === userId &&
        e.eventType === activityEvent &&
        e.timestamp >= weekStart &&
        e.timestamp < weekEnd
      )
      if (hasActivity) retained++
    }
    weeklyRetention.push(userCount === 0 ? 0 : (retained / userCount) * 100)
  }

  // day1 / day7 / day30: % active on that day relative to cohort entry
  function dayRetention(dayOffset: number): number {
    let retained = 0
    for (const userId of cohortUsers) {
      const entryTime = cohortEntryTimes.get(userId)!
      const dayStart = new Date(entryTime.getTime() + dayOffset * MS_PER_DAY)
      const dayEnd = new Date(entryTime.getTime() + (dayOffset + 1) * MS_PER_DAY)
      const hasActivity = events.some(e =>
        e.userId === userId &&
        e.eventType === activityEvent &&
        e.timestamp >= dayStart &&
        e.timestamp < dayEnd
      )
      if (hasActivity) retained++
    }
    return userCount === 0 ? 0 : (retained / userCount) * 100
  }

  return {
    cohortDate: cohortMonth,
    userCount,
    weeklyRetention,
    day1Retention: dayRetention(1),
    day7Retention: dayRetention(7),
    day30Retention: dayRetention(30),
  }
}

// ---------------------------------------------------------------------------
// churnRiskProfile
// ---------------------------------------------------------------------------

export function churnRiskProfile(
  events: JourneyEvent[],
  userId: string,
  referenceDate?: Date
): ChurnRiskProfile {
  const ref = referenceDate ?? new Date()
  const userEvents = userEventsFor(events, userId)

  let daysSinceLastActivity = Infinity
  if (userEvents.length > 0) {
    const lastEvent = userEvents[userEvents.length - 1]!
    daysSinceLastActivity = (ref.getTime() - lastEvent.timestamp.getTime()) / MS_PER_DAY
  }

  const signals: string[] = []
  let riskScore = 0

  // subscription_cancel
  const hasCancelled = userEvents.some(e => e.eventType === 'subscription_cancel')
  if (hasCancelled) {
    signals.push('Cancelled subscription')
    riskScore += 50
  }

  // >14 days inactive
  if (daysSinceLastActivity > 14) {
    signals.push('14+ days without activity')
    riskScore += 30
  }

  // >7 days inactive (additive)
  if (daysSinceLastActivity > 7) {
    signals.push('7+ days without activity')
    riskScore += 20
  }

  // No pick engagement in 14 days
  const cutoff14 = new Date(ref.getTime() - 14 * MS_PER_DAY)
  const hasRecentPickEngagement = userEvents.some(e =>
    (e.eventType === 'pick_view' || e.eventType === 'pick_save') &&
    e.timestamp >= cutoff14
  )
  if (!hasRecentPickEngagement) {
    signals.push('No engagement with picks')
    riskScore += 15
  }

  // Declining session frequency
  const midpoint = new Date(ref.getTime() - 15 * MS_PER_DAY)
  const recentSessions = buildSessionMetrics(
    userEvents.filter(e => e.timestamp >= midpoint && e.timestamp <= ref),
    userId
  ).length
  const olderSessions = buildSessionMetrics(
    userEvents.filter(e => {
      const t = e.timestamp
      return t >= new Date(ref.getTime() - 30 * MS_PER_DAY) && t < midpoint
    }),
    userId
  ).length
  if (recentSessions < olderSessions) {
    signals.push('Decreasing session frequency')
    riskScore += 10
  }

  riskScore = Math.max(0, Math.min(100, riskScore))

  let riskTier: ChurnRiskProfile['riskTier']
  if (riskScore <= 24) riskTier = 'low'
  else if (riskScore <= 49) riskTier = 'medium'
  else if (riskScore <= 74) riskTier = 'high'
  else riskTier = 'critical'

  let recommendedAction: ChurnRiskProfile['recommendedAction']
  if (riskTier === 'low') recommendedAction = 'monitor'
  else if (riskTier === 'medium') recommendedAction = 'email'
  else if (riskTier === 'high') recommendedAction = 'offer'
  else recommendedAction = 'escalate'

  return {
    userId,
    riskScore,
    riskTier,
    signals,
    daysSinceLastActivity: isFinite(daysSinceLastActivity) ? daysSinceLastActivity : 0,
    recommendedAction,
  }
}

// ---------------------------------------------------------------------------
// dropOffAnalysis
// ---------------------------------------------------------------------------

export function dropOffAnalysis(
  events: JourneyEvent[],
  orderedSteps: JourneyEventType[]
): Array<{ step: JourneyEventType; reached: number; droppedHere: number; dropRate: number }> {
  if (orderedSteps.length === 0) return []

  const allUsers = distinctUsers(events)

  // For each step, find users who reached it (in order)
  const reachedSets: Set<string>[] = orderedSteps.map(() => new Set())

  for (const userId of allUsers) {
    const userEvents = userEventsFor(events, userId)
    let lastTime: number | null = null

    for (let i = 0; i < orderedSteps.length; i++) {
      const stepEvent = orderedSteps[i]
      const match = userEvents.find(e => {
        if (e.eventType !== stepEvent) return false
        if (lastTime !== null && e.timestamp.getTime() <= lastTime) return false
        return true
      })
      if (match) {
        reachedSets[i]!.add(userId)
        lastTime = match.timestamp.getTime()
      } else {
        break
      }
    }
  }

  return orderedSteps.map((step, i) => {
    const reached = reachedSets[i]!.size
    const nextReached = i < orderedSteps.length - 1 ? reachedSets[i + 1]!.size : 0
    const droppedHere = reached - nextReached
    const dropRate = reached === 0 ? 0 : droppedHere / reached
    return { step, reached, droppedHere, dropRate }
  })
}

// ---------------------------------------------------------------------------
// commonPaths
// ---------------------------------------------------------------------------

export function commonPaths(
  events: JourneyEvent[],
  maxPathLength?: number,
  topN?: number
): Array<{ path: JourneyEventType[]; count: number; percentage: number }> {
  const maxLen = maxPathLength ?? 5
  const n = topN ?? 10
  const allUsers = distinctUsers(events)

  const pathCounts = new Map<string, number>()

  for (const userId of allUsers) {
    const userEvents = userEventsFor(events, userId)
    const path: JourneyEventType[] = userEvents
      .map(e => e.eventType)
      .slice(0, maxLen)

    if (path.length === 0) continue
    const key = path.join('|')
    pathCounts.set(key, (pathCounts.get(key) ?? 0) + 1)
  }

  const total = allUsers.length || 1
  const sorted = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)

  return sorted.map(([key, count]) => ({
    path: key.split('|') as JourneyEventType[],
    count,
    percentage: count / total,
  }))
}

// ---------------------------------------------------------------------------
// featureAdoptionRate
// ---------------------------------------------------------------------------

export function featureAdoptionRate(
  events: JourneyEvent[],
  featureName: string,
  totalUsers: number
): { adoptionRate: number; userCount: number; avgUsagePerUser: number } {
  const featureEvents = events.filter(
    e => e.eventType === 'feature_used' && e.properties?.featureName === featureName
  )

  const usersWhoUsed = new Set(featureEvents.map(e => e.userId))
  const userCount = usersWhoUsed.size
  const adoptionRate = totalUsers === 0 ? 0 : userCount / totalUsers
  const avgUsagePerUser = userCount === 0 ? 0 : featureEvents.length / userCount

  return { adoptionRate, userCount, avgUsagePerUser }
}

// ---------------------------------------------------------------------------
// abTestConversion
// ---------------------------------------------------------------------------

export function abTestConversion(
  events: JourneyEvent[],
  conversionEvent: JourneyEventType,
  groupProperty: string
): {
  groupA: { users: number; conversions: number; rate: number }
  groupB: { users: number; conversions: number; rate: number }
  relativeLift: number
  significant: boolean
} {
  const groupAUsers = new Set<string>()
  const groupBUsers = new Set<string>()

  for (const ev of events) {
    const group = ev.properties?.[groupProperty]
    if (group === 'A') groupAUsers.add(ev.userId)
    else if (group === 'B') groupBUsers.add(ev.userId)
  }

  const convertedUsers = new Set(
    events.filter(e => e.eventType === conversionEvent).map(e => e.userId)
  )

  const aConversions = [...groupAUsers].filter(u => convertedUsers.has(u)).length
  const bConversions = [...groupBUsers].filter(u => convertedUsers.has(u)).length
  const aUsers = groupAUsers.size
  const bUsers = groupBUsers.size
  const aRate = aUsers === 0 ? 0 : aConversions / aUsers
  const bRate = bUsers === 0 ? 0 : bConversions / bUsers
  const relativeLift = aRate === 0 ? 0 : (bRate - aRate) / aRate

  // Very rough significance: |n_A * r_A - n_B * r_B| > 2 * sqrt(n*r*(1-r))
  const totalN = aUsers + bUsers
  const pooledRate = totalN === 0 ? 0 : (aConversions + bConversions) / totalN
  const threshold = 2 * Math.sqrt(totalN * pooledRate * (1 - pooledRate))
  const observed = Math.abs(aUsers * aRate - bUsers * bRate)
  const significant = observed > threshold

  return {
    groupA: { users: aUsers, conversions: aConversions, rate: aRate },
    groupB: { users: bUsers, conversions: bConversions, rate: bRate },
    relativeLift,
    significant,
  }
}

// ---------------------------------------------------------------------------
// eventTimeSeries
// ---------------------------------------------------------------------------

export function eventTimeSeries(
  events: JourneyEvent[],
  eventType: JourneyEventType,
  granularity: 'day' | 'week' | 'month'
): Array<{ period: string; count: number; uniqueUsers: number }> {
  const filtered = events.filter(e => e.eventType === eventType)

  const periodMap = new Map<string, { count: number; users: Set<string> }>()

  for (const ev of filtered) {
    let period: string
    if (granularity === 'day') period = dayKey(ev.timestamp)
    else if (granularity === 'week') period = isoWeek(ev.timestamp)
    else period = monthKey(ev.timestamp)

    if (!periodMap.has(period)) {
      periodMap.set(period, { count: 0, users: new Set() })
    }
    const entry = periodMap.get(period)!
    entry.count++
    entry.users.add(ev.userId)
  }

  return [...periodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { count, users }]) => ({
      period,
      count,
      uniqueUsers: users.size,
    }))
}

// ---------------------------------------------------------------------------
// userLifecycleStage
// ---------------------------------------------------------------------------

export function userLifecycleStage(
  events: JourneyEvent[],
  userId: string
): 'new' | 'onboarding' | 'active' | 'power' | 'at-risk' | 'churned' {
  const userEvents = userEventsFor(events, userId)
  const now = new Date()

  if (userEvents.length === 0) return 'churned'

  const signUpEvent = userEvents.find(e => e.eventType === 'sign_up')
  const emailVerifyEvent = userEvents.find(e => e.eventType === 'email_verify')
  const subscriptionStartEvent = userEvents.find(e => e.eventType === 'subscription_start')
  const subscriptionCancelEvent = userEvents.find(e => e.eventType === 'subscription_cancel')

  const lastEvent = userEvents[userEvents.length - 1]!
  const daysSinceLastActivity = (now.getTime() - lastEvent.timestamp.getTime()) / MS_PER_DAY

  // churned: subscription_cancel OR no activity in 30+ days
  if (subscriptionCancelEvent || daysSinceLastActivity >= 30) return 'churned'

  // new: signed up in last 7 days, no subscription
  if (signUpEvent && !subscriptionStartEvent) {
    const daysSinceSignUp = (now.getTime() - signUpEvent.timestamp.getTime()) / MS_PER_DAY
    if (daysSinceSignUp <= 7) return 'new'
  }

  // active subscription (no cancel)
  const hasActiveSubscription = subscriptionStartEvent && !subscriptionCancelEvent

  // at-risk: has subscription but daysSinceLastActivity > 7
  if (hasActiveSubscription && daysSinceLastActivity > 7) return 'at-risk'

  // onboarding: signed up >7 days but email_verify or subscription_start not yet done
  // Only applies to users without an active subscription
  if (!hasActiveSubscription && signUpEvent && (!emailVerifyEvent || !subscriptionStartEvent)) {
    const daysSinceSignUp = (now.getTime() - signUpEvent.timestamp.getTime()) / MS_PER_DAY
    if (daysSinceSignUp > 7) return 'onboarding'
  }

  // power: engagementScore >= 70 AND has active subscription
  if (hasActiveSubscription) {
    const score = engagementScore(events, userId)
    if (score.score >= 70) return 'power'
  }

  // active: has subscription_start, no cancel, activity in last 14 days
  if (hasActiveSubscription && daysSinceLastActivity <= 14) return 'active'

  return 'onboarding'
}
